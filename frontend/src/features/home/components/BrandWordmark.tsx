"use client";

import styled from "@emotion/styled";

export type BrandWordmarkProps = {
  children?: string;
};

export function BrandWordmark({ children = "GIBYEOL" }: BrandWordmarkProps) {
  return <Wordmark aria-label="기별">{children}</Wordmark>;
}

const Wordmark = styled.span`
  display: inline-flex;
  align-items: center;
  color: var(--color-text);
  font-size: var(--font-size-100);
  font-weight: 700;
  letter-spacing: 0.28em;
  line-height: 1;
`;
