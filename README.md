# 기별 (Gibyeol)

2026년 크리스마스에 도착하는 온체인 암호 편지 서비스입니다. 하나의 저장소에서 프론트엔드, 프로토콜, 백엔드, 컨트랙트를 함께 관리합니다.

## 모노레포

```text
gibyeol/
├─ frontend/             Next.js 16, React Compiler, Emotion, Zustand, TanStack Query
├─ backend/              Symfony 7.4 LTS API/CLI
├─ contracts/            Foundry Solidity project
├─ packages/protocol/    browser protocol implementation
├─ infra/                container and hosting files
└─ docs/                 v1 Freeze Candidate documents
```

## 현재 목표: GitHub Pages 프론트엔드 배포

프론트엔드는 GitHub Pages에서 정적 export로 제공하고, PHP API와 package 저장소는 별도 호스트에서 운영합니다. 전체 기능 구현 전에 Pages 배포와 브라우저에서 API로 가는 cross-origin 경계를 먼저 검증합니다.

```powershell
docker compose -f docker-compose.dev.yml run --rm --no-deps frontend pnpm build:frontend
```

빌드 결과는 `frontend/out/`에 생성됩니다. GitHub Pages workflow, custom domain/subpath, 배포 확인 절차는 [GitHub Pages 배포 문서](docs/github-pages.md)를 따릅니다. 전체 구현 순서는 [단계별 구현 계획](docs/implementation-plan.md)을 기준으로 합니다.

## 시작하기

필요한 로컬 도구는 Docker Desktop과 Docker Compose뿐입니다.

```powershell
Copy-Item .env.example .env
Copy-Item backend/.env.local.example backend/.env.local
docker compose -f docker-compose.dev.yml up -d --build
```

`backend/.env.local`에는 로컬에서 실제 발송이 필요할 때만 Resend API key와 인증된 발신 주소를
입력한다. 이 파일은 Git에서 제외되며 `backend/.env.local.example`에는 실제 값을 넣지 않는다.

| 서비스 | 주소 |
|---|---|
| Frontend | <http://localhost:3001> |
| Storybook | <http://localhost:6007> |
| Backend health | <http://localhost:8081/api/v1/health> |
| Anvil RPC | <http://localhost:8546> |
| MySQL | `localhost:3307` |

```powershell
# 상태와 로그
docker compose -f docker-compose.dev.yml ps
docker compose -f docker-compose.dev.yml logs -f

# 테스트
docker compose -f docker-compose.dev.yml exec frontend pnpm test
docker compose -f docker-compose.dev.yml exec backend composer test
docker compose -f docker-compose.dev.yml run --rm contracts test

# Symfony console / Composer
docker compose -f docker-compose.dev.yml exec backend php bin/console about
docker compose -f docker-compose.dev.yml exec backend composer install

# 종료
docker compose -f docker-compose.dev.yml down
```

처음 dependency lockfile을 만들 때는 [개발 환경 문서](docs/development.md)의 절차를 따릅니다. 개발 DB와 package volume까지 삭제할 때만 `docker compose -f docker-compose.dev.yml down -v`를 사용합니다.

## 문서

문서 진입점은 [docs/README.md](docs/README.md)이며 protocol wire format의 기준은 [docs/protocol-v1.md](docs/protocol-v1.md)입니다.
