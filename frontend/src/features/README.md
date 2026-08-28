# Frontend features

사용자 기능 코드는 역할별 상위 디렉터리 아래에 기능 단위로 나눠 둔다.

```text
features/
├─ components/{feature}/  화면 조각과 표현 컴포넌트
├─ data/{feature}/        정적 문구, fixture, feature 전용 모델
├─ flow/{feature}/        page에서 호출하는 화면 조립과 단계 전환
└─ hooks/{feature}/       브라우저 상태와 재사용 가능한 상호작용 로직
```

- `src/app/**/page.tsx`는 route entry 역할만 하고 feature flow를 렌더링한다.
- `/`는 홈, `/send`는 편지 보내기, `/inbox`는 받은 기별의 route로 사용한다.
- 표현 컴포넌트는 가능한 한 데이터 접근 없이 props로 렌더링한다.
- 독립 렌더링할 수 있는 component와 flow에는 같은 디렉터리에 CSF story를 둔다.
- 여러 feature가 실제로 공유하기 전에는 성급하게 공용 디렉터리로 옮기지 않는다.
- 여러 feature가 사용하는 체인 클라이언트와 외부 연동 코드는 `src/infrastructure`에 둔다.
- protocol 암호화와 wire format 로직은 feature가 아니라 `packages/protocol`에 둔다.
