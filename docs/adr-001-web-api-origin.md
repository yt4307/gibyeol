# ADR-001: Web/API origin과 브라우저 세션 경계

## 상태

Accepted for repository Pages deployment.

## 결정

- Web은 `https://yt4307.github.io/gibyeol/`에서 제공한다.
- 브라우저 origin과 SIWE domain은 path를 제외한 `https://yt4307.github.io`다.
- API는 별도 HTTPS origin을 사용하므로 cross-origin 요청으로 취급한다.
- API는 정확히 하나의 `WEB_ORIGIN`만 허용하고 credentialed CORS에 wildcard를 쓰지 않는다.
- 브라우저의 unsafe method 요청은 정확한 `Origin` 헤더가 없거나 다르면 거부한다.
- Resend처럼 서명으로 인증하는 webhook 경로는 브라우저 Origin 검사에서 제외한다.
- 세션 쿠키는 `Secure`, `HttpOnly`를 사용한다. cross-site 배치라면 `SameSite=None`이 필요하며, 실제 Safari와 모바일 브라우저 검증을 production gate로 둔다.

## 근거와 영향

GitHub Pages는 PHP/API를 같은 origin으로 proxy할 수 없다. 따라서 API 응답은 요청 origin을 그대로 반사하지 않고 환경에 고정한 값과 상수 시간 비교한 뒤에만 CORS 헤더를 추가한다. Production API hostname이 정해지면 deployment manifest의 `API_ORIGIN`, Pages build의 `NEXT_PUBLIC_API_BASE_URL`, 닷홈의 `WEB_ORIGIN`을 한 변경 단위로 고정한다.
