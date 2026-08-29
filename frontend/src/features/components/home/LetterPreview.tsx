"use client";

import styled from "@emotion/styled";
import { GibyeolMark } from "@features/components/brand/GibyeolMark";

export type LetterPreviewProps = {
  label: string;
  message: string;
};

export function LetterPreview({ label, message }: LetterPreviewProps) {
  return (
    <Scene aria-label="크리스마스에 도착할 기별 봉투 미리보기">
      <Glow aria-hidden="true" />
      <Orbit aria-hidden="true" />
      <SymbolStage><GibyeolMark variant="open" size={390} priority /></SymbolStage>
      <DeliverySlip>
        <PostalTop>
          <Label>{label}</Label>
          <Postmark aria-hidden="true"><span>CHRISTMAS</span><span>2026 · 12 · 25</span></Postmark>
        </PostalTop>
        <Message>{message}</Message>
        <Route aria-hidden="true">SEOUL ───── ✦ ───── 12·25</Route>
      </DeliverySlip>
    </Scene>
  );
}

const Scene = styled.div`
  position: relative;
  display: grid;
  place-items: center;
  width: min(100%, 520px);
  min-height: 560px;
  isolation: isolate;

  @media (max-width: 767px) {
    min-height: 460px;
  }
`;

const Glow = styled.div`
  position: absolute;
  z-index: -2;
  width: 80%;
  aspect-ratio: 1;
  background: radial-gradient(circle, rgb(217 199 163 / 18%), rgb(18 28 46 / 34%) 44%, transparent 72%);
  filter: blur(26px);
`;

const Orbit = styled.div`
  position: absolute;
  top: 4%;
  left: 50%;
  z-index: -1;
  width: 72%;
  aspect-ratio: 1;
  border: 1px solid rgb(217 199 163 / 14%);
  border-radius: 50%;
  transform: translateX(-50%);

  &::after {
    position: absolute;
    top: 12%;
    right: 5%;
    width: 5px;
    height: 5px;
    background: var(--color-accent-primary);
    border-radius: 50%;
    box-shadow: 0 0 14px var(--color-accent-primary);
    content: "";
  }
`;

const SymbolStage = styled.div`
  position: absolute;
  top: -4%;
  left: 50%;
  z-index: 2;
  width: min(88%, 390px);
  filter: drop-shadow(0 24px 34px rgb(0 0 0 / 35%));
  transform: translateX(-50%);

  img {
    width: 100%;
    animation: rise 5s ease-in-out infinite;
  }

  @keyframes rise {
    0%, 100% { transform: translateY(2px); }
    50% { transform: translateY(-5px); }
  }
`;

const DeliverySlip = styled.article`
  position: absolute;
  right: 0;
  bottom: 5%;
  z-index: 1;
  width: min(78%, 350px);
  padding: var(--space-5);
  color: var(--color-text);
  background: rgb(18 28 46 / 88%);
  border: 1px solid var(--color-border-strong);
  border-radius: 2px;
  box-shadow: 0 22px 60px rgb(0 0 0 / 28%);
  backdrop-filter: blur(12px);
  transform: rotate(2deg);
`;

const PostalTop = styled.div`
  display: flex;
  gap: var(--space-3);
  align-items: start;
  justify-content: space-between;
`;

const Label = styled.p`
  color: var(--color-text-muted);
  font-size: 9px;
  font-weight: 700;
  letter-spacing: .14em;
`;

const Postmark = styled.span`
  display: grid;
  gap: 2px;
  padding: 4px 10px;
  color: rgb(217 199 163 / 68%);
  border-top: 1px solid currentColor;
  border-bottom: 1px solid currentColor;
  font-size: 7px;
  letter-spacing: .16em;
  line-height: 1.2;
  transform: rotate(-5deg);
`;

const Message = styled.p`
  margin-top: var(--space-6);
  white-space: pre-line;
  font-family: var(--font-serif);
  font-size: clamp(1.05rem, 3vw, 1.4rem);
  font-weight: 400;
  line-height: 1.55;
  letter-spacing: -.025em;
`;

const Route = styled.p`
  margin-top: var(--space-6);
  color: var(--color-accent-primary);
  font-size: 8px;
  letter-spacing: .16em;
`;
