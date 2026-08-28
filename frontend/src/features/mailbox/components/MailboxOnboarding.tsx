"use client";

import styled from "@emotion/styled";

export type MailboxOnboardingProps = { keyId?: number | null; busy?: boolean; error?: string | null; onRegister: () => void };

export function MailboxOnboarding({ keyId, busy, error, onRegister }: MailboxOnboardingProps) {
  return <Panel>
    <div><Label>PASSKEY MAILBOX</Label><h3>{keyId ? `메일박스 키 #${keyId}` : "Passkey로 받을 준비하기"}</h3><Copy>개인키는 이 기기 밖으로 나가지 않고, 분실 복구 봉투는 약속한 날까지 time lock으로 잠깁니다.</Copy></div>
    <Button type="button" disabled={busy || Boolean(keyId)} onClick={onRegister}>{keyId ? "등록 완료" : busy ? "봉투 만드는 중…" : "메일박스 만들기"}</Button>
    {error && <ErrorText role="alert">{error}</ErrorText>}
  </Panel>;
}
const Panel = styled.section`display:grid; gap:var(--space-4); padding:var(--space-6); background:var(--color-secondary-100); border:1px solid var(--color-secondary-300); border-radius:16px;`;
const Label = styled.p`font-size:11px;font-weight:700;letter-spacing:.14em;color:var(--color-secondary-800);`;
const Copy = styled.p`margin-top:var(--space-2);color:var(--color-text-muted);line-height:1.6;`;
const Button = styled.button`justify-self:start;min-height:44px;padding:0 var(--space-5);border:0;border-radius:999px;background:var(--color-secondary-800);color:white;cursor:pointer;&:disabled{opacity:.55}`;
const ErrorText = styled.p`color:var(--color-status-error);`;
