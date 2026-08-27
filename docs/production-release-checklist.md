# Production release checklist

이 문서는 Base Mainnet과 GitHub Pages production 배포 때 사용하는 승인 기록이다. 빈 항목이 하나라도 있으면 release하지 않는다.

## 자동 검증

- [ ] `pnpm install --frozen-lockfile && pnpm verify` 성공
- [ ] production manifest를 별도 보안 저장소에 작성
- [ ] `pnpm release:validate -- path/to/manifest.json --production` 성공
- [ ] Foundry compiler `0.8.30`, optimizer/metadata 설정과 배포 source 일치
- [ ] explorer source verification URL 응답 성공
- [ ] contract `UNLOCK_AT`, `UNLOCK_ROUND`, `DRAND_CHAIN_HASH`, `RECOVERY_PUBLIC_KEY` 조회값과 manifest 일치
- [ ] `timeForRound(35107012) >= 1798124400`, 이전 round는 더 이른 값 확인

## 두 사람 확인

- [ ] chain ID `8453`, deployer, nonce, constructor calldata 확인
- [ ] recovery public key를 offline 원본과 대조하고 private key backup restore 확인
- [ ] contract address, deployment tx hash, deployment block 확인
- [ ] Pages build의 API URL, RPC URL, contract address, deployment block 확인
- [ ] manifest `approvals`에 서로 다른 승인자 이름·시각·scope 기록

## Production smoke

- [ ] 실제 Pages origin에서 HTTPS와 `/gibyeol` asset path 확인
- [ ] Pages origin → API preflight, SIWE cookie, logout 확인
- [ ] 새 Passkey mailbox 등록과 key rotation 확인
- [ ] 1개 test letter의 package upload, `sealLetter`, inbox 조회 확인
- [ ] Chrome, Safari, Firefox의 WebAuthn PRF 지원/미지원 안내 확인
- [ ] third-party cookie 제한 환경에서 세션 동작 확인
- [ ] 변조 package, wrong key, unlock 이전 개봉이 모두 실패하는지 확인

## 운영 승인

- [ ] [운영 Runbook](operations-runbook.md)으로 GC/Postman 수동 재실행 rehearsal 완료
- [ ] MySQL/package backup과 격리 restore rehearsal 증거 첨부
- [ ] primary/fallback RPC 전환과 disk 70%/85% alert 확인
- [ ] monitoring, backup, incident owner와 연락 경로 manifest에 기록
- [ ] 개인정보 처리/보존 기간과 이메일 수신 동의 검토 완료
- [ ] 미해결 Freeze 항목과 보안 high/critical 이슈 없음

## 현재 외부 실행 경계

저장소만으로는 Base Mainnet deployer key, production RPC, recovery key, 닷홈/Resend 자격 증명, GitHub Pages repository setting을 알 수 없다. 이 값이 제공되기 전에는 Mainnet 배포, explorer verify, production smoke, 실제 메일 발송을 완료로 표시하지 않는다.
