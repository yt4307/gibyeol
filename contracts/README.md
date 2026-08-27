# Gibyeol contracts

`Gibyeol2026`의 Foundry 프로젝트입니다. 메일박스 key rotation, calldata-only envelope와 편지 payload, 무작위 `letterId` 멱등성을 구현합니다. 함수 selector와 event topic은 테스트에 snapshot으로 고정되어 있습니다.

```powershell
# 빌드
docker compose run --rm contracts build

# 테스트
docker compose run --rm contracts test

# 포맷 검사
docker compose run --rm contracts fmt --check
```

로컬 JSON-RPC는 `docker compose up anvil` 실행 후 <http://localhost:8545>에서 사용할 수 있습니다.
