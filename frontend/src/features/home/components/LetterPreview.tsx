"use client";

import styled from "@emotion/styled";

export type LetterPreviewProps = {
  label: string;
  message: string;
};

export function LetterPreview({ label, message }: LetterPreviewProps) {
  return (
    <Scene aria-label="크리스마스에 도착할 기별 봉투 미리보기">
      <Glow aria-hidden="true" />
      <Envelope>
        <Stamp aria-hidden="true">✦</Stamp>
        <Label>{label}</Label>
        <Message>{message}</Message>
        <Seal aria-hidden="true">별</Seal>
      </Envelope>
    </Scene>
  );
}

const Scene = styled.div`
  position: relative;
  display: grid;
  place-items: center;
  width: min(100%, 500px);
  min-height: 430px;
  isolation: isolate;

  @media (max-width: 767px) {
    min-height: 330px;
  }
`;

const Glow = styled.div`
  position: absolute;
  z-index: -1;
  width: 78%;
  aspect-ratio: 1;
  background: radial-gradient(
    circle,
    rgb(111 145 244 / 32%) 0%,
    rgb(224 239 223 / 52%) 42%,
    transparent 72%
  );
  filter: blur(18px);
`;

const Envelope = styled.article`
  position: relative;
  width: min(88%, 390px);
  aspect-ratio: 1.28;
  padding: var(--space-8);
  overflow: hidden;
  color: var(--color-neutral-1200);
  background:
    linear-gradient(140deg, rgb(255 255 255 / 68%), transparent 38%),
    var(--color-neutral-100);
  border: 1px solid rgb(17 17 15 / 10%);
  border-radius: 8px;
  box-shadow:
    0 28px 70px rgb(53 61 70 / 18%),
    0 4px 12px rgb(53 61 70 / 8%);
  transform: rotate(3deg);

  &::after {
    position: absolute;
    right: -10%;
    bottom: -44%;
    left: -10%;
    height: 72%;
    background: var(--color-neutral-200);
    border-top: 1px solid rgb(17 17 15 / 8%);
    content: "";
    transform: rotate(-10deg);
  }
`;

const Stamp = styled.span`
  position: absolute;
  top: var(--space-6);
  right: var(--space-6);
  display: grid;
  width: 52px;
  height: 60px;
  place-items: center;
  color: var(--color-brand-800);
  background: var(--color-brand-100);
  border: 1px dashed var(--color-brand-400);
  font-size: var(--font-size-500);
`;

const Label = styled.p`
  color: var(--color-text-muted);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.16em;
`;

const Message = styled.p`
  margin-top: var(--space-12);
  white-space: pre-line;
  font-size: clamp(1.25rem, 4vw, 1.75rem);
  font-weight: 300;
  line-height: 1.45;
  letter-spacing: -0.035em;
`;

const Seal = styled.span`
  position: absolute;
  z-index: 1;
  right: 26%;
  bottom: 18%;
  display: grid;
  width: 58px;
  height: 58px;
  place-items: center;
  color: var(--color-white);
  background: var(--color-brand-700);
  border-radius: 50%;
  box-shadow: 0 4px 10px rgb(52 73 143 / 24%);
  font-size: var(--font-size-100);
  font-weight: 700;
  transform: rotate(-3deg);
`;
