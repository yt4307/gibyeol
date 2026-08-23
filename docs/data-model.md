# MySQL 데이터 모델

MySQL 8.4와 `utf8mb4`를 사용한다. 모든 시각은 DB에 UTC로 저장한다. wallet address는 비교를 위해 lowercase `0x` + 40 hex로 정규화한다. 온체인 편지 테이블은 만들지 않는다.

## `mailboxes`

| column | type | 제약 |
|---|---|---|
| `wallet_address` | `CHAR(42)` | PK |
| `email_ciphertext` | `VARBINARY(512)` | NOT NULL |
| `email_iv` | `BINARY(12)` | NOT NULL |
| `email_tag` | `BINARY(16)` | NOT NULL |
| `email_lookup_hash` | `BINARY(32)` | NOT NULL, UNIQUE |
| `email_verified_at` | `DATETIME(6)` | NOT NULL |
| `created_at` | `DATETIME(6)` | NOT NULL |
| `updated_at` | `DATETIME(6)` | NOT NULL |

`email_lookup_hash = HMAC-SHA256(EMAIL_LOOKUP_KEY, normalize(email))`. 이메일 암호화는 `EMAIL_ENCRYPTION_KEY`와 random IV의 AES-256-GCM을 사용한다. AAD에는 version과 wallet address를 포함한다.

## `auth_nonces`

| column | type | 제약 |
|---|---|---|
| `nonce_hash` | `BINARY(32)` | PK |
| `wallet_address` | `CHAR(42)` | NOT NULL, INDEX |
| `chain_id` | `BIGINT UNSIGNED` | NOT NULL |
| `expires_at` | `DATETIME(6)` | NOT NULL, INDEX |
| `used_at` | `DATETIME(6)` | NULL |
| `created_at` | `DATETIME(6)` | NOT NULL |

nonce 원문 대신 SHA-256 digest 저장을 권고한다. consume은 `used_at IS NULL AND expires_at > NOW(6)` 조건의 원자적 update여야 한다.

## `sessions`

| column | type | 제약 |
|---|---|---|
| `token_hash` | `BINARY(32)` | PK |
| `wallet_address` | `CHAR(42)` | NOT NULL, INDEX |
| `expires_at` | `DATETIME(6)` | NOT NULL, INDEX |
| `created_at` | `DATETIME(6)` | NOT NULL |
| `last_seen_at` | `DATETIME(6)` | NOT NULL |

token 원문은 cookie에만 둔다. 만료와 idle timeout을 모두 검사하며 `last_seen_at` write amplification을 줄이기 위해 갱신 간격을 둘 수 있다.

## `email_verifications`

| column | type | 제약 |
|---|---|---|
| `id` | `BIGINT UNSIGNED` | PK, AUTO_INCREMENT |
| `wallet_address` | `CHAR(42)` | NOT NULL, INDEX |
| `email_ciphertext` | `VARBINARY(512)` | NOT NULL |
| `email_iv` | `BINARY(12)` | NOT NULL |
| `email_tag` | `BINARY(16)` | NOT NULL |
| `email_lookup_hash` | `BINARY(32)` | NOT NULL |
| `code_hash` | `BINARY(32)` | NOT NULL |
| `expires_at` | `DATETIME(6)` | NOT NULL, INDEX |
| `attempts` | `TINYINT UNSIGNED` | NOT NULL DEFAULT 0 |
| `verified_at` | `DATETIME(6)` | NULL |
| `created_at` | `DATETIME(6)` | NOT NULL |

OTP hash는 단순 SHA-256이 아니라 서버 비밀을 사용한 HMAC으로 만든다. 짧은 OTP 공간에 대한 DB 유출 brute force를 막기 위해서다. wallet당 활성 challenge는 하나만 유지한다.

## `notifications`

| column | type | 제약 |
|---|---|---|
| `id` | `BIGINT UNSIGNED` | PK, AUTO_INCREMENT |
| `campaign` | `VARCHAR(64)` | NOT NULL |
| `wallet_address` | `CHAR(42)` | NOT NULL |
| `letter_count` | `INT UNSIGNED` | NOT NULL |
| `provider_message_id` | `VARCHAR(255)` | NULL, INDEX |
| `status` | `VARCHAR(32)` | NOT NULL |
| `sent_at` | `DATETIME(6)` | NULL |
| `delivered_at` | `DATETIME(6)` | NULL |
| `failed_at` | `DATETIME(6)` | NULL |
| `created_at` | `DATETIME(6)` | NOT NULL |
| `updated_at` | `DATETIME(6)` | NOT NULL |

`UNIQUE(campaign, wallet_address)`가 필수다. `christmas-2026` row 생성과 발송 claim을 원자적으로 처리한다. provider idempotency key도 동일한 campaign/wallet 조합에서 결정적으로 만든다.

## 보존 및 정리

- 접수된 정상 GBYL: 서비스 종료까지 보존한다.
- package 임시 파일: 실패 즉시 또는 짧은 maintenance window 내 정리한다.
- 72시간 지난 미접수 package: Base logs 어디에도 hash가 없을 때만 삭제한다.
- nonce, 만료 session, 실패한 OTP: 운영 정책에 따른 짧은 audit 기간 후 삭제한다.
- notification: 캠페인 운영/audit 기간 동안 보존한다.

Orphan GC는 업로드 시각, 안전한 chain head까지의 전체 관련 log, 현재 네트워크/컨트랙트 주소를 사용한다. RPC 장애나 log query 불완전 시 삭제를 중단하며, “확인 실패”를 “미참조”로 취급하지 않는다.
