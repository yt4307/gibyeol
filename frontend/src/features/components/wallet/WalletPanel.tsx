"use client";

import styled from "@emotion/styled";
import type { WalletPendingAction } from "@features/hooks/wallet/use-wallet-session";

export type WalletPanelProps = {
  address?: string;
  busy?: boolean;
  pendingAction?: WalletPendingAction;
  restoring?: boolean;
  error?: string | null;
  onConnect: () => void;
  onChangeWallet: () => void;
  onLogout: () => void;
};

export function WalletPanel({ address, busy = false, pendingAction = null, restoring = false, error, onConnect, onChangeWallet, onLogout }: WalletPanelProps) {
  return (
    <Panel>
      <div>
        <Label>WALLET &amp; SIWE</Label>
        <Value>{address
          ? `${address.slice(0, 8)}…${address.slice(-6)}`
          : restoring ? "로그인 상태를 불러오는 중이에요" : "지갑 연결이 필요해요"}</Value>
      </div>
      <Actions>
        {address && <SecondaryButton type="button" onClick={onLogout} disabled={busy || restoring}>
          {pendingAction === "logout" ? "로그아웃 중…" : "로그아웃"}
        </SecondaryButton>}
        <Button type="button" onClick={address ? onChangeWallet : onConnect} disabled={busy || restoring}>
          {restoring
            ? "세션 확인 중…"
            : address
              ? pendingAction === "change" ? "지갑 변경 중…" : "지갑 변경"
              : pendingAction === "connect" ? "서명 확인 중…" : "지갑 연결"}
        </Button>
      </Actions>
      {!address && !restoring && <HelpText>모바일에서는 설치된 지갑 앱을 선택해 연결할 수 있어요.</HelpText>}
      {error && <ErrorText role="alert">{error}</ErrorText>}
    </Panel>
  );
}

const Panel = styled.section`
  display: grid; grid-template-columns: 1fr auto; gap: var(--space-3); align-items: center;
  padding: var(--space-5); background: var(--color-neutral-100); border: 1px solid var(--color-neutral-300); border-radius: 16px;
`;
const Label = styled.p`font-size: 11px; font-weight: 700; letter-spacing: .14em; color: var(--color-text-muted);`;
const Value = styled.p`margin-top: var(--space-2); font-weight: 500;`;
const Actions = styled.div`display:flex;gap:var(--space-2);align-items:center;@media(max-width:480px){grid-column:1/-1;width:100%;button{flex:1;}}`;
const Button = styled.button`min-height: 42px; padding: 0 var(--space-5); border: 0; border-radius: 999px; color: white; background: var(--color-neutral-1300); cursor: pointer; &:disabled { opacity: .55; cursor: default; }`;
const SecondaryButton = styled(Button)`color:var(--color-text);background:transparent;border:1px solid var(--color-neutral-400);`;
const HelpText = styled.p`grid-column: 1 / -1; color: var(--color-text-muted); font-size: var(--font-size-100);`;
const ErrorText = styled.p`grid-column: 1 / -1; color: var(--color-status-error); font-size: var(--font-size-100);`;
