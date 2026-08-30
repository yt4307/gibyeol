"use client";

import styled from "@emotion/styled";
import Link from "next/link";
import { blockExplorerUrl } from "@/infrastructure/blockchain/config";
import type { InboxLetter } from "@features/data/inbox/inbox";

export type InboxListProps = {
  letters: readonly InboxLetter[];
  unlocked?: boolean;
  busy?: boolean;
  error?: string | null;
  openingLetterId?: string;
  onOpen: (letter: InboxLetter) => void;
  onRecover: (letter: InboxLetter) => void;
  onRetry?: () => void;
};

const short = (value: string) => `${value.slice(0, 8)}…${value.slice(-6)}`;

export function InboxList({ letters, unlocked = false, busy = false, error, openingLetterId, onOpen, onRecover, onRetry }: InboxListProps) {
  return <Panel>
    <Header><div><Label>받은 기별</Label><h2>도착한 기별 {letters.length}통</h2></div><State data-unlocked={unlocked || undefined}>{unlocked ? "개봉 가능" : "2026.12.25 개봉"}</State></Header>
    {error && <ErrorState role="alert"><div><strong>기별을 불러오지 못했어요.</strong><p>{error}</p></div>{onRetry && <RetryButton type="button" onClick={onRetry} disabled={busy}>다시 불러오기</RetryButton>}</ErrorState>}
    {!error && letters.length === 0 ? <Empty>
      <EmptySeal aria-hidden="true">✦</EmptySeal>
      <div><h3>{busy ? "우편함을 살펴보고 있어요." : "아직 도착한 기별이 없어요."}</h3><p>{busy ? "블록체인에 남겨진 봉인 기록을 차례로 확인하고 있습니다." : "누군가 이 지갑으로 기별을 보내면 이곳에 차곡차곡 쌓입니다."}</p></div>
      {!busy && <EmptyActions>{onRetry && <button type="button" onClick={onRetry}>새로고침</button>}<Link href="/send">기별 보내기</Link></EmptyActions>}
    </Empty> : !error && <List>{letters.map((letter) => {
      const opening = openingLetterId === letter.letterId;
      return <Item key={letter.letterId} aria-busy={opening}>
        <LetterSummary><Envelope aria-hidden="true">✦</Envelope><div><Meta>보낸 지갑</Meta><strong>{short(letter.sender)}</strong><p>{unlocked ? "봉인을 열 수 있어요." : "약속한 날까지 봉인되어 있어요."}</p></div></LetterSummary>
        <Actions><button disabled={!unlocked || busy} onClick={() => onOpen(letter)}>{opening ? "봉인을 여는 중…" : "패스키로 열기"}</button><button disabled={!unlocked || busy} onClick={() => onRecover(letter)}>패스키 분실 복구</button></Actions>
        <Details><summary>기별 기록 자세히 보기</summary><dl><div><dt>기별 번호</dt><dd>#{letter.letterId.slice(2, 10)}</dd></div><div><dt>메일박스 키</dt><dd>#{letter.recipientKeyId}</dd></div><div><dt>기록 블록</dt><dd>{letter.blockNumber.toLocaleString()}</dd></div></dl>{blockExplorerUrl && <a href={`${blockExplorerUrl}/tx/${letter.transactionHash}`} target="_blank" rel="noreferrer" aria-label="블록 탐색기에서 봉인 기록 보기, 새 창">블록 탐색기에서 확인</a>}</Details>
      </Item>;
    })}</List>}
  </Panel>;
}

