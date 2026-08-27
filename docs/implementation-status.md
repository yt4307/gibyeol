# 구현 상태와 검증 증거

기준일: 2026-08-28. `main`의 `deefa9b`까지 로컬 구현과 검증을 마쳤다. 외부 계정·비밀키가 필요한 배포 작업은 완료로 오인하지 않도록 별도 표시한다.

| 단계 | 상태 | 구현/증거 |
|---|---|---|
| M0 배포 경계 | 완료 | GitHub Pages frontend + 별도 HTTPS API 경계, ADR/배포 문서 |
| M1 품질 기준선 | 완료 | `ff09caa`, `pnpm verify` |
| M2 Pages 정적 셸 | 로컬 완료 | `3d1c573`, 정적 export와 Pages workflow |
| M3 Cross-origin API | 로컬 완료 | `d22bb51`, exact origin/credential CORS 테스트 |
| M4 byte foundation | 완료 | `4cafec0`, protocol test |
| M5 GTX1/GBYL | 완료 | `ad88fd2`, parser/crypto test |
| M6 mailbox/tlock | 완료 | `da83851`, `4fcb994`, `db03bf4`, GPK1/X25519/Passkey PRF fallback/tlock 경계와 Quicknet 실 round 왕복 |
| M7 contract | 완료 | `e3533aa`, `c14d312`, `db03bf4`, stale key 재포장 포함 7 tests와 1,000 fuzz runs |
| M8 Base Sepolia E2E | 로컬 rehearsal 완료 | Anvil deploy/register/seal E2E 성공. 실제 Sepolia tx는 RPC/deployer/recovery public key 대기 |
| M9 package/auth | 완료 | `e4944e8`, `3601011`, 실제 SIWE signature·nonce replay·GBYL upload E2E |
| M10 email/recovery | 로컬 완료 | `582ab05`, `c63e3fe`, `4fcb994`, `deefa9b`, OTP/HMAC/recovery/webhook과 초기 이메일 필수 확인 |
| M11 발송 UI | 로컬 완료 | `d56555b`, `7aa38ac`, 세분화 상태·중복 tx 복구·키 회전 재포장, static build와 Storybook |
| M12 받은 편지 UI | 로컬 완료 | `abd6002`, `20f0290`, 직접 logs/calldata 조회, 온체인 키·SHA 검증, 사진/영상 복호화와 이메일 복구 flow |
| M13 운영 job | 로컬 rehearsal 완료 | `ab5af19`, GC dry-run과 Postman 2회 실행에서 두 번째 발송 0건 |
| M14 release gate | 자동 gate 완료 | `a333011`, manifest/round 검증과 production checklist. 실제 production 승인 대기 |

## 최신 전체 검증 결과

- frontend ESLint, TypeScript, Next.js static export 성공
- Storybook static build 성공
- protocol: 7 files, 15 tests 성공
- backend: 30 tests, 84 assertions 성공
- contract: 7 tests 성공, fuzz 1,000 runs 성공
- Quicknet 실제 round `31681025`에서 `pnpm verify:quicknet` tlock encrypt/decrypt 왕복 성공
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
