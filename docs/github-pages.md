# GitHub Pages 프론트엔드 배포

## 목적과 범위

Next.js static export를 GitHub Pages에서 제공한다. Pages는 HTML/CSS/JS만 호스팅하며 PHP, MySQL, package storage, secret, server-side proxy를 포함하지 않는다.

## 배포 전 결정값

| 값 | 설명 |
|---|---|
| `WEB_ORIGIN` | scheme과 host만 포함한 실제 Pages origin |
| `PAGES_BASE_PATH` | custom domain root면 빈 값, repository Pages면 `/gibyeol` |
| `NEXT_PUBLIC_API_BASE_URL` | 별도 PHP origin의 `/api/v1` URL |
| `NEXT_PUBLIC_CHAIN_ID` | 환경별 chain ID |
| `NEXT_PUBLIC_RPC_URL` | 브라우저가 사용하는 읽기 RPC |
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | Reown Dashboard의 공개 project ID |
| `NEXT_PUBLIC_GIBYEOL_CONTRACT_ADDRESS` | 환경별 contract 주소 |

`basePath`는 client bundle에 포함되는 build-time 값이다. 한 artifact를 root와 subpath에 동시에 배포하지 않는다. URL 구조가 결정되기 전에는 production artifact를 만들지 않는다.

현재 production 후보는 `www.gibyeol.kro.kr` custom domain root 방식으로 고정한다.

모바일 지갑 연결을 활성화하려면 Reown Dashboard에서 프로젝트를 만들고 origin allowlist에
`https://www.gibyeol.kro.kr`를 추가한 뒤, 동일 프로젝트 ID를 GitHub Actions variable
`NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`로 등록한다. project ID는 브라우저 bundle에 포함되는 공개 식별자이며
private key나 secret으로 취급하지 않는다. 값이 없으면 주입형 브라우저 지갑 연결만 제공한다.

| 값 | 현재 설정 |
|---|---|
| `WEB_ORIGIN` | `https://www.gibyeol.kro.kr` |
| `PAGES_BASE_PATH` | 빈 값 |
| 공개 URL | `https://www.gibyeol.kro.kr/` |

repository Pages 경로로 되돌릴 때는 workflow의 `WEB_ORIGIN`과 `PAGES_BASE_PATH`를 함께 바꾸고 새 artifact를 생성한다.

## GitHub Actions 흐름

1. default branch push 또는 `workflow_dispatch`로 시작한다.
2. repository를 checkout한다.
3. 고정된 Node/pnpm 버전과 frozen lockfile로 install한다.
4. lint, typecheck, test를 통과한다.
5. production public 환경값으로 `next build`를 실행한다.
6. `/send/`, `/inbox/`, `/_next/`가 custom domain root 기준인지 검증한다.
7. `frontend/out/`을 Pages artifact로 upload한다.
8. GitHub Pages environment에 deploy한다.

Workflow에는 최소 `pages: write`, `id-token: write`, `contents: read`만 부여한다. Pull request에서는 build까지만 수행하고 production deploy는 하지 않는다.

## Custom domain과 HTTPS

Custom domain을 쓰면 GitHub repository Pages 설정과 DNS를 모두 구성하고 HTTPS 강제를 켠다. `CNAME` 파일만으로 설정이 끝난 것으로 보지 않는다. 최종 `WEB_ORIGIN`은 SIWE, backend Origin allowlist, CORS와 동일해야 한다.

## 배포 확인

아래를 실제 Pages URL에서 확인한다.

1. `/` 또는 configured base path가 HTTP 200이다.
2. 정적 JavaScript/CSS/font/image에 404가 없다.
3. React hydration 오류가 없다.
4. 생성된 모든 정적 route를 직접 열고 새로고침할 수 있다.
5. 404가 앱 shell로 오인되지 않고 의도한 화면을 제공한다.
6. API와 RPC 요청이 HTTPS이며 mixed content가 없다.
7. Pages source map과 bundle에 secret이 없다.
8. Pages → API health 및 인증 E2E가 통과한다.

확인한 commit SHA, workflow run, 배포 URL, 시각을 deployment evidence에 기록한다.

Repository 설정의 **Settings → Pages → Build and deployment → Source**는 `GitHub Actions`로 지정한다. 배포 workflow는 main push와 수동 실행을 지원한다.

Pages가 아직 활성화되지 않은 저장소에서도 정적 산출물 검증은 계속 실행한다. 실제 배포를 시작하려면 Pages source를 `GitHub Actions`로 지정한 다음 repository Actions variable `ENABLE_PAGES_DEPLOY=true`를 추가한다. 이 변수가 없으면 `configure-pages`와 deploy job만 건너뛰며 build·test·artifact 검증은 성공 또는 실패를 그대로 보고한다.

## Rollback

직전 정상 commit을 다시 Pages workflow로 배포하는 것을 기본 rollback으로 한다. 프론트 rollback이 contract/API protocol version을 거슬러 올라가지 않는지 확인하며, 호환되지 않으면 이전 artifact를 배포하지 않는다.