const Panel = styled.section`display:grid;gap:var(--space-5);padding:clamp(var(--space-5),4vw,var(--space-8));background:linear-gradient(145deg,rgb(245 246 250 / 3%),transparent 38%),rgb(18 28 46 / 92%);border:1px solid var(--color-border);border-radius:4px;box-shadow:var(--shadow-surface);`;
const Header = styled.header`display:flex;justify-content:space-between;gap:var(--space-4);align-items:start;`;
const Label = styled.p`font-size:11px;font-weight:600;letter-spacing:.16em;color:var(--color-accent-primary);`;
const State = styled.span`padding:6px 10px;border:1px solid var(--color-border);border-radius:999px;background:rgb(217 199 163 / 7%);color:var(--color-text-muted);font-size:12px;font-weight:600;&[data-unlocked]{border-color:var(--color-accent-primary);color:var(--color-accent-primary);}`;
const ErrorState = styled.div`display:flex;align-items:center;justify-content:space-between;gap:var(--space-5);padding:var(--space-5);border:1px solid rgb(166 70 62 / 52%);background:rgb(166 70 62 / 8%);strong{color:#f3bbb6;}p{margin-top:var(--space-1);color:var(--color-text-muted);font-size:var(--font-size-100);line-height:1.55;}@media(max-width:560px){align-items:stretch;flex-direction:column;}`;
const RetryButton = styled.button`flex:0 0 auto;min-height:44px;padding:0 var(--space-4);border:1px solid var(--color-status-error);border-radius:3px;color:var(--color-text-primary);background:transparent;cursor:pointer;&:disabled{opacity:.55;}`;
const Empty = styled.div`display:grid;justify-items:center;gap:var(--space-4);padding:var(--space-12) var(--space-4);text-align:center;h3{font-family:var(--font-family-display);font-size:var(--font-size-400);font-weight:400;}p{max-width:460px;margin-top:var(--space-2);color:var(--color-text-muted);line-height:1.65;}`;
const EmptySeal = styled.span`display:grid;place-items:center;width:58px;height:58px;border:1px solid var(--color-accent-primary);border-radius:48% 52% 46% 54%;color:var(--color-accent-primary);font-size:24px;box-shadow:0 0 28px rgb(217 199 163 / 12%);`;
const EmptyActions = styled.div`display:flex;gap:var(--space-3);button,a{display:inline-flex;align-items:center;justify-content:center;min-height:44px;padding:0 var(--space-4);border:1px solid var(--color-border);border-radius:3px;color:var(--color-text-primary);background:transparent;cursor:pointer;}a{border-color:var(--color-accent-primary);color:var(--color-identity-midnight-navy);background:var(--color-accent-primary);}`;
const List = styled.ul`display:grid;gap:var(--space-3);list-style:none;`;
const Item = styled.li`position:relative;display:grid;grid-template-columns:1fr auto;gap:var(--space-4);align-items:center;padding:var(--space-5);border:1px solid var(--color-border);border-radius:3px;background:rgb(13 19 33 / 36%);&::before{position:absolute;top:-1px;bottom:-1px;left:-1px;width:2px;background:var(--color-accent-primary);content:"";opacity:.7;}@media(max-width:640px){grid-template-columns:1fr;}`;
const LetterSummary = styled.div`display:flex;align-items:center;gap:var(--space-4);strong{font-weight:600;}p{margin-top:4px;color:var(--color-text-muted);font-size:12px;}`;
const Envelope = styled.span`display:grid;place-items:center;width:42px;height:34px;border:1px solid var(--color-accent-primary);color:var(--color-accent-primary);font-size:13px;clip-path:polygon(0 0,100% 0,100% 100%,0 100%);`;
const Meta = styled.span`display:block;margin-bottom:3px;color:var(--color-text-muted);font-size:10px;letter-spacing:.1em;`;
const Actions = styled.div`display:flex;gap:var(--space-2);button{min-height:44px;padding:0 var(--space-3);border:1px solid var(--color-border);border-radius:3px;background:transparent;color:var(--color-text-muted);cursor:pointer;&:first-of-type:not(:disabled){color:var(--color-identity-midnight-navy);background:var(--color-accent-primary);border-color:var(--color-accent-primary);}&:disabled{opacity:.45;cursor:not-allowed;}}@media(max-width:520px){button{flex:1;}}`;
const Details = styled.details`grid-column:1/-1;padding-top:var(--space-3);border-top:1px solid var(--color-border);color:var(--color-text-muted);font-size:var(--font-size-100);summary{width:max-content;cursor:pointer;}dl{display:grid;gap:var(--space-2);margin-top:var(--space-3);}dl div{display:grid;grid-template-columns:110px 1fr;gap:var(--space-3);}dd{overflow-wrap:anywhere;color:var(--color-text-primary);}a{display:inline-block;margin-top:var(--space-3);color:var(--color-accent-primary);text-decoration:underline;text-underline-offset:3px;}`;
