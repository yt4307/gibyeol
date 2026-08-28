# 구현 상태와 검증 증거

기준일: 2026-08-28. 현재 checkout의 로컬 구현과 검증 결과다. 외부 계정·비밀키가 필요한 배포 작업은 완료로 오인하지 않도록 별도 표시한다.

| 단계 | 상태 | 구현/증거 |
|---|---|---|
| M0 배포 경계 | 완료 | GitHub Pages frontend + 별도 HTTPS API 경계, ADR/배포 문서 |
| M1 품질 기준선 | 완료 | `pnpm verify`, 격리된 빈 MySQL migration gate 포함 |
| M2 Pages 정적 셸 | 로컬 완료 | `3d1c573`, 정적 export와 Pages workflow |
| M3 Cross-origin API | 로컬 완료 | `d22bb51`, exact origin/credential CORS 테스트 |
| M4 byte foundation | 완료 | `4cafec0`, protocol test |
| M5 GTX1/GBYL | 완료 | `ad88fd2`, parser/crypto test |
| M6 mailbox/tlock | 완료 | `da83851`, `4fcb994`, `db03bf4`, GPK1/X25519/Passkey PRF fallback/tlock 경계와 Quicknet 실 round 왕복 |
| M7 contract | 완료 | stale key 재포장과 event ABI 검증 포함 8 tests와 1,000 fuzz runs |
| M8 Base Sepolia E2E | 로컬 구성요소 rehearsal 완료 | 실제 암호 흐름과 Anvil deploy/register/seal을 각각 검증. 실제 Sepolia 통합 tx는 RPC/deployer/recovery public key 대기 |
| M9 package/auth | 완료 | 실제 SIWE signature·nonce replay·GBYL upload와 빈 MySQL에 4개 migration 적용 검증 |
| M10 email/recovery | 로컬 완료 | `582ab05`, `c63e3fe`, `4fcb994`, `deefa9b`, OTP/HMAC/recovery/webhook과 초기 이메일 필수 확인 |
| M11 발송 UI | 로컬 완료 | 세분화 상태·중복 tx 복구·키 회전 재포장, 사진 2,048px/WebP 전처리, 싱글스레드 ffmpeg.wasm 영상 타임랩스 변환과 10 MiB 사전 검증, 핵심 hook 회귀 테스트, static build와 Storybook |
| M12 받은 편지 UI | 로컬 완료 | 직접 logs/calldata 조회와 event/calldata 일치 회귀 테스트, 온체인 키·SHA 검증, 사진/영상 복호화와 이메일 복구 flow |
| M13 운영 job | 로컬 rehearsal 완료 | `ab5af19`, GC dry-run과 Postman 2회 실행에서 두 번째 발송 0건 |
| M14 release gate | 자동 gate 완료 | `a333011`, manifest/round 검증과 production checklist. 실제 production 승인 대기 |

## 최신 전체 검증 결과

- frontend: 4 files, 13 tests와 ESLint, TypeScript, Next.js static export 성공
- Storybook static build 성공
- protocol: 8 files, 18 tests 성공. 10 MiB 정확 경계, item 순서 인증, mailbox부터 개봉까지 로컬 암호 흐름 포함
- backend: 30 tests, 84 assertions 성공
- 새 MySQL 8.4 volume에 migration 4개 적용 후 up-to-date 검증 성공
- contract: 8 tests 성공, event topic/data ABI 검증과 fuzz 1,000 runs 성공
- Quicknet 실제 round `31692837`에서 `pnpm verify:quicknet` tlock encrypt/decrypt 왕복 성공
- manifest round 경계: round `35107012` = Unix `1798124400`, 이전 round = `1798124397`
- 로컬 Postman: 첫 실행 `sent=1`, 동일 입력 재실행 `sent=0`, `skipped=1`

## 외부 입력이 있어야 끝나는 항목

1. Base Sepolia/Mainnet RPC와 승인된 deployer signer
2. production recovery public key와 offline backup 승인 기록
3. 닷홈 production API origin, MySQL, package volume, scheduler 접근
4. Resend API key, webhook secret, verified sender/domain
5. GitHub Pages repository variables/settings와 production URL
6. 실제 Chrome/Safari/Firefox WebAuthn PRF 및 cross-site cookie smoke를 수행할 브라우저 환경. 현재 자동화 세션에는 연결 가능한 브라우저가 없어 미실행
7. monitoring/backup/incident owner 두 사람 이상의 release 승인

위 값 없이 Mainnet 배포, explorer verify, 실제 이메일, production smoke를 임의로 실행하지 않는다. 제공된 뒤에는 [production release checklist](production-release-checklist.md)를 순서대로 수행하고 production manifest를 보안 저장소에 보관한다.
