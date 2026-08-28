# ADR-002: GMP 없는 SIWE 서명 검증

## 상태

Accepted for Dothome PHP 8.4 deployment.

## 결정

- 기별이 생성하는 EIP-4361 profile을 엄격한 내부 formatter/parser로 처리한다.
- EOA 서명은 EIP-191 prefix와 Keccak-256으로 digest를 계산한다.
- `r`, `s`, `v` 형식과 low-s 조건을 검사한 뒤 EVM `ECRECOVER` precompile 주소
  `0x0000000000000000000000000000000000000001`에 `eth_call`한다.
- primary RPC 실패 시 credential을 노출하지 않고 fallback RPC를 사용한다.
- 서명에서 복구한 주소와 SIWE address를 상수 시간 비교한다.
- nonce의 단일 사용, domain, URI, chain ID, issued-at과 expiration 검증은 기존 session 경계를 유지한다.
- 현재 profile은 EOA만 지원한다. Contract Account 지원이 필요하면 EIP-1271 검증을 별도 결정으로 추가한다.

## 근거와 영향

닷홈 PHP 8.4 계정은 `gmp` 확장을 제공하지 않는다. 기존 `zbkm/siwe`의 ECDSA 구현은
`simplito/elliptic-php`를 통해 `ext-gmp`를 요구하므로 production에서 실행할 수 없다. EVM의 표준
precompile을 사용하면 별도 검증 서버나 보조 contract 없이 같은 secp256k1 주소 복구를 수행할 수
있다.

그 결과 로그인은 PHP 계산 자원 대신 Base RPC 가용성에 의존한다. 운영 환경에는 서로 다른 장애
도메인의 primary/fallback RPC가 필요하다. 메시지 parser는 기별이 생성하는 필수 field profile만
허용하며 임의의 SIWE optional field는 수용하지 않는다.
