# Frontend features

사용자 기능별 코드는 이 디렉터리에 둔다.

```text
features/{feature}/
├─ components/  화면 조각과 표현 컴포넌트
├─ data/        정적 문구, fixture, feature 전용 모델
├─ flow/        page에서 호출하는 화면 조립과 단계 전환
└─ hooks/       브라우저 상태와 재사용 가능한 상호작용 로직
```

- `src/app/page.tsx`는 route entry 역할만 하고 feature flow를 렌더링한다.
- 표현 컴포넌트는 가능한 한 데이터 접근 없이 props로 렌더링한다.
- 독립 렌더링할 수 있는 component와 flow에는 같은 디렉터리에 CSF story를 둔다.
- 여러 feature가 실제로 공유하기 전에는 성급하게 공용 디렉터리로 옮기지 않는다.
- protocol 암호화와 wire format 로직은 feature가 아니라 `packages/protocol`에 둔다.
