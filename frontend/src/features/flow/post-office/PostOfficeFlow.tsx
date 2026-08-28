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
  const mailbox = useMailboxOnboarding(wallet.session?.address);
  const email = useEmailRegistration(wallet.session?.address);
  return <Shell>
    <Top><BrandWordmark /><DateMark>CHRISTMAS POST · 2026</DateMark></Top>
    <Intro><Eyebrow>미래로 보내는 암호 편지</Eyebrow><h1>오늘의 마음을<br />약속한 날까지.</h1><p>지갑으로 본인을 확인하고, Passkey로 받을 준비를 한 뒤 기별을 안전하게 봉인해 보세요.</p></Intro>
    <Workspace>
      <WalletPanel address={wallet.session?.address} busy={wallet.busy} error={wallet.error} onConnect={() => { void wallet.connect(); }} />
      {wallet.session && <MailboxOnboarding keyId={mailbox.keyId} busy={mailbox.busy} error={mailbox.error} onRegister={() => { void mailbox.register(); }} />}
      {mailbox.keyId && mailbox.keyId > 0 && <EmailRegistration verified={email.verified} codeSent={email.codeSent} busy={email.busy} error={email.error} onRequestCode={(value) => { void email.requestCode(value); }} onVerifyCode={(value) => { void email.verifyCode(value); }} />}
      {mailbox.keyId && mailbox.keyId > 0 && email.verified && wallet.session ? <><Tabs aria-label="우체국 메뉴"><Link className={view === "send" ? "active" : ""} href="/send" aria-current={view === "send" ? "page" : undefined}>편지 보내기</Link><Link className={view === "inbox" ? "active" : ""} href="/inbox" aria-current={view === "inbox" ? "page" : undefined}>받은 기별</Link></Tabs>{view === "send" ? <SendFlow address={wallet.session.address} /> : <InboxFlow address={wallet.session.address} />}</> : wallet.session && <Hint>{mailbox.keyId && mailbox.keyId > 0 ? "이메일 인증을 마치면 편지를 보내고 받을 수 있어요." : "편지를 보내고 받으려면 먼저 메일박스를 만들어 주세요."}</Hint>}
    </Workspace>
  </Shell>;
}
const Shell = styled.main`min-height:100vh;padding:var(--space-6) clamp(var(--space-4),5vw,var(--space-16)) var(--space-16);background:radial-gradient(circle at 88% 4%,rgb(220 232 255 / 80%),transparent 27%),var(--color-app-background);`;
const Top = styled.header`display:flex;justify-content:space-between;align-items:center;width:min(100%,1100px);margin:0 auto;`;
const DateMark = styled.span`font-size:11px;font-weight:700;letter-spacing:.14em;color:var(--color-text-muted);`;
const Intro = styled.section`width:min(100%,1100px);margin:clamp(70px,12vh,130px) auto var(--space-12);h1{margin-top:var(--space-4);font-size:clamp(2.8rem,7vw,6rem);font-weight:300;line-height:1;letter-spacing:-.07em;}p{max-width:560px;margin-top:var(--space-6);color:var(--color-text-muted);font-size:var(--font-size-300);line-height:1.7;}`;
const Eyebrow = styled.p`font-size:12px!important;font-weight:700;letter-spacing:.14em;color:var(--color-brand-800)!important;`;
const Workspace = styled.div`display:grid;gap:var(--space-5);width:min(100%,900px);margin:0 auto;`;
const Tabs = styled.nav`display:flex;gap:var(--space-2);padding:4px;background:var(--color-neutral-200);border-radius:999px;a{display:flex;flex:1;align-items:center;justify-content:center;min-height:42px;border-radius:999px;background:transparent;&.active{background:white;box-shadow:0 2px 8px rgb(17 17 15 / 8%);font-weight:700;}}`;
const Hint = styled.p`padding:var(--space-8);text-align:center;color:var(--color-text-muted);border:1px dashed var(--color-neutral-500);border-radius:16px;`;
