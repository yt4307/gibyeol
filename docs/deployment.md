# 배포 및 운영 설정

## 환경

| 환경 | chain | chain ID | 용도 |
|---|---|---:|---|
| local | local EVM | 개발값 | 단위/통합 테스트 |
| staging | Base Sepolia | `84532` | E2E와 운영 rehearsal |
| production | Base Mainnet | `8453` | 실제 Christmas 2026 |

로컬 모노레포의 기준 도구는 PHP 8.4 + Symfony 7.4 LTS, Node.js 24 LTS + Next.js 16, MySQL 8.4, Foundry 1.7.1이다. 개발 컨테이너 버전 변경은 lockfile과 전체 테스트를 함께 갱신한다.

RPC URL, contract address, drand endpoint는 build/deploy 환경변수로 분리한다. production에서 Base 공식 public RPC를 주 provider로 사용하지 않는다.

프론트엔드는 GitHub Pages, PHP/API는 별도 닷홈 HTTPS origin에 배포하는 것을 현재 목표로 한다. 각 환경의 배포 manifest에는 최소 `WEB_ORIGIN`, `API_ORIGIN`, Pages base path, chain ID, contract address, drand chain/round, frontend/backend commit SHA를 함께 기록한다.

## 설정 목록

아래 이름은 구현 시 확정할 권장 명칭이다.

| 변수 | 공개 가능 | 설명 |
|---|---|---|
| `APP_ENV` | 예 | 환경명 |
| `WEB_ORIGIN` | 예 | GitHub Pages origin, SIWE domain/URI와 CORS 기준 |
| `API_ORIGIN` | 예 | PHP API의 외부 HTTPS origin |
| `CHAIN_ID` | 예 | 환경별 허용 chain |
| `BASE_RPC_URL` | 아니오 권고 | provider endpoint/API key 포함 가능 |
| `GIBYEOL_CONTRACT_ADDRESS` | 예 | 환경별 배포 주소 |
| `DRAND_CHAIN_HASH` | 예 | quicknet hash |
| `DRAND_ENDPOINT` | 예 | 명시적 quicknet endpoint |
| `UNLOCK_AT` | 예 | `1798124400` |
| `PACKAGE_STORAGE_PATH` | 아니오 | web root 밖 absolute path |
| `DATABASE_URL` | 아니오 | MySQL credential |
| `SESSION_COOKIE_NAME` | 예 | 기본 `gibyeol_session` |
| `EMAIL_ENCRYPTION_KEY` | 아니오 | 32-byte server key |
| `EMAIL_LOOKUP_KEY` | 아니오 | HMAC key, encryption key와 분리 |
| `RECOVERY_PRIVATE_KEY` | 아니오 | X25519 private key |
| `RESEND_API_KEY` | 아니오 | email provider key |
| `RESEND_WEBHOOK_SECRET` | 아니오 | webhook verification |
| `SESSION_SAME_SITE` | 예 | origin topology 검증 후 `Lax` 또는 `None` |

GitHub Pages build-time 공개 변수:

| 변수 | 설명 |
|---|---|
| `PAGES_BASE_PATH` | custom domain root면 빈 값, repository Pages면 `/gibyeol` |
| `NEXT_PUBLIC_WEB_ORIGIN` | 최종 Pages origin |
| `NEXT_PUBLIC_API_BASE_URL` | `${API_ORIGIN}/api/v1` |
| `NEXT_PUBLIC_CHAIN_ID` | 환경별 chain ID |
| `NEXT_PUBLIC_RPC_URL` | 브라우저용 read RPC |
| `NEXT_PUBLIC_GIBYEOL_CONTRACT_ADDRESS` | 환경별 contract address |
| `NEXT_PUBLIC_DRAND_ENDPOINT` | 검증한 quicknet endpoint |

Next.js에 노출되는 변수에는 private key나 provider write/admin credential을 넣지 않는다. public RPC라도 abuse 비용이 있으면 domain restriction 가능한 key를 사용한다.

## Contract deployment gate

1. target chain ID를 확인한다.
2. deployer와 recovery public key를 두 사람이 대조한다.
3. quicknet chain hash 전체 32바이트를 확인한다.
4. `UNLOCK_AT == 1798124400`을 확인한다.
5. unlock round와 이전 round의 시간을 assert한다.
6. constructor args와 compiler/settings/source를 기록하고 explorer verify한다.
7. 배포 후 immutable/mapping smoke test와 test letter를 실행한다.
8. 주소, tx hash, code hash, ABI를 환경 manifest에 고정한다.

## GitHub Pages hosting

- GitHub Actions에서 frozen lockfile로 lint/typecheck/test/build 후 `frontend/out`만 Pages artifact로 배포한다.
- repository Pages subpath를 사용하면 build-time `basePath`를 적용한다. custom domain root와 같은 artifact를 공유하지 않는다.
- Pull request는 build만 수행하며 production deploy 권한을 받지 않는다.
- custom domain은 Pages 설정, DNS, HTTPS 강제를 함께 검증한다.
- Pages에는 secret, PHP, server rewrite/proxy, runtime 환경변수가 없다고 가정한다.
- 배포와 rollback 절차는 [github-pages.md](github-pages.md)를 따른다.

## PHP hosting

- PHP public directory와 package/private/config 디렉터리를 분리한다.
- package 저장소는 최종 정상 파일을 모두 담을 용량이 필요하다. 무료 호스팅 500MB는 최대 크기 package 약 47개만으로도 여유가 소진될 수 있으므로 production 보존 정책과 맞는지 별도 검토한다.
- `.gbyl` MIME, immutable cache, ETag, upload/body/time limits를 Apache/PHP/application 세 층에서 맞춘다.
- CLI 또는 scheduler가 GC/Postman을 중복 실행해도 DB/filesystem lock으로 안전해야 한다.
- vendor는 lockfile 기반으로 build하고 FTP 배포가 필요하면 개발/CI에서 Composer install 후 artifact에 포함한다.
- CORS는 정확한 `WEB_ORIGIN`과 credentials만 허용하고 state-changing request의 Origin을 검증한다.
- `WEB_ORIGIN`과 `API_ORIGIN`이 cross-site라면 cookie 정책의 실제 브라우저 E2E가 production gate다.

닷홈은 backend 전용이다. custom domain 또는 reverse proxy를 사용하면 `Host`, HTTPS, client IP 신뢰, `API_ORIGIN`이 일관되는지 staging에서 검증한다. 자세한 제약 확인은 [dothome-backend.md](dothome-backend.md)를 따른다.

## 관측성과 백업

- structured log: request ID, endpoint, status, latency, wallet hash(필요 시), provider message ID
- 금지 log: cookie, signature 전문, OTP, email plaintext, ciphertext body, seed/private key
- alert: package write failure, RPC/log gap, Postman failure rate, webhook signature failure, disk usage
- backup: MySQL, 정상 package, recovery private key offline copy
- restore drill: package digest 재검증, DB migration version, recovery key public key 일치 확인

## Christmas runbook 핵심

1. KST/UTC scheduler 시각과 drand round 도달을 확인한다.
2. RPC safe head와 log range 연속성을 확인한다.
3. 먼저 recipient/count dry-run 보고서를 생성한다.
4. notification unique row를 claim하고 Resend idempotency key로 발송한다.
5. timeout은 같은 key로 재시도한다.
6. webhook과 provider dashboard를 대조한다.
7. job 재실행이 추가 메일을 만들지 않는지 확인한다.
