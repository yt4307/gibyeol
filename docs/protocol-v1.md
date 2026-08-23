# 기별 프로토콜 v1

상태: **Freeze Candidate**
프로토콜 버전: `1`

## 1. 고정 파라미터

| 항목 | v1 값 |
|---|---|
| Production chain | Base Mainnet (`8453`) |
| Staging chain | Base Sepolia (`84532`) |
| Production drand | League of Entropy quicknet |
| quicknet chain hash | `52db9ba70e0cc0f6eaf7803dd07447a1f5477735fd3f661792ba94600c84e971` |
| 개봉 시각 | 2026-12-25 00:00:00 KST |
| 개봉 Unix time | `1798124400` (2026-12-24 15:00:00 UTC) |
| 콘텐츠 암호화 | AES-256-GCM, 12-byte random IV, 16-byte tag |
| 키 파생 | HKDF-SHA256 |
| Mailbox key | X25519 |
| 수신자 wrapping | libsodium sealed box 호환 방식 |
| Time lock | drand tlock |
| archive magic/version | `GBYL`, `0x01` |
| text magic | `GTX1` |
| archive limit | `10,485,760` bytes (최종 파일 전체) |
| archive digest | SHA-256 |
| ZK | v1 범위 밖 |

모든 정수는 별도 표기가 없으면 unsigned **big-endian**이다. 문자열 리터럴은 ASCII, 사용자 텍스트는 UTF-8이다. 주소는 `0x`를 제외한 EVM 20바이트, `bytes32`는 32바이트 원문을 사용한다. hex 문자열은 전송/UI 표현일 뿐 암호 입력에 문자열 그대로 넣지 않는다.

## 2. Solidity 계약

컨트랙트 이름은 `Gibyeol2026`이며 프록시를 사용하지 않는다.

```solidity
contract Gibyeol2026 {
    uint8 public constant PROTOCOL_VERSION = 1;
    uint64 public immutable UNLOCK_AT;
    uint64 public immutable UNLOCK_ROUND;
    bytes32 public immutable DRAND_CHAIN_HASH;
    bytes32 public immutable RECOVERY_PUBLIC_KEY;

    mapping(address => uint32) public currentKeyId;
    mapping(address => mapping(uint32 => bytes32)) public mailboxPublicKeys;
    mapping(bytes32 => bool) public sealedLetters;

    function registerMailboxKey(
        bytes32 publicKey,
        bytes calldata passkeyEnvelope,
        bytes calldata recoveryEnvelope
    ) external;

    function sealLetter(
        bytes32 letterId,
        address recipient,
        uint32 recipientKeyId,
        bytes calldata encryptedText,
        bytes calldata sealedKey,
        bytes32 archiveSha256
    ) external;
}
```

새 mailbox key의 ID는 1부터 단조 증가한다. 과거 key와 envelope가 포함된 트랜잭션 calldata는 삭제하거나 덮어쓰지 않는다.

`sealLetter`는 다음을 검증해야 한다.

- `recipient != address(0)`
- `sealedLetters[letterId] == false`
- `currentKeyId[recipient] == recipientKeyId`
- `mailboxPublicKeys[recipient][recipientKeyId] != bytes32(0)`
- `encryptedText.length <= 65,536`
- `sealedKey.length <= 4,096`

성공 시 `sealedLetters[letterId] = true`로 설정한다. 동일 `letterId` 재사용은 반드시 실패한다.

```solidity
event MailboxKeyRegistered(
    address indexed owner,
    uint32 indexed keyId,
    bytes32 publicKey
);

event LetterSealed(
    bytes32 indexed letterId,
    address indexed sender,
    address indexed recipient,
    uint32 recipientKeyId,
    bytes32 archiveSha256
);
```

Envelope, 암호문, sealed key는 event에 복제하지 않는다. 클라이언트는 event의 transaction hash로 원 트랜잭션을 조회하고 ABI로 input을 decode한다.

## 3. 식별자와 멱등성

`letterId`는 브라우저 CSPRNG로 생성한 32 random bytes다. 재시도에는 같은 값을 사용한다. 트랜잭션 결과가 불명확하면 먼저 `sealedLetters(letterId)`와 `LetterSealed` log를 확인한다. 이미 봉인되었다면 기존 접수를 성공으로 복구한다.

## 4. Letter Key와 subkey

편지마다 32-byte random `LetterKey`를 하나 만든다. HKDF의 입력 키 재료는 `LetterKey`, hash는 SHA-256, 출력은 32바이트다. v1 HKDF salt는 32개의 zero byte로 고정한다.

| 용도 | HKDF info (ASCII) |
|---|---|
| 텍스트 | `GIBYEOL/TEXT/V1` |
| 미디어 N | `GIBYEOL/MEDIA/V1/` 뒤에 `N`의 uint16 big-endian 2바이트 |

표의 `/` 뒤에 십진 문자열을 붙이지 않는다. 미디어 index는 archive 내 0부터 시작한다.

## 5. Letter context와 AAD

`LetterContextV1`은 구분자 없는 다음 바이트 연결이다.

```text
ASCII("GIBYEOL:LETTER:V1")
|| uint256_be(chainId)          // 32 bytes
|| contractAddress             // 20 bytes
|| letterId                    // 32 bytes
|| sender                      // 20 bytes
|| recipient                   // 20 bytes
```

텍스트 AAD:

```text
LetterContextV1 || ASCII("TEXT")
```

미디어 N AAD:

```text
LetterContextV1 || ASCII("MEDIA") || uint16_be(N)
```

`recipientKeyId`는 AAD에 포함하지 않는다. key rotation race 때 Letter Key만 다시 wrapping할 수 있어야 하기 때문이다.

## 6. GTX1

