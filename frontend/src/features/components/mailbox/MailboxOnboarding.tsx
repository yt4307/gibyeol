"use client";

import styled from "@emotion/styled";
import { useEffect, useRef, useState } from "react";
import type { MailboxOperationStage } from "@features/hooks/mailbox/use-mailbox-onboarding";

export type MailboxOnboardingProps = { keyId?: number | null; active?: boolean | null; busy?: boolean; stage?: MailboxOperationStage; walletAppAvailable?: boolean; error?: string | null; onRegister: () => void; onDeactivate: () => void; onOpenWallet?: () => void };

const stageMessages: Record<Exclude<MailboxOperationStage, null>, string> = {
  "creating-passkey": "기기에서 패스키를 만들고 있어요.",
  "locking-recovery": "복구 봉투를 약속한 날까지 잠그고 있어요.",
  "awaiting-wallet": "지갑에서 메일박스 등록을 승인해 주세요.",
  "confirming-registration": "블록체인에서 메일박스 등록을 확인하고 있어요.",
  deactivating: "지갑에서 메일박스 비활성화를 승인해 주세요.",
  "confirming-deactivation": "블록체인에서 비활성화를 확인하고 있어요.",
};

export function MailboxOnboarding({ keyId, active, busy, stage, walletAppAvailable, error, onRegister, onDeactivate, onOpenWallet }: MailboxOnboardingProps) {
  const [confirmingDeactivate, setConfirmingDeactivate] = useState(false);
  const confirmRef = useRef<HTMLDivElement>(null);
  useEffect(() => { if (confirmingDeactivate) confirmRef.current?.focus(); }, [confirmingDeactivate]);
  const registered = Boolean(keyId);
  const checking = registered && active == null;
  const activeMailbox = registered && active === true;
  return <Panel>
    <div><Label>패스키 메일박스</Label><h3>{checking ? "메일박스 상태 확인 중" : activeMailbox ? `메일박스 키 #${keyId}` : registered ? "메일박스 비활성화됨" : "패스키로 받을 준비하기"}</h3><Copy>{registered && active === false ? "새 편지는 받을 수 없지만 기존 키와 블록체인 기록은 유지됩니다. 새 키를 만들면 다시 활성화할 수 있어요." : "개인키는 이 기기 밖으로 나가지 않고, 분실 복구 봉투는 약속한 날까지 시간 잠금으로 보호됩니다."}</Copy></div>
    {activeMailbox
      ? <DeactivateButton type="button" disabled={busy} onClick={() => setConfirmingDeactivate(true)}>{busy ? "비활성화 중…" : "메일박스 비활성화"}</DeactivateButton>
      : <Button type="button" disabled={busy || checking || activeMailbox} onClick={onRegister}>{busy ? stage === "awaiting-wallet" ? "지갑 승인 대기 중…" : "봉투 만드는 중…" : stage === "awaiting-wallet" ? "지갑에서 등록 승인하기" : checking ? "상태 확인 중…" : activeMailbox ? "등록 완료" : registered ? "새 키로 다시 활성화" : "메일박스 만들기"}</Button>}
    {confirmingDeactivate && <Confirm ref={confirmRef} tabIndex={-1} role="alertdialog" aria-labelledby="deactivate-title" aria-describedby="deactivate-description">
      <div><strong id="deactivate-title">새 기별 받기를 멈출까요?</strong><p id="deactivate-description">기존 기별과 키는 유지되지만, 다시 활성화하기 전까지 새 기별을 받을 수 없습니다.</p></div>
      <ConfirmActions><CancelButton type="button" onClick={() => setConfirmingDeactivate(false)} disabled={busy}>계속 사용</CancelButton><ConfirmButton type="button" onClick={() => { setConfirmingDeactivate(false); onDeactivate(); }} disabled={busy}>비활성화</ConfirmButton></ConfirmActions>
    </Confirm>}
    {(busy || stage === "awaiting-wallet") && <StatusText role="status" aria-live="polite">{stage ? stageMessages[stage] : activeMailbox ? "메일박스를 비활성화하고 있어요." : registered ? "새 키로 메일박스를 활성화하고 있어요." : "패스키와 복구 봉투를 만들고 있어요."}</StatusText>}
    {busy && walletAppAvailable && (stage === "awaiting-wallet" || stage === "deactivating") && <OpenWalletButton type="button" onClick={onOpenWallet}>지갑 앱 열기</OpenWalletButton>}
    {error && <ErrorText role="alert">{error}</ErrorText>}
  </Panel>;
}
const Panel = styled.section`display:grid; gap:var(--space-4); padding:var(--space-6); background:rgb(18 28 46 / 86%); border:1px solid var(--color-border); border-radius:4px;box-shadow:var(--shadow-surface);backdrop-filter:blur(18px);`;
const Label = styled.p`font-size:11px;font-weight:600;letter-spacing:.16em;color:var(--color-accent-primary);`;
const Copy = styled.p`margin-top:var(--space-2);color:var(--color-text-muted);line-height:1.6;`;
const Button = styled.button`justify-self:start;min-height:44px;padding:0 var(--space-5);border:1px solid var(--color-accent-primary);border-radius:3px;background:var(--color-accent-primary);color:var(--color-identity-midnight-navy);cursor:pointer;&:disabled{opacity:.55}`;
const DeactivateButton = styled(Button)`color:#e2a29c;background:rgb(166 70 62 / 8%);border-color:rgb(166 70 62 / 52%);`;
const OpenWalletButton = styled(Button)`background:transparent;color:var(--color-accent-primary);`;
const Confirm = styled.div`display:grid;gap:var(--space-4);padding:var(--space-4);border:1px solid rgb(166 70 62 / 52%);border-radius:3px;background:rgb(166 70 62 / 8%);strong{color:var(--color-text-primary);}p{margin-top:var(--space-1);color:var(--color-text-muted);font-size:var(--font-size-100);line-height:1.55;}`;
const ConfirmActions = styled.div`display:flex;gap:var(--space-2);flex-wrap:wrap;`;
const CancelButton = styled.button`min-height:44px;padding:0 var(--space-4);border:1px solid var(--color-border);border-radius:3px;color:var(--color-text-primary);background:transparent;cursor:pointer;`;
const ConfirmButton = styled(CancelButton)`border-color:var(--color-status-error);color:#f3bbb6;background:rgb(166 70 62 / 12%);`;
const StatusText = styled.p`color:var(--color-accent-primary);font-size:var(--font-size-100);`;
const ErrorText = styled.p`color:var(--color-status-error);&::before{margin-right:var(--space-2);content:"⚠";}`;
