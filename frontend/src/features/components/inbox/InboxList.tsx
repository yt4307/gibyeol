"use client";

import styled from "@emotion/styled";
import type { InboxLetter } from "@features/data/inbox/inbox";

export type InboxListProps = { letters: readonly InboxLetter[]; unlocked?: boolean; busy?: boolean; onOpen: (letter: InboxLetter) => void; onRecover: (letter: InboxLetter) => void };

export function InboxList({ letters, unlocked = false, busy, onOpen, onRecover }: InboxListProps) {
  return <Panel><Header><div><Label>INBOX</Label><h2>받은 기별 {letters.length}통</h2></div><State>{unlocked ? "도착함" : "2026.12.25 개봉"}</State></Header>
    {letters.length === 0 ? <Empty>{busy ? "체인 기록을 찾는 중…" : "아직 도착을 기다리는 기별이 없어요."}</Empty> : <List>{letters.map((letter) => <Item key={letter.letterId}><div><strong>{letter.sender.slice(0, 8)}…{letter.sender.slice(-6)}</strong><p>편지 #{letter.letterId.slice(2, 10)} · 키 #{letter.recipientKeyId}</p></div><Actions><button disabled={!unlocked || busy} onClick={() => onOpen(letter)}>Passkey로 열기</button><button disabled={!unlocked || busy} onClick={() => onRecover(letter)}>분실 복구</button></Actions></Item>)}</List>}
  </Panel>;
}
const Panel = styled.section`display:grid;gap:var(--space-5);padding:clamp(var(--space-5),4vw,var(--space-8));background:var(--color-neutral-100);border:1px solid var(--color-neutral-300);border-radius:20px;`;
const Header = styled.header`display:flex;justify-content:space-between;gap:var(--space-4);align-items:start;`;
const Label = styled.p`font-size:11px;font-weight:700;letter-spacing:.14em;color:var(--color-secondary-800);`;
const State = styled.span`padding:6px 10px;border-radius:999px;background:var(--color-secondary-100);color:var(--color-secondary-900);font-size:12px;font-weight:700;`;
const Empty = styled.p`padding:var(--space-12) var(--space-4);text-align:center;color:var(--color-text-muted);`;
const List = styled.ul`display:grid;gap:var(--space-3);list-style:none;`;
const Item = styled.li`display:flex;justify-content:space-between;gap:var(--space-4);align-items:center;padding:var(--space-4);border:1px solid var(--color-neutral-300);border-radius:12px;p{margin-top:4px;color:var(--color-text-muted);font-size:12px;}@media(max-width:640px){align-items:stretch;flex-direction:column;}`;
const Actions = styled.div`display:flex;gap:var(--space-2);button{min-height:38px;padding:0 var(--space-3);border:1px solid var(--color-neutral-400);border-radius:999px;background:white;cursor:pointer;&:disabled{opacity:.45;cursor:not-allowed;}}`;
