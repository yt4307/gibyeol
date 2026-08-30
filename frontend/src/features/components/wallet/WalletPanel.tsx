"use client";

import styled from "@emotion/styled";
import type { WalletPendingAction, WalletProgress } from "@features/hooks/wallet/use-wallet-session";

export type WalletPanelProps = {
  address?: string;
  availableAccounts?: readonly string[];
  pendingSignatureAddress?: string;
  busy?: boolean;
  pendingAction?: WalletPendingAction;
  walletProgress?: WalletProgress;
  restoring?: boolean;
  error?: string | null;
  onConnect: () => void;
  onContinueSignature: () => void;
  onSelectAccount: (address: string) => void;
  onCancelAccountSelection: () => void;
  onChangeAccount: () => void;
  onChangeWallet: () => void;
  onLogout: () => void;
};

function shortAddress(address: string): string {
  return `${address.slice(0, 8)}…${address.slice(-6)}`;
}

export function WalletPanel({
  address,
  availableAccounts = [],
  pendingSignatureAddress,
  busy = false,
  pendingAction = null,
  walletProgress = null,
  restoring = false,
  error,
  onConnect,
  onContinueSignature,
  onSelectAccount,
  onCancelAccountSelection,
  onChangeAccount,
  onChangeWallet,
  onLogout,
}: WalletPanelProps) {
  const selectingAccount = availableAccounts.length > 1;

  return (
    <Panel>
      <div>
        <Label>WALLET &amp; SIWE</Label>
        <Value>{address
          ? shortAddress(address)
          : pendingSignatureAddress ? `연결한 지갑 ${shortAddress(pendingSignatureAddress)}`
          : restoring ? "로그인 상태를 불러오는 중이에요" : "지갑 연결이 필요해요"}</Value>
      </div>
      <Actions>
        {address ? <>
          <TextButton type="button" onClick={onLogout} disabled={busy || restoring}>
            {pendingAction === "logout" ? "로그아웃 중…" : "로그아웃"}
          </TextButton>
          <SecondaryButton type="button" onClick={onChangeWallet} disabled={busy || restoring}>
            {pendingAction === "change" ? "지갑 변경 중…" : "다른 지갑"}
          </SecondaryButton>
          <Button type="button" onClick={onChangeAccount} disabled={busy || restoring}>
            {pendingAction === "account" ? "계정 확인 중…" : "계정 변경"}
          </Button>
        </> : pendingSignatureAddress
          ? <Button type="button" onClick={onContinueSignature} disabled={busy || restoring}>
            {busy
              ? walletProgress === "signature" ? "지갑에서 서명 승인 대기 중…"
                : walletProgress === "verify" ? "로그인 확인 중…"
                  : "서명 요청 준비 중…"
              : "지갑에서 서명하기"}
          </Button>
          : <Button type="button" onClick={onConnect} disabled={busy || restoring || selectingAccount}>
            {restoring
              ? "세션 확인 중…"
              : pendingAction === "connect" ? "지갑 연결 중…" : "지갑 연결"}
          </Button>}
      </Actions>
      {selectingAccount && <AccountChooser aria-labelledby="wallet-account-title">
        <AccountChooserHeader>
          <div>
            <AccountTitle id="wallet-account-title">로그인할 계정 선택</AccountTitle>
            <AccountHint>지갑에서 공유를 허용한 계정만 표시돼요.</AccountHint>
          </div>
          <CancelButton type="button" onClick={onCancelAccountSelection} disabled={busy}>취소</CancelButton>
        </AccountChooserHeader>
        <AccountList>
          {availableAccounts.map((account, index) => <li key={account}>
            <AccountButton
              type="button"
              onClick={() => onSelectAccount(account)}
              disabled={busy}
              aria-label={`${index + 1}번 계정 ${account}으로 로그인`}
            >
              <AccountIndex aria-hidden="true">{String(index + 1).padStart(2, "0")}</AccountIndex>
              <span>{shortAddress(account)}</span>
              <AccountAction aria-hidden="true">선택</AccountAction>
            </AccountButton>
          </li>)}
        </AccountList>
      </AccountChooser>}
      {!address && !restoring && <HelpText>{pendingSignatureAddress
        ? "연결이 완료되었습니다. 버튼을 누른 뒤 지갑 앱에서 로그인 서명을 승인해 주세요."
        : "모바일에서는 설치된 지갑 앱을 선택해 연결할 수 있어요."}</HelpText>}
      {error && <ErrorText role="alert">{error}</ErrorText>}
    </Panel>
  );
}

const Panel = styled.section`
  display: grid; grid-template-columns: 1fr auto; gap: var(--space-3); align-items: center;
  padding: var(--space-5); background: rgb(18 28 46 / 86%); border: 1px solid var(--color-border); border-radius: 4px; box-shadow:var(--shadow-surface);backdrop-filter:blur(18px);
`;
const Label = styled.p`font-size: 11px; font-weight: 700; letter-spacing: .14em; color: var(--color-text-muted);`;
const Value = styled.p`margin-top: var(--space-2); font-weight: 500;`;
const Actions = styled.div`display:flex;flex-wrap:wrap;gap:var(--space-2);align-items:center;justify-content:flex-end;@media(max-width:600px){grid-column:1/-1;width:100%;button{flex:1;}}`;
const Button = styled.button`min-height: 42px; padding: 0 var(--space-5); border: 1px solid var(--color-accent-primary); border-radius: 3px; color: var(--color-identity-midnight-navy); background: var(--color-accent-primary); cursor: pointer; transition:filter 160ms ease;&:hover{filter:brightness(1.08)} &:disabled { opacity: .55; cursor: default; }`;
const SecondaryButton = styled(Button)`color:var(--color-text-muted);background:transparent;border-color:var(--color-border);`;
const TextButton = styled(SecondaryButton)`border-color:transparent;`;
const AccountChooser = styled.div`grid-column:1/-1;padding-top:var(--space-4);border-top:1px solid var(--color-border);`;
const AccountChooserHeader = styled.div`display:flex;align-items:flex-start;justify-content:space-between;gap:var(--space-4);`;
const AccountTitle = styled.p`font-family:var(--font-family-display);font-size:var(--font-size-300);color:var(--color-text-primary);`;
const AccountHint = styled.p`margin-top:var(--space-1);font-size:var(--font-size-100);color:var(--color-text-muted);`;
const CancelButton = styled.button`min-height:36px;padding:0 var(--space-3);border:0;color:var(--color-text-muted);background:transparent;cursor:pointer;&:disabled{opacity:.55;cursor:default;}`;
const AccountList = styled.ul`display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:var(--space-2);margin-top:var(--space-4);list-style:none;`;
const AccountButton = styled.button`display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:var(--space-3);width:100%;min-height:52px;padding:0 var(--space-4);text-align:left;color:var(--color-text-primary);background:rgb(245 246 250 / 4%);border:1px solid var(--color-border);border-radius:3px;cursor:pointer;transition:border-color 160ms ease,background 160ms ease;&:hover,&:focus-visible{border-color:var(--color-accent-primary);background:rgb(217 199 163 / 9%)}&:disabled{opacity:.55;cursor:default;}`;
const AccountIndex = styled.span`font-size:10px;letter-spacing:.12em;color:var(--color-accent-primary);`;
const AccountAction = styled.span`font-size:var(--font-size-100);color:var(--color-text-muted);`;
const HelpText = styled.p`grid-column: 1 / -1; color: var(--color-text-muted); font-size: var(--font-size-100);`;
const ErrorText = styled.p`grid-column: 1 / -1; color: var(--color-status-error); font-size: var(--font-size-100);`;