처리 순서는 UTF-8 encode → gzip 시도 → 원문과 gzip 중 짧은 쪽 선택 → Text Key로 AES-256-GCM이다. 길이가 같으면 비압축을 선택한다.

```text
offset  size  field
0       4     ASCII "GTX1"
4       1     flags
5       4     originalUtf8Length (uint32 big-endian)
9       12    random AES-GCM IV
21      N     ciphertext || 16-byte GCM tag
```

- flags bit 0: `0` none, `1` gzip
- flags bit 1~7: v1에서는 반드시 0이며 parser는 0이 아니면 거부한다.
- `originalUtf8Length`는 압축 전 UTF-8 bytes 길이다.
- 복호화·압축 해제 후 길이가 해당 값과 다르면 거부한다.
- gzip은 RFC 1952 형식이며 재현 가능한 해시가 필요하지 않으므로 gzip header timestamp는 프로토콜 의미를 갖지 않는다.

## 7. GBYL archive

```text
GBYL header
offset  size  field
0       4     ASCII "GBYL"
4       1     version = 0x01
5       1     flags = 0x00
6       2     itemCount (uint16 big-endian)

item (itemCount회 반복)
0       1     type
1       1     codec
2       2     flags = 0x0000
4       12    random AES-GCM IV
16      4     ciphertextLen (uint32 big-endian)
20      N     ciphertext || 16-byte GCM tag
```

Media type:

| 값 | 의미 |
|---|---|
| `0x01` | IMAGE |
| `0x02` | TIMELAPSE |

Codec:

| 값 | 의미 |
|---|---|
| `0x01` | WEBP |
| `0x02` | JPEG |
| `0x10` | WEBM |
| `0x11` | MP4 |

각 item N은 Media Key N과 Media AAD N으로 암호화한다. `ciphertextLen`에는 16-byte tag가 포함된다. v1 parser는 알 수 없는 header/item flag, type, codec, trailing bytes, 범위를 벗어난 길이를 거부해야 한다.

최종 archive 전체의 SHA-256이 `archiveSha256`이다. 파일명은 `{64자리 lowercase hex}.gbyl`이다. media가 없는 편지는 `itemCount = 0`인 8-byte archive를 사용할 수 있으며, 이것도 업로드하고 해시를 온체인에 기록한다.

## 8. 수신자 key wrapping

```text
LetterKey
  -> recipient X25519 public key로 libsodium sealed box
  -> RecipientWrappedLetterKey
  -> quicknet UNLOCK_ROUND로 tlock encrypt
  -> sealedKey
```

크리스마스 전에는 tlock을 열 수 없어야 하고, 이후에도 해당 mailbox private key 없이는 Letter Key를 얻을 수 없어야 한다. wire encoding은 선정한 라이브러리의 검증된 출력으로 고정하고 golden vector를 저장한다.

## 9. Passkey envelope

Mailbox Seed는 CSPRNG로 만든 32바이트다. X25519 keypair는 이 seed로 결정적으로 파생한다. Passkey는 seed의 생성원이 아니라 저장 wrapper다.

PRF output을 입력 키 재료로 HKDF-SHA256을 수행한다. salt는 envelope의 32-byte random `prfSalt`, info는 ASCII `GIBYEOL/PASSKEY-KEK/V1`, 출력은 32-byte KEK다. Seed 암호화의 AAD는 magic부터 IV 직전까지의 envelope prefix다.

```text
magic             4 bytes   ASCII "GPK1"
credentialIdLen   2 bytes   uint16 big-endian
credentialId      variable
prfSalt           32 bytes
iv                12 bytes
wrappedSeed       48 bytes  ciphertext(32) || tag(16)
```

registration 결과에 PRF output이 없으면 authentication assertion으로 다시 요청한다. PRF 미지원 authenticator에는 mailbox 등록을 완료한 것으로 표시하지 않는다.

## 10. Recovery envelope

```text
MailboxSeed
  -> RECOVERY_PUBLIC_KEY로 sealed box
  -> recovery ciphertext
  -> quicknet UNLOCK_ROUND로 tlock encrypt
  -> recoveryEnvelope
```

`recoveryEnvelope`는 `registerMailboxKey` calldata에만 영구 저장하며 서버 DB에 복제하지 않는다. wire encoding은 tlock adapter golden vector로 고정한다.

복구 시 Wallet SIWE와 verified email OTP가 모두 필요하다. 브라우저가 tlock을 연 ciphertext와 일회용 X25519 public key를 서버로 보내면, 서버는 recovery private key로 seed를 메모리에서 복구하고 즉시 client public key로 sealed box 처리해 반환한다. 평문 seed를 응답하거나 로그에 남기면 안 된다.

## 11. UNLOCK_ROUND 조건

배포 스크립트는 target 이후 최초 round를 선택해야 한다.

```text
timeForRound(UNLOCK_ROUND) >= 1798124400
timeForRound(UNLOCK_ROUND - 1) < 1798124400
```

`roundForTime()` 결과를 검증 없이 사용하면 안 된다. Production에서는 quicknet chain hash와 endpoint를 명시하며 라이브러리 default chain을 사용하지 않는다.

## 12. 호환성과 변경 정책

다음 변경은 v1을 깨므로 새 protocol version/magic 또는 새 컨트랙트가 필요하다.

- chain/contract를 제외한 고정 암호 primitive 또는 암호화 순서 변경
- 직렬화 순서, 정수 크기/endianness, AAD/HKDF info 변경
- Solidity 함수 selector 또는 event signature 변경
- GTX1/GBYL 구조 또는 SHA-256 의미 변경

RPC provider, PHP/JS 라이브러리, UI, 저장소 경로, 이메일 template 변경은 동일한 동작과 wire format을 유지하면 호환 변경이다.
