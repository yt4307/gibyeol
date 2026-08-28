# 시스템 아키텍처

## 책임 경계

| 구성요소 | 책임 | Source of Truth 여부 |
|---|---|---|
| Base | mailbox registry, 편지 접수, 발신/수신 index, 암호문과 package hash | 편지의 Source of Truth |
| Static web | wallet/passkey, 압축, 암복호화, package 조립, 직접 chain 조회 | 클라이언트 실행 환경 |
| PHP/Apache | package 저장, SIWE session, email/OTP, recovery, postman | 운영 데이터만 |
| MySQL | 이메일, nonce/session, 인증 및 발송 상태 | 온체인 편지를 복제하지 않음 |
| drand quicknet | Christmas time-lock | 공개 randomness/time gate |
| Resend | 인증 및 도착 안내 메일 | 전송 provider |

Web은 GitHub Pages에 배포하는 static export Next.js 애플리케이션이다. PHP/API는 Pages와 합쳐서 배포하지 않으며 별도 HTTPS origin에서 제공한다. Base RPC URL은 build 환경변수로 주입하고 production에서 공식 rate-limited public RPC에 의존하지 않는다.

## 배포 토폴로지와 origin

```text
GitHub Pages (WEB_ORIGIN)
  ├─ static HTML/CSS/JS
  ├─ Base RPC 직접 조회
  ├─ drand 직접 조회
  └─ HTTPS + CORS ─────────────┐
                               ▼
                         PHP API (API_ORIGIN)
                           ├─ MySQL
                           ├─ GBYL storage
                           └─ Resend
```

`WEB_ORIGIN`과 `API_ORIGIN`은 서로 다른 origin임을 기본값으로 본다. CORS, Origin 검증, SIWE domain/URI, session cookie는 두 값을 하나의 배포 manifest에서 파생해야 한다. Production에서는 가능하면 두 origin을 같은 registrable domain의 HTTPS subdomain으로 구성한다. 불가능하면 cross-site cookie가 실제 지원 브라우저에서 동작하는지 검증하거나 session 전달 방식을 별도 ADR로 확정하기 전까지 production 배포를 진행하지 않는다.

## 저장소 목표 구조

```text
gibyeol/
├─ frontend/             Next.js static export
├─ backend/              Symfony 7.4 LTS API/CLI
├─ contracts/
│  ├─ src/Gibyeol2026.sol
│  ├─ test/
│  └─ script/
├─ packages/protocol/    UI 독립 protocol 구현
├─ infra/docker/         container configuration
└─ docs/
```

프론트엔드와 protocol package는 루트 pnpm workspace로 연결한다. 백엔드는 Composer, 컨트랙트는 Foundry의 dependency/lock 체계를 독립적으로 사용한다. PHP web root는 반드시 `backend/public`만 노출한다.

프론트엔드의 역할은 다음과 같이 분리한다.

- Emotion `styled`: UI styling과 theme token
- Zustand: 작성 중 draft, wallet/UI flow 등 client-local state
- TanStack Query: Base RPC 및 PHP API의 server/remote state와 cache

온체인 transaction 상태와 remote 조회 결과를 Zustand에 중복 저장하지 않는다. TanStack Query cache가 remote state의 기준이고 Zustand는 로컬 UI 상태만 담당한다.

## 발송 시퀀스

1. Wallet을 연결하고 recipient의 `currentKeyId`와 public key를 Base에서 읽는다.
2. random `letterId`와 `LetterKey`를 만든다.
3. 사진은 최대 변 2,048px로 축소해 WebP 우선 변환하고, WebM/MP4/MOV 원본 영상은 WebCodecs+Mediabunny를 우선 사용해 8배속·최대 1,280px 무음 WebM 타임랩스로 변환한다. 입력 decode 또는 VP8 encode가 지원되지 않거나 실행에 실패하면 싱글스레드 ffmpeg.wasm으로 재시도한 뒤 media를 GBYL로 만든다.
4. 최종 GBYL SHA-256을 계산해 PHP에 PUT한다.
5. LetterKey를 recipient public key로 wrap한 뒤 tlock한다.
6. `sealLetter` 트랜잭션을 전송한다.
7. 성공/불명확 상태 모두 `letterId`로 온체인 상태를 재확인한다.

Key rotation으로 transaction이 revert되면 텍스트, GBYL, LetterKey를 보존하고 최신 public key로 wrapping+tlock만 다시 수행한다.

## 개봉 시퀀스

1. recipient indexed `LetterSealed` logs를 읽는다.
2. 각 transaction input에서 GTX1, sealedKey, hash를 decode한다.
3. tlock을 열고 mailbox private key로 LetterKey를 unwrap한다.
4. GTX1을 인증·복호화·압축 해제한다.
5. GBYL을 내려받아 SHA-256을 먼저 검증한 후 item을 인증·복호화한다.
6. 복구된 mailbox seed의 public key가 해당 on-chain key ID와 일치해야만 계속한다.

## Postman 시퀀스

`christmas-2026` job은 KST 2026-12-25 00:00 이후 실행한다. 확정성 정책에 따라 안전한 block range에서 `LetterSealed`를 조회하고 recipient별 count를 집계한다. verified email로 Resend를 호출하며 idempotency key는 `gibyeol/christmas-2026/{lowercase wallet}`이다. webhook으로 delivered/bounced/failed 상태를 갱신한다.

## 클라이언트 상태

| 내부 상태 | 사용자 표시 |
|---|---|
| `DRAFT` | 작성 중 |
| `PACKING` | 소포 꾸리는 중 |
| `UPLOADING_PACKAGE` | 소포 맡기는 중 |
| `ENCRYPTING_KEY` | 편지 봉인 중 |
| `WAITING_TRANSACTION` | 우표 붙이는 중 |
| `SEALED` | 접수 완료 |
| `IN_TRANSIT` | 배송 중 |
| `ARRIVED` | 도착 |
| `OPENED` | 개봉 |
