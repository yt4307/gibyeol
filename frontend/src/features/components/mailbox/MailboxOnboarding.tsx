"use client";

import styled from "@emotion/styled";

export type MailboxOnboardingProps = { keyId?: number | null; active?: boolean | null; busy?: boolean; error?: string | null; onRegister: () => void; onDeactivate: () => void };

export function MailboxOnboarding({ keyId, active, busy, error, onRegister, onDeactivate }: MailboxOnboardingProps) {
  const registered = Boolean(keyId);
  const checking = registered && active == null;
  const activeMailbox = registered && active === true;
  return <Panel>
    <div><Label>PASSKEY MAILBOX</Label><h3>{checking ? "메일박스 상태 확인 중" : activeMailbox ? `메일박스 키 #${keyId}` : registered ? "메일박스 비활성화됨" : "Passkey로 받을 준비하기"}</h3><Copy>{registered && active === false ? "새 편지는 받을 수 없지만 기존 키와 온체인 기록은 유지됩니다. 새 키를 만들면 다시 활성화할 수 있어요." : "개인키는 이 기기 밖으로 나가지 않고, 분실 복구 봉투는 약속한 날까지 time lock으로 잠깁니다."}</Copy></div>
    {activeMailbox
      ? <DeactivateButton type="button" disabled={busy} onClick={onDeactivate}>{busy ? "비활성화 중…" : "메일박스 비활성화"}</DeactivateButton>
      : <Button type="button" disabled={busy || checking || activeMailbox} onClick={onRegister}>{busy ? "봉투 만드는 중…" : checking ? "상태 확인 중…" : activeMailbox ? "등록 완료" : registered ? "새 키로 다시 활성화" : "메일박스 만들기"}</Button>}
    {error && <ErrorText role="alert">{error}</ErrorText>}
  </Panel>;
}
const Panel = styled.section`display:grid; gap:var(--space-4); padding:var(--space-6); background:var(--color-secondary-100); border:1px solid var(--color-secondary-300); border-radius:16px;`;
const Label = styled.p`font-size:11px;font-weight:700;letter-spacing:.14em;color:var(--color-secondary-800);`;
const Copy = styled.p`margin-top:var(--space-2);color:var(--color-text-muted);line-height:1.6;`;
const Button = styled.button`justify-self:start;min-height:44px;padding:0 var(--space-5);border:0;border-radius:999px;background:var(--color-secondary-800);color:white;cursor:pointer;&:disabled{opacity:.55}`;
const DeactivateButton = styled(Button)`color:var(--color-text);background:transparent;border:1px solid var(--color-neutral-500);`;
const ErrorText = styled.p`color:var(--color-status-error);`;
