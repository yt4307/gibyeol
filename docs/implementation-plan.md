# 구현 계획

## 원칙

각 단계는 다음 단계가 기대는 안정된 경계를 만든다. UI는 protocol과 chain/storage PoC가 성공한 뒤 시작한다. 라이브러리는 adapter 뒤에 두고 wire format golden vector를 기준으로 교체 가능하게 한다.

## 1. Protocol package

목표 경로: `packages/protocol`

- byte reader/writer, strict bounds checking
- LetterContext/AAD canonical encoder
- HKDF, AES-GCM adapter
- GTX1 encode/decode
- GBYL pack/parse/hash
- X25519/sealed box mailbox adapter
- Passkey envelope parser/wrapper
- tlock adapter와 dependency pin
- browser/Node test fixtures와 golden vectors

완료 조건: `verification-plan.md`의 protocol unit tests가 통과하고 같은 fixture가 서로 다른 runtime에서 동일 bytes/hash를 만든다.

## 2. Solidity

목표 경로: `contracts`

- immutable constructor와 mailbox/letter mappings
- custom errors, events, length/zero validation
- deploy script에서 chain ID, quicknet hash, recovery public key, unlock round 검증
- unit/fuzz/ABI snapshot tests

완료 조건: stale key/duplicate ID 시나리오와 calldata recovery가 local chain에서 통과한다.

## 3. Base Sepolia + tlock E2E PoC

- staging recovery key 생성
- 실제 quicknet dependency 조합 검증 및 pin
- Sepolia deploy
- 1분 후 열리는 암호 편지를 한 통 봉인
- event → tx input → tlock → X25519 → GTX1/GBYL 전체 복구

완료 조건: 재현 스크립트와 비밀을 제외한 evidence가 저장되고 round 전/후 테스트가 모두 통과한다. 실패하면 UI 개발로 넘어가지 않는다.

## 4. PHP storage/auth

목표 경로: `backend`

- Apache front controller와 config
- package PUT/GET/HEAD streaming storage
- MySQL migrations/repositories
- SIWE challenge/session
- email verification + Resend adapter/webhook
- recovery endpoint
- orphan GC/Postman CLI jobs

완료 조건: API integration tests, empty DB migration, 10 MiB boundary, auth replay, upload/Postman 멱등성 테스트가 통과한다.

## 5. Static web UI

목표 경로: `frontend`

- wallet/SIWE와 mailbox/passkey onboarding
- recipient 조회와 작성/packing flow
- resumable local draft와 transaction ambiguity recovery
- inbox direct chain query와 calldata decode
- Christmas decrypt/open UX
- browser capability detection(WebAuthn PRF, WebP/JPEG, WebM/MP4)

완료 조건: 사용자 상태 전이가 정의된 내부 state와 일치하고 새로고침/timeout/key rotation에서 안전하게 복구한다.

## 6. Christmas delivery와 운영 준비

- safe block range를 사용하는 recipient aggregation
- Resend idempotency/webhook/retry
- scheduler와 manual rerun procedure
- orphan GC dry-run/report-first rollout
- backup/restore, key access, RPC failover, observability runbook

완료 조건: staging rehearsal에서 중복 이메일/정상 package 삭제 없이 재실행 가능하고 운영자가 runbook만으로 복구할 수 있다.

## 권장 초기 backlog

1. repository workspace/package manager와 CI 결정
2. protocol canonical byte utilities
3. GTX1/GBYL golden vector tests
4. tlock quicknet spike
5. contract scaffold/test
6. Sepolia one-minute E2E script

## 변경 관리

Freeze 후 protocol-breaking 변경은 ADR과 version bump 없이 merge하지 않는다. contract ABI, event signature, magic/version, HKDF info, AAD encoding, hash 알고리즘은 CI snapshot으로 보호한다. 라이브러리 업데이트는 기존 golden vector 및 실제 quicknet smoke test를 다시 통과해야 한다.
