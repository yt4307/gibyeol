# 구현 계획과 단계별 소목표

## 진행 원칙

- 아래 순서를 기본으로 하며 각 단계의 완료 조건을 충족한 뒤 다음 단계로 이동한다.
- protocol wire format, contract ABI, security boundary에 영향을 주는 변경은 ADR과 test vector 없이 확정하지 않는다.
- 라이브러리는 adapter 뒤에 두고 golden vector로 교체 가능성을 보존한다.
- 각 milestone은 실행 명령, 테스트 결과, 배포 URL 또는 tx hash처럼 다시 확인할 수 있는 증거를 남긴다.
- UI 완성도보다 protocol, chain, storage, cross-origin 경계를 먼저 검증한다.

## M0. 배포 경계 확정

작은 목표:

1. GitHub Pages의 production `WEB_ORIGIN`을 정한다.
2. custom domain root와 repository subpath 중 하나를 선택한다.
3. 닷홈 PHP의 `API_ORIGIN`, HTTPS, custom domain 가능 여부를 확인한다.
4. 두 origin이 same-site인지 cross-site인지 기록한다.
5. session cookie/CORS/SIWE domain 정책을 ADR로 확정한다.
6. 닷홈 저장 용량, PHP upload limit, CLI/scheduler 제공 여부를 확인한다.

완료 조건:

- staging/production별 `WEB_ORIGIN`, `API_ORIGIN`, chain ID가 deployment manifest 초안에 있다.
- 인증 방식이 대상 브라우저에서 구현 가능한 구조임을 설명할 수 있다.
- 저장 용량과 scheduler가 요구사항을 충족하지 못한다면 대체 호스트 또는 외부 runner가 결정되어 있다.

## M1. 저장소 품질 기준선

작은 목표:

1. frontend lint/typecheck/build를 한 명령 묶음으로 실행한다.
2. protocol, backend, contract의 빈 test suite가 CI에서 실행되게 한다.
3. dependency lockfile과 secret scan 정책을 적용한다.
4. pull request와 default branch의 필수 check를 정한다.

완료 조건:

- clean checkout에서 CI가 재현된다.
- 실패한 lint/typecheck/test/build가 merge를 막는다.

## M2. GitHub Pages 정적 셸

작은 목표:

1. Next.js `output: export` 결과를 생성한다.
2. 선택한 URL 구조에 맞게 `basePath`를 build-time 값으로 적용한다.
3. GitHub Actions가 `frontend/out`을 Pages artifact로 배포하게 한다.
4. custom domain 사용 시 Pages 설정, DNS, HTTPS 강제를 완료한다.
5. 직접 URL 접근, 새로고침, 정적 asset, hydration, 404를 확인한다.
6. legacy 닷홈 frontend 패키징 script/profile을 제거한다.

완료 조건:

- production 또는 staging Pages URL에서 화면과 hydration이 정상이다.
- `/_next` 또는 subpath asset 요청에 404와 mixed content가 없다.
- 수동 재배포와 직전 정상 artifact로의 복구 절차가 문서화되어 있다.

## M3. Cross-origin API 스파이크

작은 목표:

1. PHP health endpoint를 실제 `API_ORIGIN`에 배포한다.
2. Pages에서 health GET을 호출한다.
3. OPTIONS와 credentialed CORS를 검증한다.
4. SIWE challenge/verify 후 session cookie를 발급하고 인증 GET/POST를 호출한다.
5. 허용되지 않은 Origin, wildcard+credentials, 재사용 nonce를 거부한다.
6. Chrome, Safari, 모바일 대상 브라우저에서 session 유지 여부를 확인한다.

완료 조건:

- 실제 Pages → 실제 API 경로에서 로그인과 인증 요청이 성공한다.
- 브라우저별 결과와 최종 cookie/CORS 정책이 ADR에 기록되어 있다.
- 실패한 브라우저가 있다면 production 지원 범위 또는 대체 인증 방식이 결정되어 있다.

## M4. Protocol byte foundation

작은 목표:

1. strict byte reader/writer와 bounds check를 만든다.
2. LetterContext와 AAD canonical encoder를 만든다.
3. HKDF-SHA256과 AES-256-GCM adapter를 만든다.
4. deterministic random/IV 주입이 가능한 test fixture를 만든다.
5. TypeScript와 PHP가 공유할 golden vector 형식을 정한다.

완료 조건:

- endian, 길이 경계, context/AAD vector가 두 runtime에서 동일하다.

## M5. GTX1과 GBYL

작은 목표:

1. GTX1 encode/decode와 gzip 선택 정책을 구현한다.
2. GBYL pack/parse/hash와 media codec mapping을 구현한다.
3. 0-item 8-byte archive를 구현한다.
4. tamper, trailing bytes, unknown flags/codec, 10 MiB 경계를 테스트한다.

완료 조건:

- [verification-plan.md](verification-plan.md)의 GTX1/GBYL 테스트가 통과한다.
- golden fixture가 동일 bytes와 SHA-256을 만든다.

## M6. Mailbox와 time lock

작은 목표:

1. X25519 seed derivation과 sealed box adapter를 만든다.
2. GPK1 Passkey PRF wrap/unwrap을 구현한다.
3. recovery envelope와 client ephemeral re-wrap fixture를 만든다.
4. 실제 quicknet으로 tlock adapter PoC를 수행한다.
5. 통과한 tlock-js/drand-client 정확한 버전을 pin한다.
6. Passkey PRF와 media codec의 실제 기기 표를 작성한다.

