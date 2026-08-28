"use client";

import styled from "@emotion/styled";
import type { HomeContent } from "@features/data/home/home-content";
import { useUnlockCountdown } from "@features/hooks/home/use-unlock-countdown";
import { BrandWordmark } from "./BrandWordmark";
import { LetterPreview } from "./LetterPreview";
import { PrimaryAction } from "./PrimaryAction";
import { StatusPill } from "./StatusPill";

export type HomeHeroProps = {
  content: HomeContent;
};

export function HomeHero({ content }: HomeHeroProps) {
  const daysRemaining = useUnlockCountdown(content.unlockAt);
  const statusLabel =
    daysRemaining === null
      ? content.statusFallback
      : daysRemaining === 0
        ? "기별이 도착하는 날"
        : `크리스마스까지 D-${daysRemaining}`;

  return (
    <Shell>
      <Header>
        <BrandWordmark>{content.wordmark}</BrandWordmark>
        <StatusPill label={statusLabel} />
      </Header>

      <HeroGrid>
        <Copy>
          <Eyebrow>{content.eyebrow}</Eyebrow>
          <Title>{content.title}</Title>
          <Description>{content.description}</Description>
          <PrimaryAction href="/send">{content.actionLabel}</PrimaryAction>
        </Copy>

        <LetterPreview
          label={content.letterLabel}
          message={content.letterMessage}
        />
      </HeroGrid>

      <About id="about">
        <AboutLabel>ABOUT GIBYEOL</AboutLabel>
        <AboutText>
          편지는 블록체인에 기록되고, 마음은 암호화된 채 약속한 시간까지
          기다립니다. 기별은 그 약속을 조용히 지키는 디지털 우체국입니다.
        </AboutText>
      </About>
    </Shell>
  );
}

const Shell = styled.main`
  width: 100%;
  min-height: 100vh;
  padding: var(--space-6) clamp(var(--space-5), 5vw, var(--space-16));
  background:
    radial-gradient(circle at 8% 8%, rgb(224 239 223 / 76%), transparent 28%),
    radial-gradient(circle at 92% 10%, rgb(220 232 255 / 84%), transparent 30%),
    var(--color-app-background);
`;

const Header = styled.header`
  display: flex;
  gap: var(--space-4);
  align-items: center;
  justify-content: space-between;
  width: min(100%, 1180px);
  margin: 0 auto;
`;

const HeroGrid = styled.section`
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(320px, 0.85fr);
  gap: clamp(var(--space-8), 7vw, 96px);
  align-items: center;
  width: min(100%, 1180px);
  min-height: calc(100vh - 88px);
  margin: 0 auto;
  padding: var(--space-10) 0 var(--space-16);

  @media (max-width: 860px) {
    grid-template-columns: 1fr;
    gap: var(--space-2);
    padding-top: 14vh;
  }
`;

const Copy = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
`;

const Eyebrow = styled.p`
  color: var(--color-brand-800);
  font-size: var(--font-size-100);
  font-weight: 700;
  letter-spacing: 0.14em;
`;

const Title = styled.h1`
  max-width: 9ch;
  margin-top: var(--space-5);
  white-space: pre-line;
  font-size: clamp(3rem, 8vw, 6.8rem);
  font-weight: 300;
  line-height: 0.98;
  letter-spacing: -0.075em;
  text-wrap: balance;
`;

const Description = styled.p`
  max-width: 31rem;
  margin: var(--space-8) 0;
  color: var(--color-text-muted);
  font-size: var(--font-size-300);
  line-height: 1.75;
  word-break: keep-all;
`;

const About = styled.section`
  display: grid;
  grid-template-columns: minmax(140px, 0.35fr) 1fr;
  gap: var(--space-8);
  width: min(100%, 1180px);
  margin: 0 auto;
  padding: clamp(var(--space-12), 8vw, 100px) 0;
  border-top: 1px solid rgb(17 17 15 / 14%);

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
`;

const AboutLabel = styled.p`
  color: var(--color-text-muted);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.16em;
`;

const AboutText = styled.p`
  max-width: 42rem;
  font-size: clamp(1.35rem, 3vw, 2.2rem);
  font-weight: 300;
  line-height: 1.55;
  letter-spacing: -0.04em;
  word-break: keep-all;
`;
