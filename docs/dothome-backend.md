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
