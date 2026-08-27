# 운영 작업 Runbook

이 문서는 production scheduler와 장애 시 수동 재실행 절차를 정의한다. 모든 명령은 동일한 release 이미지와 production 환경 변수를 사용한다.

## 필수 환경값

- `BASE_RPC_URL`, `BASE_RPC_FALLBACK_URL`: 서로 다른 공급자의 Base RPC
- `GIBYEOL_CONTRACT_ADDRESS`, `CONTRACT_DEPLOYMENT_BLOCK`
- `SAFE_BLOCK_CONFIRMATIONS`: production 기본값 `64`
- `PACKAGE_STORAGE_PATH`, `ORPHAN_MIN_AGE_SECONDS`: 기본 보존 유예 `259200`초
- `EMAIL_*`, `RESEND_*`, `UNLOCK_AT`

RPC URL에는 API key가 포함될 수 있으므로 명령 출력과 alert 본문에 URL 원문을 넣지 않는다.

## Scheduler

KST 기준 예시다. scheduler가 중복 호출해도 flock과 DB claim이 동시 실행을 막는다.

```cron
7 * * * * cd /srv/gibyeol/backend && php bin/console app:maintenance:cleanup
17 * * * * cd /srv/gibyeol/backend && php bin/console app:packages:gc >> var/log/orphan-gc-report.log 2>&1
*/5 * * * * cd /srv/gibyeol/backend && php bin/console app:postman:christmas-2026 >> var/log/postman.log 2>&1
```

Postman은 `UNLOCK_AT` 이전 호출을 실패 처리한다. 2026-12-25 00:00 KST 이후 처음 성공한 실행부터 recipient별 unique claim을 만들며, 실패 row만 지수 backoff 후 다시 claim한다. Resend idempotency key는 `gibyeol/christmas-2026/{lowercase wallet}`로 고정된다.

## Orphan GC

1. `php bin/console app:packages:gc`를 실행해 JSON 보고서를 보관한다.
2. `safeBlock`, 후보 수, 총 byte를 확인하고 RPC gap/reorg alert가 없는지 확인한다.
3. 보고서를 두 번째 운영자가 승인한 뒤 같은 release와 환경에서 `php bin/console app:packages:gc --apply`를 실행한다.
4. 정상 package download smoke를 수행한다.

RPC endpoint가 하나라도 전체 safe range를 완전하게 읽지 못하면 해당 endpoint 결과를 버리고 fallback에서 처음부터 다시 읽는다. 모든 endpoint가 실패하면 파일을 하나도 삭제하지 않는다.

## Postman 재실행

1. `notifications`의 `failed`, `claimed`(15분 초과), `sent`, `delivered` 수를 확인한다.
2. Resend 장애가 해소된 뒤 같은 명령을 다시 실행한다. 새 wallet은 `pending`, 실패 wallet은 `next_retry_at` 이후에만 claim된다.
3. 중복 실행 후 wallet별 row가 하나인지, provider id가 유지되는지 확인한다.
4. webhook 서명 실패율 또는 bounce 비율이 임계치를 넘으면 scheduler를 중단하고 원인을 확인한다.

## Backup과 restore rehearsal

매일 MySQL consistent dump와 package volume snapshot을 같은 시점 label로 생성하고 별도 저장소에 암호화 보관한다. 분기별로 격리된 rehearsal 환경에서 다음을 확인한다.

1. 새 MySQL instance에 dump를 restore하고 migration status가 최신인지 확인한다.
2. package snapshot을 빈 volume에 restore한다.
3. 임의 SHA-256 10건의 파일 hash와 `GET/HEAD`를 검증한다.
4. 알림 row count, mailbox count, 마지막 safe block을 원본 보고서와 비교한다.
5. rehearsal 환경에서는 `EMAIL_PROVIDER=null`로 두어 실제 메일을 차단한다.

Production DB나 package volume을 restore 대상으로 사용하지 않는다. 실제 복구는 incident commander와 백업 담당자의 이중 승인 후 진행한다.

## Alert 기준

- health endpoint 실패 또는 DB connection 실패
- 두 RPC 모두 실패, log page malformed, safe head가 deployment block보다 이전
- package write 실패, filesystem 사용량 70% 경고/85% 긴급
- Postman failure 비율 5% 초과 또는 15분 이상 `claimed`
- webhook signature 실패 급증, Resend bounce 비율 5% 초과

장애 중에는 GC `--apply`를 실행하지 않는다. RPC failover 후에는 dry-run 보고서부터 새로 만든다.
