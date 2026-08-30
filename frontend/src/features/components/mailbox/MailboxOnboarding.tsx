"use client";

import styled from "@emotion/styled";

export type MailboxOnboardingProps = { keyId?: number | null; active?: boolean | null; busy?: boolean; error?: string | null; onRegister: () => void; onDeactivate: () => void };

export function MailboxOnboarding({ keyId, active, busy, error, onRegister, onDeactivate }: MailboxOnboardingProps) {
  const registered = Boolean(keyId);
  const checking = registered && active == null;
  const activeMailbox = registered && active === true;
  return <Panel>
    <div><Label>패스키 메일박스</Label><h3>{checking ? "메일박스 상태 확인 중" : activeMailbox ? `메일박스 키 #${keyId}` : registered ? "메일박스 비활성화됨" : "패스키로 받을 준비하기"}</h3><Copy>{registered && active === false ? "새 편지는 받을 수 없지만 기존 키와 블록체인 기록은 유지됩니다. 새 키를 만들면 다시 활성화할 수 있어요." : "개인키는 이 기기 밖으로 나가지 않고, 분실 복구 봉투는 약속한 날까지 시간 잠금으로 보호됩니다."}</Copy></div>
    {activeMailbox
      ? <DeactivateButton type="button" disabled={busy} onClick={onDeactivate}>{busy ? "비활성화 중…" : "메일박스 비활성화"}</DeactivateButton>
      : <Button type="button" disabled={busy || checking || activeMailbox} onClick={onRegister}>{busy ? "봉투 만드는 중…" : checking ? "상태 확인 중…" : activeMailbox ? "등록 완료" : registered ? "새 키로 다시 활성화" : "메일박스 만들기"}</Button>}
    {error && <ErrorText role="alert">{error}</ErrorText>}
  </Panel>;
}
const Panel = styled.section`display:grid; gap:var(--space-4); padding:var(--space-6); background:rgb(18 28 46 / 86%); border:1px solid var(--color-border); border-radius:4px;box-shadow:var(--shadow-surface);backdrop-filter:blur(18px);`;
const Label = styled.p`font-size:11px;font-weight:600;letter-spacing:.16em;color:var(--color-accent-primary);`;
const Copy = styled.p`margin-top:var(--space-2);color:var(--color-text-muted);line-height:1.6;`;
const Button = styled.button`justify-self:start;min-height:44px;padding:0 var(--space-5);border:1px solid var(--color-accent-primary);border-radius:3px;background:var(--color-accent-primary);color:var(--color-identity-midnight-navy);cursor:pointer;&:disabled{opacity:.55}`;
const DeactivateButton = styled(Button)`color:#e2a29c;background:rgb(166 70 62 / 8%);border-color:rgb(166 70 62 / 52%);`;
const ErrorText = styled.p`color:var(--color-status-error);`;
