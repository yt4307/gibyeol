# 닷홈 최소 배포 스모크 테스트

## 목적과 범위

이 단계의 목적은 서비스 기능 개발이 아니라 Next.js 정적 export가 닷홈의 Apache/PHP 환경에서 제공되는지 조기에 확인하는 것이다.

검증 범위는 다음 세 가지뿐이다.

1. Apache가 Next.js의 `index.html`과 `/_next/static/*` 파일을 제공한다.
2. 브라우저에서 React가 hydration된다.
3. 같은 origin의 `/api/health.php`가 PHP로 실행되고 JSON을 반환한다.

Symfony, MySQL, 지갑, Base, drand, 암호화, 이메일은 이 산출물에 포함하지 않는다.

## 배포 산출물 만들기

저장소 루트에서 실행한다.

```powershell
docker compose run --rm --no-deps frontend pnpm build:frontend
docker compose run --rm --no-deps frontend pnpm package:dothome
```

첫 번째 명령은 `frontend/out/`에 Next.js static export를 만든다. 두 번째 명령은 이를 최소 PHP 파일과 합쳐 `dist/dothome/public_html/`을 새로 만든다.

`dist/`는 생성물이며 Git에 포함하지 않는다. 패키징 명령은 해당 산출물 디렉터리의 내용을 비운 뒤 다시 생성하므로 수동 파일을 보관하지 않는다. 실행 중인 Apache bind mount가 끊기지 않도록 `public_html` 디렉터리 자체는 유지한다.

## 로컬 Apache/PHP 확인

생성된 파일을 PHP 8.4 + Apache에서 그대로 제공한다.

```powershell
docker compose --profile dothome up -d dothome-smoke
docker compose ps dothome-smoke
```

브라우저에서 <http://localhost:8090>을 연다. 아래 결과가 모두 보여야 한다.

- `Next.js / Apache`: `정상`
- `PHP`: `정상 · 8.4.x`

직접 endpoint를 확인하려면 <http://localhost:8090/api/health.php>를 연다.

검증 후에는 다음과 같이 종료한다.

```powershell
docker compose --profile dothome stop dothome-smoke
```

## 닷홈 FTP 업로드

`dist/dothome/public_html/` 디렉터리 자체가 아니라 그 **안의 모든 파일과 숨김 파일**을 닷홈의 실제 웹 문서 루트에 업로드한다. 업로드 후 아래를 확인한다.

1. 사이트 루트가 HTTP 200으로 열린다.
2. 개발자 도구 Network 탭에서 `/_next/static/*` 요청이 404 없이 성공한다.
3. 화면의 PHP 상태가 `정상`으로 바뀐다.
4. `/api/health.php`가 PHP 소스가 아닌 JSON 응답을 반환한다.
5. HTTPS 주소에서도 동일하게 동작하고 mixed content 오류가 없다.

PHP 상태가 `연결 실패`라면 `/api/health.php`의 HTTP 상태와 응답 본문부터 확인한다. 화면은 열리지만 스타일이 없으면 `/_next/static/*`의 업로드 누락 또는 문서 루트 위치 오류를 먼저 확인한다.

## 통과 후 처리

실제 닷홈 주소, 확인 일시, 선택한 PHP 버전을 배포 기록에 남긴 뒤 protocol 구현 단계로 진행한다. 이 스모크 페이지는 이후 실제 첫 화면으로 교체한다.
