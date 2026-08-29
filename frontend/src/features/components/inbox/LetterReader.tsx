"use client";

import styled from "@emotion/styled";
import type { OpenedLetter } from "@features/data/inbox/inbox";

/* eslint-disable @next/next/no-img-element -- decrypted blob URLs cannot use the static Pages image optimizer */
export function LetterReader({ letter }: { letter: OpenedLetter }) {
  return <Paper><Label>DECRYPTED LETTER</Label><Message>{letter.message}</Message>{letter.media.length > 0 && <Media>{letter.media.map((item) => item.kind === "video" ? <video key={item.url} src={item.url} controls playsInline aria-label="기별에 첨부된 타임랩스" /> : <img key={item.url} src={item.url} alt="기별에 첨부된 사진" />)}</Media>}</Paper>;
}
const Paper = styled.article`position:relative;padding:clamp(var(--space-6),6vw,var(--space-12));color:var(--color-identity-midnight-navy);background:var(--color-identity-starlight-white);border:1px solid var(--color-accent-primary);border-radius:2px;box-shadow:0 24px 70px rgb(0 0 0 / 30%);&::after{position:absolute;inset:12px;border:1px solid rgb(13 19 33 / 10%);pointer-events:none;content:"";}`;
const Label = styled.p`font-size:11px;font-weight:700;letter-spacing:.16em;color:var(--color-secondary-700);`;
const Message = styled.p`margin-top:var(--space-8);white-space:pre-wrap;font-family:var(--font-family-letter);font-size:clamp(1.2rem,3vw,1.7rem);font-weight:400;line-height:1.9;`;
const Media = styled.div`display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:var(--space-3);margin-top:var(--space-8);img,video{width:100%;height:auto;border-radius:8px;}`;
