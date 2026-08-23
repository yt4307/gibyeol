# PHP API v1

Base path는 `/api/v1`이다. JSON 응답은 `Content-Type: application/json; charset=utf-8`를 사용한다. 오류 body의 최소 형식은 다음과 같다.

```json
{"error":{"code":"PACKAGE_HASH_MISMATCH","message":"Package digest does not match the URL."}}
```

`code`는 안정적인 machine-readable 값이고 `message`는 변경될 수 있다. 요청 ID를 생성해 `X-Request-Id`로 반환하되 비밀값과 raw 암호 payload는 로그에 남기지 않는다.

## Package

### `PUT /packages/{sha256}`

인증된 SIWE session이 필요하다.

```http
Content-Type: application/vnd.gibyeol.package
Content-Length: 12345
```

서버 처리 순서:

1. path가 정확히 lowercase `[0-9a-f]{64}`인지 검사한다.
2. Content-Type을 검사한다.
3. Content-Length가 없거나 `10,485,760`보다 크면 body를 저장하지 않고 거부한다.
4. 같은 digest 파일이 있으면 기존 파일의 크기/hash가 유효한지 확인하고 `200`을 반환한다.
5. web root 밖의 같은 filesystem 임시 파일에 최대 크기를 강제하며 streaming write한다.
6. write와 동시에 SHA-256을 계산한다.
7. 실제 byte 수, URL digest, `GBYL` magic, version `0x01`, 구조 및 EOF를 검사한다.
8. fsync 가능한 환경에서는 flush 후 digest 경로로 atomic rename한다.

| 결과 | status |
|---|---|
| 새 파일 저장 | `201 Created` |
| 동일 파일 존재 | `200 OK` |
| session 없음 | `401 Unauthorized` |
| 형식/해시 오류 | `400 Bad Request` 또는 `422 Unprocessable Content` |
| 길이 초과 | `413 Content Too Large` |
| 저장소 오류 | `500 Internal Server Error` |

성공 body:

```json
{"sha256":"91a6...f842","size":12345,"created":true}
```

### `GET /packages/{sha256}`

인증 없이 공개한다. body는 저장된 raw GBYL bytes다.

```http
Content-Type: application/vnd.gibyeol.package
Cache-Control: public, max-age=31536000, immutable
ETag: "{sha256}"
X-Content-Type-Options: nosniff
```

없는 digest는 `404`, 일치하는 `If-None-Match`는 `304`다. Range request는 v1 필수가 아니다.

### `HEAD /packages/{sha256}`

GET과 같은 status/header를 body 없이 반환한다. 업로드 전 존재 확인에 사용한다.

## SIWE 인증

### `POST /auth/challenge`

```json
{"walletAddress":"0x...","chainId":84532}
```

서버는 EIP-55 여부와 무관하게 유효한 20-byte 주소인지 검사하고 내부 저장 시 lowercase로 정규화한다. 허용 chain은 환경별로 하나만 둔다. nonce는 CSPRNG로 생성하며 짧은 만료시간과 요청 domain/URI를 가진 EIP-4361 message를 반환한다.

```json
{"message":"...","nonce":"...","expiresAt":"2026-08-23T12:05:00Z"}
```

### `POST /auth/verify`

```json
{"message":"...","signature":"0x..."}
```

서버는 signature, domain, URI, chain ID, nonce, issued-at, expiration을 검증한다. nonce 소비와 session 생성은 하나의 DB transaction에서 처리한다. 성공 시 random session token을 cookie로만 전달하고 DB에는 SHA-256 digest만 저장한다.

```http
Set-Cookie: gibyeol_session=...; Path=/; Secure; HttpOnly; SameSite=Lax
```

### `POST /auth/logout`

현재 session을 폐기하고 cookie를 만료시킨다. 멱등적이다.

## Email verification

### `POST /mailbox/email/challenge`

SIWE session이 필요하다.

```json
{"email":"user@example.com"}
```

서버는 email을 normalize하고 CSPRNG OTP를 만든다. OTP 원문은 저장하지 않고 keyed hash를 저장한다. 응답은 계정 존재 여부를 노출하지 않는 일반 메시지를 사용하며 wallet/email/IP별 rate limit을 적용한다.

### `POST /mailbox/email/verify`

```json
{"code":"123456"}
```

만료, 시도 횟수, session wallet을 검사한다. 성공하면 email을 AES-256-GCM으로 암호화하고 lookup HMAC과 함께 `mailboxes`에 upsert한다.

## Recovery

Recovery endpoint는 `UNLOCK_AT` 이전에 항상 거부한다. SIWE session과 verified email OTP의 최근 성공 증명이 모두 필요하다.

### `POST /recovery/unwrap`

```json
{
  "keyId": 1,
  "recoveryCiphertext": "base64url...",
  "clientPublicKey": "base64url..."
}
```

`recoveryCiphertext`는 브라우저가 on-chain recovery envelope의 tlock 계층을 제거한 결과다. 서버는 recovery private key로 seed를 복구하고 해당 wallet/keyId의 on-chain public key와 일치하는지 확인한 뒤 client ephemeral X25519 key로 sealed box 처리해 반환한다.

```json
{"sealedSeed":"base64url..."}
```

평문 seed 및 recovery private key는 응답, exception, APM, access log에 포함하면 안 된다.

## Resend webhook

### `POST /webhooks/resend`

Raw body에 대해 provider signature와 timestamp를 검증한 뒤 `provider_message_id`로 notification 상태를 갱신한다. 동일 event 재전송은 멱등 처리한다. 서명 실패는 `401`로 거부한다.