완료 조건:

- round 전 실패와 round 후 성공을 재현한다.
- recovered seed에서 파생한 public key가 fixture와 일치한다.
- protocol-sensitive dependency가 범위 버전이나 `latest`가 아니다.

## M7. Gibyeol2026 contract

작은 목표:

1. immutable constructor, mailbox mapping, letter mapping을 구현한다.
2. register/rotation/stale key/duplicate letter 검증을 구현한다.
3. event와 calldata 복구 테스트를 만든다.
4. custom error, 길이 제한, fuzz, ABI snapshot을 추가한다.
5. deploy script에 chain, quicknet hash, recovery key, unlock round gate를 넣는다.

완료 조건:

- local unit/fuzz/ABI snapshot이 통과한다.
- 동일 `letterId` 재시도와 key rotation race가 명세대로 동작한다.

## M8. Base Sepolia 1분 E2E

작은 목표:

1. staging recovery key와 Sepolia contract를 배포한다.
2. mailbox를 등록한다.
3. GTX1과 작은 GBYL을 만들고 package를 업로드한다.
4. 약 1분 뒤 round로 Letter Key를 tlock하고 편지를 봉인한다.
5. event → tx input → tlock → X25519 → GTX1/GBYL 전체 복구를 실행한다.

완료 조건:

- round 전 실패와 round 후 원문 복구가 모두 확인된다.
- chain ID, contract, tx hash, letterId, drand round, dependency commit을 evidence로 남긴다.

## M9. PHP package와 인증

작은 목표:

1. PUT/GET/HEAD streaming package storage를 구현한다.
2. hash, magic, EOF, 10 MiB, atomic publish를 검증한다.
3. SIWE nonce/session/logout과 CORS를 구현한다.
4. MySQL migration과 cleanup을 구현한다.
5. 실제 Pages origin을 사용하는 API integration test를 추가한다.

완료 조건:

- upload/session 멱등성, replay, cross-origin, empty DB migration 테스트가 통과한다.

## M10. Mailbox·이메일·복구 backend

작은 목표:

1. email OTP, normalization, encryption/HMAC을 구현한다.
2. Resend adapter와 signed webhook을 구현한다.
3. unlock 전 거부되는 recovery endpoint를 구현한다.
4. SIWE+최근 OTP와 on-chain public key 일치를 검증한다.
5. secret/log redaction과 rate limit을 적용한다.

완료 조건:

- email/recovery/webhook integration test가 통과하고 평문 seed·OTP·email이 로그에 남지 않는다.

## M11. 발송 UI

작은 목표:

1. wallet/SIWE와 mailbox/passkey onboarding을 만든다.
2. recipient key 조회와 작성/packing 흐름을 만든다.
3. package upload와 `sealLetter` 전송을 연결한다.
4. draft, 새로고침, timeout, 동일 letterId 복구를 구현한다.
5. key rotation 시 media 재처리 없이 re-wrap한다.

완료 조건:

- `DRAFT`부터 `SEALED`까지 사용자 상태가 내부 상태와 일치한다.
- timeout과 stale key 시나리오에서 중복 편지가 생기지 않는다.

## M12. 받은 편지·개봉·복구 UI

작은 목표:

1. recipient log와 transaction calldata를 직접 조회한다.
2. 개봉 전 상태와 도착 상태를 표시한다.
3. Passkey 기반 tlock/X25519/GTX1/GBYL 복호화를 연결한다.
4. package SHA-256을 복호화 전에 검증한다.
5. Passkey 분실 recovery 흐름을 연결한다.

완료 조건:

- 정상, 변조, wrong key, Passkey 분실 시나리오가 staging E2E를 통과한다.

## M13. 운영 job과 production rehearsal

작은 목표:

1. orphan GC를 dry-run/report-first로 구현한다.
2. safe block range 기반 recipient aggregation을 구현한다.
3. Postman claim, Resend idempotency, retry/webhook을 구현한다.
4. scheduler와 manual rerun 절차를 실제 운영 환경에서 실행한다.
5. backup/restore, RPC failover, disk alert를 rehearsal한다.

완료 조건:

- 반복 실행해도 정상 package 삭제와 중복 이메일이 없다.
- 운영자가 runbook만 보고 job 복구와 재실행을 할 수 있다.

## M14. Production release gate

작은 목표:

1. Base Mainnet constructor 값과 unlock round 경계를 두 사람이 확인한다.
2. source/ABI/compiler 설정을 explorer에서 verify한다.
3. production Pages build 환경값과 contract address를 고정한다.
4. 실제 production origin에서 mailbox와 test letter smoke를 수행한다.
5. 브라우저 호환성, 보안, 개인정보, 장애 대응 checklist를 승인한다.

완료 조건:

- `timeForRound(UNLOCK_ROUND) >= 1798124400`이고 이전 round는 더 이르다.
- deployment manifest, runbook, backup, monitoring owner가 모두 확정되어 있다.
- 미해결 Freeze 항목이 없고 release 승인 기록이 남아 있다.

## 변경 관리

Freeze 후 protocol-breaking 변경은 ADR과 version bump 없이 merge하지 않는다. contract ABI, event signature, magic/version, HKDF info, AAD encoding, hash 알고리즘은 CI snapshot으로 보호한다. 라이브러리 업데이트는 기존 golden vector 및 실제 quicknet smoke test를 다시 통과해야 한다.
