# 검증 계획

UI 구현보다 protocol conformance와 end-to-end PoC를 먼저 통과시킨다. 테스트 fixture는 random 의존성을 주입해 deterministic하게 만들고, 최소 하나의 golden vector를 hex 파일로 저장해 TypeScript/PHP 구현 간 교차 검증한다.

## Protocol unit tests

### GTX1

- 빈 문자열, ASCII, 한글/emoji, gzip이 이득인 큰 문장을 round-trip한다.
- gzip 결과가 더 크거나 같은 입력은 비압축 flag를 사용한다.
- magic, reserved flag, original length, IV, ciphertext, tag를 각각 변조하면 실패한다.
- wrong LetterContext, chain, contract, sender, recipient, letterId로 복호화하면 실패한다.
- 경계값과 `encryptedText` contract limit를 검증한다.

### GBYL

- 0개, 단일 image, image+timelapse, 여러 codec archive를 pack/parse/decrypt한다.
- item index별 HKDF/AAD가 달라지는지 검증한다.
- header/item flag, type, codec, count, length, trailing bytes 오류를 거부한다.
- archive 1 byte 변경 시 SHA-256 검증이 실패한다.
- ciphertext/tag/IV 변경 및 item 순서 교체 시 GCM 인증이 실패한다.
- 정확히 `10,485,760` bytes는 허용하고 1 byte 초과는 client/server 모두 거부한다.

### Mailbox와 wrapping

- Passkey PRF fixture → KEK → seed wrap/unwrap을 검증한다.
- wrong PRF, salt, credential envelope 변조가 실패한다.
- seed에서 파생한 public key가 expected/on-chain public key와 일치한다.
- recipient sealed box는 wrong key로 열리지 않는다.
- recovery sealed box와 client ephemeral re-wrap을 round-trip한다.

### tlock

- local/short-round test 환경에서 round 전 decrypt 실패, round 후 성공을 검증한다.
- quicknet chain hash가 다른 envelope/client 조합을 거부한다.
- 실제 quicknet endpoint에서 pinned dependency PoC와 golden vector를 만든다.
- target round와 이전 round의 시간이 개봉 Unix time 경계를 만족하는지 배포 테스트한다.

## Contract tests

- 첫 mailbox key ID는 1이고 rotation마다 증가하며 옛 key가 남는다.
- zero public key 정책을 검증한다(등록 거부 권고).
- event topic/index와 calldata decode가 원 입력을 재구성한다.
- 같은 `letterId`의 두 번째 `sealLetter`는 거부된다.
- zero recipient, unknown/stale key ID, oversized text/sealed key를 거부한다.
- key rotation 후 기존 tx는 revert하고 새 key wrapping tx는 동일 letterId로 성공한다.
- fuzz test로 mapping invariants와 길이 경계를 검증한다.
- ABI와 event signature snapshot을 CI에서 비교한다.

## PHP/API tests

- PUT streaming upload, hash/magic/version/length 검증 및 atomic publish를 테스트한다.
- 동일 hash 재업로드가 하나의 파일만 남기고 `200`을 반환한다.
- GET/HEAD, ETag/304, cache headers, 없는 digest를 검증한다.
- SIWE 공식 vector, wrong domain/chain/nonce, expired/replayed nonce를 검증한다.
- session cookie 속성, DB token hashing, logout을 검증한다.
- email normalization/HMAC/encryption, OTP expiry/attempt/rate limit을 검증한다.
- recovery는 개봉 전 거부되고 개봉 후 SIWE+OTP 없이는 거부된다.
- webhook signature와 duplicate event 멱등성을 검증한다.

## GitHub Pages와 cross-origin tests

- 선택한 root/subpath에서 HTML, `_next` asset, public asset, 직접 route 접근과 새로고침을 검증한다.
- Pages artifact가 PHP, server secret, private source map을 포함하지 않는지 검사한다.
- 실제 `WEB_ORIGIN`에서 API GET/HEAD/PUT/POST와 OPTIONS preflight를 검증한다.
- credentialed response가 wildcard origin을 사용하지 않는지 검사한다.
- 잘못된 Origin과 `Origin: null`의 state-changing request를 거부한다.
- SIWE domain/URI가 API host가 아닌 배포 manifest의 `WEB_ORIGIN`과 일치하는지 검사한다.
- session 발급과 후속 인증 요청을 Chrome, Safari, 지원 모바일 브라우저에서 검증한다.
- custom domain, certificate, HTTPS redirect, mixed content를 배포 smoke test에 포함한다.

## 운영 job tests

- 71:59 package는 삭제하지 않고 72시간 이후 미참조 package만 삭제한다.
- 접수된 package는 나이와 무관하게 삭제하지 않는다.
- RPC 오류, partial logs, reorg safety 미충족 시 GC를 중단한다.
- Postman retry/timeout/concurrent worker에서도 wallet당 메일이 한 번만 발송된다.
- recipient별 `letter_count` 집계와 Resend idempotency key가 결정적이다.

## 첫 E2E milestone

Base Sepolia에서 다음을 자동 또는 재현 가능한 스크립트로 수행한다.

1. mailbox를 등록한다.
2. 텍스트를 GTX1으로 암호화하고 작은 GBYL을 업로드한다.
3. 약 1분 뒤 round로 Letter Key를 tlock한다.
4. `sealLetter`를 보내고 event → transaction input 경로로 데이터를 다시 읽는다.
5. round 전 실패와 round 후 원문/미디어 복구를 확인한다.
6. package hash와 mailbox public key를 온체인 값과 비교한다.

합격 증거로 chain ID, contract address, tx hash, letterId, drand chain hash/round, dependency lockfile commit, 테스트 출력 digest를 기록한다. plaintext나 private key는 증거에 포함하지 않는다.

## CI quality gates

- protocol unit/fuzz/golden vector tests
- Solidity unit/fuzz + ABI snapshot
- PHP unit/integration + migrations from empty DB
- lint/typecheck/static analysis
- dependency lockfile 변경 review
- secret scan
- build artifacts 재생성 가능성 검사
- GitHub Pages build/deploy와 Pages → API cross-origin smoke
