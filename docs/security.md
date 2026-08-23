# 보안 및 키 관리

## 보안 목표

- 편지 본문과 미디어는 개봉 시각 전 누구도 복호화할 수 없어야 한다.
- 개봉 시각 이후에도 recipient mailbox private key 없이는 복호화할 수 없어야 한다.
- 서로 다른 편지/항목 간 ciphertext 교체는 AES-GCM 인증에 실패해야 한다.
- 서버가 package bytes를 읽거나 공개 배포해도 plaintext 기밀성이 유지되어야 한다.
- DB 유출만으로 이메일 plaintext, session token, OTP를 얻기 어려워야 한다.

## 명시적 신뢰와 비목표

- Base calldata와 event는 영구 공개다. encrypted metadata의 크기, sender, recipient, 시각은 숨기지 않는다.
- 개봉 후 emergency recovery에서는 서버가 seed를 메모리에서 잠시 볼 수 있으므로 서버 신뢰가 존재한다.
- 악성/침해된 브라우저, wallet, authenticator로부터 사용자를 보호하는 것은 범위 밖이다.
- 트래픽 분석, sender-recipient 관계 은닉, ZK는 v1 범위 밖이다.
- drand/chain의 장기 생존성과 가용성은 외부 의존성이다.

## 키 목록

| 키 | 생성/보관 | 수명 |
|---|---|---|
| Letter Key | 브라우저 CSPRNG, 메모리 | 편지 작성/개봉 작업 동안 |
| Text/Media Key | HKDF 파생, 브라우저 메모리 | 해당 작업 동안 |
| Mailbox Seed/private key | Passkey envelope 또는 recovery로 복구 | 가능한 짧게 |
| Passkey KEK | WebAuthn PRF + HKDF | wrapping/unwrapping 동안 |
| Recovery private key | server web root 밖 + offline backup | 서비스 수명 |
| Email encryption key | server secret store | rotation 계획 필요 |
| Email lookup key | server secret store | 장기, encryption key와 분리 |
| Session token | client secure cookie, DB에는 hash | session 만료까지 |

브라우저의 민감한 `Uint8Array`는 사용 직후 가능한 범위에서 zero-fill한다. JS GC 때문에 완전한 삭제는 보장할 수 없음을 전제로 한다.

## 서버 비밀값

`RECOVERY_PRIVATE_KEY`, `EMAIL_ENCRYPTION_KEY`, `EMAIL_LOOKUP_KEY`, Resend API/webhook secret은 repository, image layer, web root에 두면 안 된다. production에서는 읽기 권한이 제한된 외부 설정 파일 또는 hosting secret 기능을 쓴다. recovery private key는 별도의 암호화된 offline backup과 복구 훈련이 필요하다.

## Package 업로드 방어

- PHP `post_max_size`만 믿지 않고 application streaming limit를 적용한다.
- digest 검증 전 최종 경로에 노출하지 않는다.
- client filename을 받거나 filesystem path에 사용하지 않는다.
- symlink를 따라가지 않고 digest 기반 고정 경로만 사용한다.
- parser의 모든 덧셈/offset은 overflow와 EOF를 검사한다.
- GBYL은 active content로 serve하지 않고 `nosniff`를 설정한다.

## 인증 방어

- SIWE domain, URI, chain ID, nonce, issued-at, expiration을 모두 bind한다.
- nonce는 한 번만 소비하고 signature malleability/contract wallet 지원 정책을 라이브러리 테스트로 확정한다.
- session fixation 방지를 위해 로그인 성공 때 새 token을 발급한다.
- state-changing API는 Origin 검증을 추가한다. SameSite만으로 CSRF 방어를 끝내지 않는다.
- auth/email/recovery endpoint에 wallet, email hash, IP 기준 rate limit과 audit event를 둔다.
- OTP 응답은 email 존재 여부를 노출하지 않는다.

## 복호화 순서

외부 데이터를 신뢰하지 않는다. archive는 다운로드 완료 → 전체 크기 제한 → SHA-256 확인 → header/length parse → item별 GCM 인증 순서다. plaintext를 UI에 사용하기 전에 인증을 완료한다. HTML로 직접 삽입하지 않고 text로 렌더링한다. media Blob URL은 사용 후 revoke한다.

## 운영 사고 시 원칙

- RPC 조회 실패 시 orphan을 삭제하지 않는다.
- Resend 응답 timeout 시 새 idempotency key로 다시 보내지 않는다.
- recovery key 유출 시 이미 온체인에 올라간 recovery envelope는 개봉 시각 후 영향을 받는다. immutable contract 특성상 v1에서 key 교체가 불가능하므로 배포 전 backup/access policy 검증이 필수다.
- 암호 wire format 변경은 silent fallback하지 않고 명시적 version으로 처리한다.
