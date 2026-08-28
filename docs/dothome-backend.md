# 닷홈 PHP backend 배포 경계

## 역할

닷홈은 GitHub Pages 프론트 파일을 제공하지 않는다. 다음 서버 역할만 담당한다.

- Symfony `/api/v1`
- GBYL package 저장과 공개 다운로드
- MySQL 운영 데이터
- SIWE session, email OTP, recovery
- Resend webhook
- orphan GC와 Christmas Postman 실행 지점 또는 외부 runner의 대상 API

PHP web root에는 `backend/public`만 노출한다. package, `.env`, private key, Composer source/config는 web root 밖에 둔다.

## 배포 전에 확인할 호스팅 제약

1. 실제 PHP와 MySQL 버전
2. request body, `post_max_size`, execution time 제한
3. web root 밖 쓰기 가능한 절대 경로와 총 저장 용량
4. HTTPS와 custom domain/subdomain 지원
5. cron 또는 장시간 CLI 실행 지원
6. SSH/FTP 배포 방식과 Composer vendor 업로드 제한
7. webhook 수신 및 outbound HTTPS/Resend/RPC 연결 가능 여부

2026-08-28 대상 계정의 사전 점검 결과는 PHP 8.4.24, `pdo_mysql`, `sodium`, `curl` 지원,
256 MiB request body 제한이다. `allow_url_fopen`은 비활성화되어 있으므로 outbound RPC와 Resend
요청은 공용 cURL 전송 계층을 사용한다. 제공되지 않는 `gmp` 대신 EIP-191 해시를 계산하고 Base
RPC에서 EVM `ECRECOVER` precompile을 `eth_call`하는 방식으로 EOA SIWE 서명을 검증한다. 따라서
로그인 시 primary 또는 fallback RPC 중 하나는 정상이어야 한다.

정상 GBYL을 서비스 종료까지 보존할 용량이 없으면 닷홈 filesystem을 production package 저장소로 확정하지 않는다. scheduler가 없다면 GitHub Actions 등 외부 runner를 사용할 수 있지만, recovery private key와 DB를 외부 runner로 반출하지 않는 구조여야 한다.

## Cross-origin 확인

실제 GitHub Pages `WEB_ORIGIN`에서 다음을 확인한다.

- health GET과 package GET/HEAD
- package PUT preflight와 streaming upload
- SIWE challenge/verify와 session 유지
- email/recovery state-changing 요청
- 허용하지 않은 Origin 거부
- HTTPS와 certificate chain

cookie/CORS의 기준 계약은 [api-v1.md](api-v1.md)를 따른다.

## 배포 산출물

Composer lockfile로 production dependency를 설치한 artifact를 만든다. `.env`, runtime logs, cache, uploaded package는 artifact에 포함하지 않는다. 배포 후 migration은 명시적으로 실행하고 실패 시 application version과 schema version을 함께 되돌리는 절차를 준비한다.

FTP 전용 계정에서는 저장소의 `backend`를 웹 루트와 직접 동기화하지 않는다. 로컬
`.deploy/dothome`을 Git에서 제외된 staging root로 사용하고, SFTPresso의 `context`도 이 경로로
제한한다. `uploadOnSave`와 원격 파일 자동 삭제는 비활성화하며 동기화 전 변경 목록을 확인한다.
FTP 비밀번호는 workspace 설정에 기록하지 않고 운영체제 keychain에 보관한다.

FTP 계정이 `html`만 노출하는 경우 `./scripts/build-dothome-artifact.sh`로 다음 구조를 생성한다.

```text
.deploy/dothome/html/
├── .htaccess
├── index.php
└── _gibyeol/
    ├── .htaccess
    ├── .env
    ├── .env.local.example
    ├── config/
    ├── src/
    ├── vendor/
    └── var/
```

루트 `index.php`는 `/api/v1/*` 요청만 전달받는 공개 진입점이며 `_gibyeol`은 Apache 2.4와 2.2
호환 규칙으로 모든 웹 접근을 거부한다.
생성기는 production dependency만 설치하고 dev dependency, test, cache를 제외한다. `.env`는 커밋 가능한
공통 기본값이며 artifact를 만들 때마다 `infra/dothome/app.env`에서 새로 생성된다. 실제 DB 접속 정보와
암호 키는 Git에서 제외된 `_gibyeol/.env.local`에 기록하며 Symfony가 이 값을 `.env`보다 우선 적용한다.
재생성 시 기존 `.env.local`은 새 artifact에 보존되지만 별도의 안전한 위치에도 백업한다. 기존 staging
교체가 필요하므로 검토 후에만 `--force`를 사용한다.

## FTP 전용 배포 순서

1. `infra/dothome/gibyeol-preflight.php`를 staging의 `html`에 복사하여 단독 업로드한다.
2. 브라우저에서 `/gibyeol-preflight.php`를 열어 PHP 8.4, 필수 확장, 쓰기 및 외부 HTTP 전송 조건을 확인한다.
3. 결과를 기록한 직후 원격의 `gibyeol-preflight.php`를 삭제한다.
4. 점검을 통과한 환경에서만 production dependency와 보호 규칙을 포함한 전체 artifact를 업로드한다.
5. `./scripts/stage-dothome-migration.sh`로 일회성 실행기와 토큰을 생성하여 각각 웹 루트와
   `_gibyeol/var`의 동일 경로에 업로드한다.
6. `/gibyeol-migrate.php`의 POST form에 로컬 토큰을 입력하여 migration 성공과 서버 토큰 삭제를 확인한다.
7. 성공 직후 원격과 로컬의 `gibyeol-migrate.php`, `migration-token`, `migration.lock`을 모두 삭제한다.

점검 파일은 `phpinfo()`를 호출하지 않으며 비밀값과 서버 절대 경로를 출력하지 않는다. 다만 공개
상태로 계속 둘 이유가 없으므로 전체 artifact에는 포함하지 않는다.
