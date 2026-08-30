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
    <Shell id="main-content" tabIndex={-1}>
      <Header>
        <BrandWordmark>{content.wordmark}</BrandWordmark>
        <StatusPill label={statusLabel} />
      </Header>

      <HeroGrid>
        <Copy>
          <Eyebrow>{content.eyebrow}</Eyebrow>
          <Title aria-label={content.title.join(" ")}>
            {content.title.map((phrase) => (
              <TitlePhrase key={phrase}>{phrase}</TitlePhrase>
            ))}
          </Title>
          <Description>{content.description}</Description>
          <Actions>
            <PrimaryAction href="/send">{content.actionLabel}</PrimaryAction>
            <TextLink href="#about">기별에 대하여 ↓</TextLink>
          </Actions>
        </Copy>

        <LetterPreview
          label={content.letterLabel}
          message={content.letterMessage}
        />
      </HeroGrid>

      <About id="about">
        <AboutLabel>기별 이야기</AboutLabel>
        <AboutText>
          편지는 블록체인에 기록되고, 마음은 암호화된 채 약속한 시간까지
          기다립니다. 기별은 그 약속을 조용히 지키는 디지털 우체국입니다.
        </AboutText>
      </About>
    </Shell>
  );
}

const Shell = styled.main`
  position: relative;
  width: 100%;
  min-height: 100vh;
  overflow: hidden;
  padding: var(--space-6) clamp(var(--space-5), 5vw, var(--space-16));
  background:
    radial-gradient(circle at 78% 24%, rgb(217 199 163 / 9%), transparent 19%),
    radial-gradient(circle at 8% 4%, rgb(39 60 92 / 48%), transparent 34%),
    linear-gradient(145deg, var(--color-identity-midnight-navy), #0a101c 76%),
    var(--color-app-background);

  &::before {
    position: absolute;
    inset: 0;
    pointer-events: none;
    background-image:
      radial-gradient(circle, rgb(245 246 250 / 70%) 0 1px, transparent 1.4px),
      radial-gradient(circle, rgb(217 199 163 / 60%) 0 1px, transparent 1.4px);
    background-position: 0 0, 31px 17px;
    background-size: 127px 127px, 191px 191px;
    content: "";
    opacity: .22;
    mask-image: linear-gradient(to bottom, black, transparent 78%);
  }
`;

const Header = styled.header`
  display: flex;
  gap: var(--space-4);
  align-items: center;
  justify-content: space-between;
  width: min(100%, 1180px);
  margin: 0 auto;
  position: relative;
  z-index: 2;
`;

const HeroGrid = styled.section`
  display: grid;
  position: relative;
  z-index: 1;
  grid-template-columns: minmax(0, 1fr) minmax(340px, 0.8fr);
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
  color: var(--color-accent-primary);
  font-size: var(--font-size-100);
  font-weight: 500;
  letter-spacing: 0.18em;
`;

const Title = styled.h1`
  display: flex;
  flex-wrap: wrap;
  column-gap: 0.24em;
  max-width: 13ch;
  margin-top: var(--space-5);
  color: var(--color-text);
  font-family: var(--font-family-display);
  font-size: clamp(2.5rem, 5vw, 4.5rem);
  font-weight: 400;
  line-height: 1.08;
  letter-spacing: -0.055em;

  @media (max-width: 340px) {
    font-size: 2rem;
  }
`;

const TitlePhrase = styled.span`
  white-space: nowrap;
`;

const Description = styled.p`
  max-width: 31rem;
  margin: var(--space-8) 0;
  color: var(--color-text-muted);
  font-size: var(--font-size-300);
  line-height: 1.75;
  word-break: keep-all;
`;

const Actions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-5);
  align-items: center;
`;

const TextLink = styled.a`
  padding: var(--space-3) 0;
  color: var(--color-text-muted);
  border-bottom: 1px solid var(--color-border);
  font-size: var(--font-size-100);
  letter-spacing: .08em;
  transition: color 160ms ease, border-color 160ms ease;

  &:hover {
    color: var(--color-accent-primary);
    border-color: var(--color-accent-primary);
  }
`;

const About = styled.section`
  display: grid;
  grid-template-columns: minmax(140px, 0.35fr) 1fr;
  gap: var(--space-8);
  width: min(100%, 1180px);
  position: relative;
  z-index: 1;
  margin: 0 auto;
  padding: clamp(var(--space-12), 8vw, 100px) 0;
  border-top: 1px solid var(--color-border);

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
  max-width: 44rem;
  color: var(--color-neutral-200);
  font-family: var(--font-family-display);
  font-size: clamp(1.35rem, 3vw, 2.2rem);
  font-weight: 400;
  line-height: 1.55;
  letter-spacing: -0.04em;
  word-break: keep-all;
`;
