# Gibyeol contracts

`Gibyeol2026`의 Foundry 프로젝트입니다. 컨트랙트 구현은 protocol package의 canonical encoding과 golden vector가 확정된 뒤 시작합니다.

```powershell
# 빌드
docker compose run --rm contracts build

# 테스트
docker compose run --rm contracts test

# 포맷 검사
docker compose run --rm contracts fmt --check
```

로컬 JSON-RPC는 `docker compose up anvil` 실행 후 <http://localhost:8545>에서 사용할 수 있습니다.
