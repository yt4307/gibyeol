# 모노레포 개발 환경

## 구성

| 영역 | 경로 | 도구 |
|---|---|---|
| Frontend | `frontend` | Node.js 24 LTS, pnpm 11, Next.js 16, React Compiler, tsx, Emotion, Zustand, TanStack Query |
| Protocol | `packages/protocol` | pnpm workspace, TypeScript, Vitest |
| Backend | `backend` | PHP 8.4, Apache, Symfony 7.4 LTS, Composer |
| Contract | `contracts` | Foundry 1.7.1, Solidity 0.8.30, Anvil |
| Database | Docker volume | MySQL 8.4 |

Node/PHP/Composer/Foundry를 호스트에 설치하지 않는다. Docker Desktop과 Compose만 필요하다.

## 최초 실행

```powershell
Copy-Item .env.example .env
docker compose up -d --build
docker compose ps
```

Frontend는 <http://localhost:3000>, backend health endpoint는 <http://localhost:8080/api/v1/health>, Anvil JSON-RPC는 <http://localhost:8545>다.

의존성을 갱신하거나 lockfile을 다시 만들 때는 아래 절차를 사용한다.

```powershell
# pnpm workspace lockfile 생성/갱신
docker compose run --rm frontend pnpm install

# Symfony dependency lockfile과 Flex recipe lock 생성/갱신
docker compose run --rm backend composer update

# 변경된 이미지와 dependency로 재빌드
docker compose up -d --build
```

생성된 `pnpm-lock.yaml`, `backend/composer.lock`, `backend/symfony.lock`은 반드시 version control에 포함한다. 이후 일반 설치는 `pnpm install --frozen-lockfile`과 `composer install`을 사용하고, dependency 변경이 아닌 실행 과정에서 lockfile을 갱신하지 않는다.

## 서비스 명령

```powershell
# 전체 로그 또는 개별 로그
docker compose logs -f
docker compose logs -f frontend backend

# frontend/protocol
docker compose exec frontend pnpm typecheck
docker compose exec frontend pnpm test
docker compose exec frontend pnpm build:frontend

# 닷홈 스모크 산출물 생성과 Apache/PHP 실행
docker compose run --rm --no-deps frontend pnpm build:frontend
docker compose run --rm --no-deps frontend pnpm package:dothome
docker compose --profile dothome up -d dothome-smoke

# backend
docker compose exec backend php bin/console about
docker compose exec backend composer test
docker compose exec backend php bin/console doctrine:migrations:migrate

# contracts
docker compose run --rm contracts build
docker compose run --rm contracts test
docker compose run --rm contracts fmt --check

# MySQL
docker compose exec db mysql -u gibyeol -p gibyeol
```

`contracts`는 상시 프로세스가 아닌 tool service라 `docker compose run --rm`으로 실행한다. `anvil`은 로컬 chain을 제공하는 상시 service다.

## Dependency 변경

Frontend/protocol dependency는 workspace root에서 실행한다.

```powershell
docker compose exec frontend pnpm --filter @gibyeol/frontend add package-name
docker compose exec frontend pnpm --filter @gibyeol/protocol add package-name
```

Backend dependency는 backend container에서 실행한다.

```powershell
docker compose exec backend composer require vendor/package
```

Protocol-sensitive dependency(tlock, drand, sodium adapter)는 PoC/golden vector를 통과한 정확한 버전으로 고정한다. 범위 버전이나 `latest`를 사용하지 않는다.

## Docker volume

| volume | 내용 | 삭제 영향 |
|---|---|---|
| `mysql_data` | local MySQL | 로컬 운영 데이터 삭제 |
| `package_storage` | local GBYL | 업로드 package 삭제 |
| `frontend_node_modules` | pnpm root dependency links/store | 재설치 필요 |
| `frontend_workspace_node_modules` | frontend dependency links | 재설치 필요 |
| `protocol_node_modules` | protocol dependency links | 재설치 필요 |
| `backend_vendor` | Composer dependencies | 재설치 필요 |
| `backend_var` | Symfony cache/log | 안전하게 재생성 가능 |
| `foundry_home` | Foundry/Solidity compiler cache | 재다운로드/재빌드 필요 |

`docker compose down`은 volume을 유지한다. `docker compose down -v`는 위 데이터를 모두 제거하므로 명시적인 초기화 때만 사용한다.

## 환경변수 경계

루트 `.env`는 Docker Compose 로컬 설정이며 commit하지 않는다. 브라우저에 전달되는 값만 `NEXT_PUBLIC_` prefix를 사용한다. private RPC credential, deployer/recovery key, DB/Resend secret은 frontend 환경에 절대 넣지 않는다.

Staging/production 값은 로컬 `.env`를 재사용하지 않고 배포 환경의 secret/config에서 주입한다.
