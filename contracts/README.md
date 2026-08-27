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

로컬 broadcast E2E는 Anvil을 실행한 뒤 unlocked account를 sender로 지정해 수행합니다.

```powershell
docker compose -f docker-compose.dev.yml up -d anvil
docker compose -f docker-compose.dev.yml run --rm --no-deps --entrypoint forge contracts script script/LocalE2E.s.sol:LocalE2E --rpc-url http://anvil:8545 --broadcast --unlocked --sender 0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266
```

Base Sepolia 배포는 `RECOVERY_PUBLIC_KEY`, RPC와 broadcast signer를 외부 secret으로 전달해 `DeployGibyeol2026.s.sol`을 실행한다. 배포 후 주소와 tx hash는 `docs/deployment-manifest.example.json` 형식으로 별도 환경 manifest에 기록한다.
