"use client";

import styled from "@emotion/styled";
import Link from "next/link";
import { BrandWordmark } from "@features/components/home/BrandWordmark";
import { InboxFlow } from "@features/flow/inbox/InboxFlow";
import { MailboxOnboarding } from "@features/components/mailbox/MailboxOnboarding";
import { EmailRegistration } from "@features/components/mailbox/EmailRegistration";
import { useEmailRegistration } from "@features/hooks/mailbox/use-email-registration";
import { useMailboxOnboarding } from "@features/hooks/mailbox/use-mailbox-onboarding";
import { SendFlow } from "@features/flow/send/SendFlow";
import { WalletPanel } from "@features/components/wallet/WalletPanel";
import { useWalletSession } from "@features/hooks/wallet/use-wallet-session";

export type PostOfficeFlowProps = {
  view?: "send" | "inbox";
};

export function PostOfficeFlow({ view = "send" }: PostOfficeFlowProps) {
  const wallet = useWalletSession();
  const authenticatedAddress = wallet.authenticated ? wallet.session?.address : undefined;
  const mailbox = useMailboxOnboarding(authenticatedAddress);
  const email = useEmailRegistration(authenticatedAddress);
  const mailboxReady = Boolean(mailbox.keyId && mailbox.keyId > 0 && mailbox.active);
  return <Shell>
    <Top><Link href="/"><BrandWordmark /></Link><DateMark>CHRISTMAS POST · 2026</DateMark></Top>
    <Intro>
      <Eyebrow>시간을 건너는 디지털 우체국</Eyebrow>
      <IntroTitle aria-label="오늘의 마음을 별빛 아래 봉인합니다.">
        <IntroTitlePhrase>오늘의 마음을</IntroTitlePhrase>
        <IntroTitlePhrase>별빛 아래 봉인합니다.</IntroTitlePhrase>
      </IntroTitle>
      <p>지갑으로 본인을 확인하고, Passkey로 받을 준비를 한 뒤 기별을 안전하게 봉인해 보세요.</p>
    </Intro>
    <Workspace>
      <WalletPanel
        address={wallet.session?.address}
        availableAccounts={wallet.availableAccounts}
        busy={wallet.busy}
        pendingAction={wallet.pendingAction}
        restoring={wallet.restoring}
        error={wallet.error}
        onConnect={() => { void wallet.connect().catch(() => undefined); }}
        onSelectAccount={(address) => { void wallet.selectAccount(address).catch(() => undefined); }}
        onCancelAccountSelection={wallet.cancelAccountSelection}
        onChangeAccount={() => { void wallet.changeAccount().catch(() => undefined); }}
        onChangeWallet={() => { void wallet.changeWallet().catch(() => undefined); }}
        onLogout={() => { void wallet.logout(); }}
      />
      {authenticatedAddress && <MailboxOnboarding keyId={mailbox.keyId} active={mailbox.active} busy={mailbox.busy} error={mailbox.error} onRegister={() => { void mailbox.register(); }} onDeactivate={() => { void mailbox.deactivate(); }} />}
      {mailboxReady && <EmailRegistration verified={email.verified} codeSent={email.codeSent} busy={email.busy} error={email.error} onRequestCode={(value) => { void email.requestCode(value); }} onVerifyCode={(value) => { void email.verifyCode(value); }} />}
      {mailboxReady && email.verified && authenticatedAddress ? <><Tabs aria-label="우체국 메뉴"><Link className={view === "send" ? "active" : ""} href="/send" aria-current={view === "send" ? "page" : undefined}>편지 보내기</Link><Link className={view === "inbox" ? "active" : ""} href="/inbox" aria-current={view === "inbox" ? "page" : undefined}>받은 기별</Link></Tabs>{view === "send" ? <SendFlow address={authenticatedAddress} /> : <InboxFlow address={authenticatedAddress} />}</> : authenticatedAddress && <Hint>{mailbox.keyId && mailbox.keyId > 0 ? mailbox.active ? "이메일 인증을 마치면 편지를 보내고 받을 수 있어요." : "메일박스를 다시 활성화하면 편지를 보내고 받을 수 있어요." : "편지를 보내고 받으려면 먼저 메일박스를 만들어 주세요."}</Hint>}
    </Workspace>
  </Shell>;
}
const Shell = styled.main`
  position:relative;min-height:100vh;overflow:hidden;padding:var(--space-6) clamp(var(--space-4),5vw,var(--space-16)) var(--space-16);
  background:radial-gradient(circle at 84% 8%,rgb(217 199 163 / 8%),transparent 25%),radial-gradient(circle at 12% 16%,rgb(41 59 91 / 42%),transparent 32%),linear-gradient(160deg,var(--color-identity-midnight-navy),#090f1b 82%);
  &::before{position:absolute;inset:0;pointer-events:none;background-image:radial-gradient(circle,rgb(245 246 250 / 58%) 0 1px,transparent 1.3px);background-size:151px 151px;content:"";opacity:.13;mask-image:linear-gradient(to bottom,black,transparent 62%);}
`;
const Top = styled.header`position:relative;z-index:1;display:flex;justify-content:space-between;align-items:center;width:min(100%,1100px);margin:0 auto;`;
const DateMark = styled.span`font-size:10px;font-weight:500;letter-spacing:.2em;color:var(--color-accent-primary);@media(max-width:480px){display:none;}`;
const Intro = styled.section`position:relative;z-index:1;width:min(100%,1100px);margin:clamp(64px,11vh,120px) auto var(--space-12);p{max-width:560px;margin-top:var(--space-6);color:var(--color-text-muted);font-size:var(--font-size-300);line-height:1.7;word-break:keep-all;}`;
const Eyebrow = styled.p`font-size:12px!important;font-weight:500;letter-spacing:.17em;color:var(--color-accent-primary)!important;`;
const IntroTitle = styled.h1`
  display:flex;
  flex-wrap:wrap;
  column-gap:.24em;
  max-width:760px;
  margin-top:var(--space-4);
  font-family:var(--font-family-display);
  font-size:clamp(2.2rem,5vw,4.5rem);
  font-weight:400;
  line-height:1.12;
  letter-spacing:-.055em;

  @media(max-width:340px){font-size:1.7rem;}
`;
const IntroTitlePhrase = styled.span`white-space:nowrap;`;
const Workspace = styled.div`position:relative;z-index:1;display:grid;gap:var(--space-5);width:min(100%,900px);margin:0 auto;`;
const Tabs = styled.nav`display:flex;gap:2px;padding:3px;background:rgb(245 246 250 / 4%);border:1px solid var(--color-border);border-radius:4px;a{display:flex;flex:1;align-items:center;justify-content:center;min-height:44px;color:var(--color-text-muted);border-radius:2px;background:transparent;transition:color 160ms ease,background 160ms ease;&.active{color:var(--color-identity-midnight-navy);background:var(--color-accent-primary);font-weight:600;}}`;
const Hint = styled.p`padding:var(--space-8);text-align:center;color:var(--color-text-muted);background:rgb(18 28 46 / 72%);border:1px dashed var(--color-border-strong);border-radius:4px;`;
