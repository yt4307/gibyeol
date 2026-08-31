"use client";

import { keyframes } from "@emotion/react";
import styled from "@emotion/styled";
import { GibyeolMark } from "@features/components/brand/GibyeolMark";

export type ChristmasArrivalProps = {
  letterCount: number;
  busy?: boolean;
  onOpenFirst: () => void;
};

export function ChristmasArrival({ letterCount, busy = false, onOpenFirst }: ChristmasArrivalProps) {
  if (letterCount < 1) return null;

  return <Arrival aria-labelledby="christmas-arrival-title">
    <Postmark><span>2026.12.25</span><span>봉인 해제</span></Postmark>
    <Copy>
      <Eyebrow>약속한 날이 되었습니다</Eyebrow>
      <Title id="christmas-arrival-title" aria-label="시간을 건너, 기별이 닿았습니다."><span>시간을 건너,</span><span>기별이 닿았습니다.</span></Title>
      <Description>별빛 아래 기다리던 기별 {letterCount}통의 봉인이 풀렸어요. 가장 먼저 도착한 마음부터 천천히 열어보세요.</Description>
      <Actions>
        <OpenButton type="button" onClick={onOpenFirst} disabled={busy}>{busy ? "봉인을 여는 중…" : "첫 기별 열기"}</OpenButton>
        <PasskeyNote>연결했던 패스키로 안전하게 엽니다.</PasskeyNote>
      </Actions>
    </Copy>
    <SymbolStage aria-hidden="true">
      <Orbit />
      <Glow />
      <AnimatedMark variant="open" size={280} priority />
    </SymbolStage>
  </Arrival>;
}

const reveal = keyframes`
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
`;
const starlight = keyframes`
  0%, 100% { opacity: .48; transform: translate(-50%, -50%) scale(.92); }
  50% { opacity: .88; transform: translate(-50%, -50%) scale(1.08); }
`;

const Arrival = styled.section`
  position:relative;
  display:grid;
  grid-template-columns:minmax(0,1.15fr) minmax(240px,.85fr);
  min-height:400px;
  overflow:hidden;
  border:1px solid rgb(217 199 163 / 46%);
  border-radius:4px;
  background:
    linear-gradient(110deg,rgb(13 19 33 / 12%),rgb(13 19 33 / 74%)),
    radial-gradient(circle at 82% 44%,rgb(217 199 163 / 15%),transparent 31%),
    var(--color-identity-deep-blue);
  box-shadow:0 32px 100px rgb(0 0 0 / 35%),inset 0 0 80px rgb(217 199 163 / 3%);
  animation:${reveal} 700ms cubic-bezier(.2,.8,.2,1) both;

  &::before{
    position:absolute;
    inset:0;
    pointer-events:none;
    background-image:radial-gradient(circle,rgb(245 246 250 / 65%) 0 1px,transparent 1.2px);
    background-position:23px 31px;
    background-size:113px 113px;
    content:"";
    opacity:.18;
    mask-image:linear-gradient(100deg,transparent 8%,black 72%,transparent);
  }

  @media(max-width:700px){
    grid-template-columns:1fr;
    min-height:unset;
  }
`;
const Postmark = styled.div`
  position:absolute;
  z-index:3;
  top:var(--space-5);
  right:var(--space-5);
  display:flex;
  gap:var(--space-3);
  align-items:center;
  color:var(--color-accent-primary);
  font-size:10px;
  font-weight:600;
  letter-spacing:.16em;

  span+span{padding-left:var(--space-3);border-left:1px solid var(--color-border-strong);}
`;
const Copy = styled.div`
  position:relative;
  z-index:2;
  align-self:end;
  padding:clamp(var(--space-8),6vw,var(--space-12));
`;
const Eyebrow = styled.p`
  color:var(--color-accent-primary);
  font-size:11px;
  font-weight:600;
  letter-spacing:.17em;
`;
const Title = styled.h2`
  display:flex;
  flex-direction:column;
  margin-top:var(--space-4);
  font-family:var(--font-family-display);
  font-size:clamp(2.2rem,5.2vw,4rem);
  font-weight:400;
  line-height:1.13;
  letter-spacing:-.055em;
  word-break:keep-all;

  span{white-space:nowrap;}
  @media(max-width:390px){font-size:clamp(1.9rem,10vw,2.45rem);}
`;
const Description = styled.p`
  max-width:35rem;
  margin-top:var(--space-6);
  color:var(--color-neutral-300);
  font-size:var(--font-size-200);
  line-height:1.75;
  word-break:keep-all;
`;
const Actions = styled.div`
  display:flex;
  flex-wrap:wrap;
  gap:var(--space-4);
  align-items:center;
  margin-top:var(--space-8);
`;
const OpenButton = styled.button`
  min-height:48px;
  padding:0 var(--space-6);
  border:1px solid var(--color-accent-primary);
  border-radius:3px;
  color:var(--color-identity-midnight-navy);
  background:var(--color-accent-primary);
  font-weight:700;
  cursor:pointer;
  transition:filter 160ms ease,transform 160ms ease;

  &:hover:not(:disabled){filter:brightness(1.08);transform:translateY(-1px);}
  &:disabled{cursor:wait;opacity:.62;}
`;
const PasskeyNote = styled.span`
  color:var(--color-text-muted);
  font-size:var(--font-size-100);
`;
const SymbolStage = styled.div`
  position:relative;
  display:grid;
  place-items:center;
  min-height:340px;
  overflow:hidden;

  &::after{
    position:absolute;
    right:8%;
    bottom:16%;
    left:8%;
    height:1px;
    background:linear-gradient(90deg,transparent,var(--color-border-strong),transparent);
    content:"";
  }

  @media(max-width:700px){
    order:-1;
    min-height:230px;
    margin-top:var(--space-8);
  }
`;
const Orbit = styled.span`
  position:absolute;
  width:min(72%,280px);
  aspect-ratio:1;
  border:1px solid rgb(217 199 163 / 24%);
  border-radius:50%;

  &::before,&::after{position:absolute;border-radius:50%;background:var(--color-accent-primary);content:"";}
  &::before{top:8%;left:18%;width:4px;height:4px;box-shadow:0 0 12px var(--color-accent-primary);}
  &::after{right:4%;bottom:28%;width:2px;height:2px;box-shadow:0 0 10px var(--color-accent-primary);}
`;
const Glow = styled.span`
  position:absolute;
  top:48%;
  left:50%;
  width:170px;
  height:170px;
  border-radius:50%;
  background:rgb(217 199 163 / 20%);
  filter:blur(38px);
  animation:${starlight} 4s ease-in-out infinite;
`;
const AnimatedMark = styled(GibyeolMark)`
  position:relative;
  z-index:1;
  width:min(78%,280px)!important;
  filter:drop-shadow(0 14px 30px rgb(0 0 0 / 26%));
`;
