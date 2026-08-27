# 기별 v1 문서

상태: **Freeze Candidate (FC)**
기준일: 2026-08-23

이 디렉터리는 기별 v1 구현의 기준 문서다. `protocol-v1.md`에서 `MUST`, `MUST NOT`, `SHOULD`, `MAY`는 각각 필수, 금지, 권고, 선택을 뜻한다.

## 문서 지도

| 문서 | 목적 |
|---|---|
| [protocol-v1.md](protocol-v1.md) | 변경을 최소화할 프로토콜 경계와 바이너리 형식 |
| [architecture.md](architecture.md) | 컴포넌트 책임과 주요 시퀀스 |
| [api-v1.md](api-v1.md) | PHP HTTP API 계약 |
| [data-model.md](data-model.md) | MySQL 스키마와 데이터 보존 정책 |
| [security.md](security.md) | 암호화, 키 수명주기, 위협 모델 |
| [verification-plan.md](verification-plan.md) | 구현 전 통과해야 하는 테스트와 합격 조건 |
| [implementation-plan.md](implementation-plan.md) | 단계별 개발 순서와 완료 조건 |
| [deployment.md](deployment.md) | 환경, 비밀값, 운영 체크리스트 |
| [development.md](development.md) | 모노레포 로컬 개발 환경과 명령어 |
| [dothome-smoke.md](dothome-smoke.md) | 최소 정적 export의 Apache/PHP 배포 검증 절차 |

## Freeze 전에 반드시 닫을 항목

1. 실제 quicknet을 사용한 `tlock-js`/`drand-client` 버전 조합과 wire format을 PoC로 검증하고 정확한 버전을 고정한다.
2. Base Sepolia와 Mainnet의 배포 주소, 배포 트랜잭션, `UNLOCK_ROUND`를 기록한다.
3. `timeForRound(UNLOCK_ROUND) >= 1798124400`이고 바로 전 round의 시간이 그보다 작음을 자동 테스트로 증명한다.
4. SIWE 라이브러리를 선정·고정하고 공식 EIP-4361 test vector를 통과시킨다.
5. 브라우저별 Passkey PRF 및 MediaRecorder codec 호환성 표를 실제 기기에서 확정한다.
6. 원 기획에서 byte-level 표현이 없던 아래 FC 보완값을 승인하거나 수정한다.

   - 정수 big-endian, chain ID uint256, raw 20-byte EVM address
   - HKDF salt = 32 zero bytes
   - media index = 0부터 시작하는 uint16 big-endian
   - GPK1 seed encryption AAD = envelope prefix
   - media가 없는 편지도 8-byte empty GBYL을 만들고 업로드

이 항목들은 구현/배포 파라미터이며 문서에 정의된 암호화 순서, 온체인 인터페이스, 바이너리 magic/version, 해시 알고리즘을 바꾸지 않는다.
