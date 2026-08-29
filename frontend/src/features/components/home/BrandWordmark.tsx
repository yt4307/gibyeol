"use client";

import styled from "@emotion/styled";
import { GibyeolMark } from "@features/components/brand/GibyeolMark";

export type BrandWordmarkProps = {
  children?: string;
};

export function BrandWordmark({ children = "기별" }: BrandWordmarkProps) {
  return <Wordmark aria-label="기별"><GibyeolMark size={42} /><Name>{children}</Name></Wordmark>;
}

const Wordmark = styled.span`
  display: inline-flex;
  align-items: center;
  gap: var(--space-3);
  color: var(--color-accent-primary);
  line-height: 1;
`;

const Name = styled.span`
  color: var(--color-text);
  font-family: var(--font-serif);
  font-size: 1.35rem;
  font-weight: 400;
  letter-spacing: 0.18em;
`;
