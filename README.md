# 기별 (Gibyeol)

2026년 크리스마스에 도착하는 온체인 암호 편지 서비스입니다. 하나의 저장소에서 프론트엔드, 프로토콜, 백엔드, 컨트랙트를 함께 관리합니다.

## 모노레포

```text
gibyeol/
├─ frontend/             Next.js 16, React Compiler, Emotion, Zustand, TanStack Query
├─ backend/              Symfony 7.4 LTS API/CLI
├─ contracts/            Foundry Solidity project
├─ packages/protocol/    browser protocol implementation
├─ infra/docker/         container configuration
└─ docs/                 v1 Freeze Candidate documents
```

## 시작하기

필요한 로컬 도구는 Docker Desktop과 Docker Compose뿐입니다.

```powershell
Copy-Item .env.example .env
docker compose up -d --build
```

| 서비스 | 주소 |
|---|---|
| Frontend | <http://localhost:3000> |
| Backend health | <http://localhost:8080/api/v1/health> |
| Anvil RPC | <http://localhost:8545> |
| MySQL | `localhost:3306` |

```powershell
# 상태와 로그
docker compose ps
docker compose logs -f

# 테스트
docker compose exec frontend pnpm test
docker compose exec backend composer test
docker compose run --rm contracts test

# Symfony console / Composer
docker compose exec backend php bin/console about
docker compose exec backend composer install

# 종료
docker compose down
```

처음 dependency lockfile을 만들 때는 [개발 환경 문서](docs/development.md)의 절차를 따릅니다. 로컬 DB와 package volume까지 삭제할 때만 `docker compose down -v`를 사용합니다.

## 문서

문서 진입점은 [docs/README.md](docs/README.md)이며 protocol wire format의 기준은 [docs/protocol-v1.md](docs/protocol-v1.md)입니다.
