"use client";

import styled from "@emotion/styled";
import Link from "next/link";

export type PrimaryActionProps = {
  href: string;
  children: string;
};

export function PrimaryAction({ href, children }: PrimaryActionProps) {
  return (
    <Action href={href}>
      <span>{children}</span>
      <Arrow aria-hidden="true">→</Arrow>
    </Action>
  );
}

const Action = styled(Link)`
  display: inline-flex;
  gap: var(--space-3);
  align-items: center;
  justify-content: center;
  min-height: 52px;
  padding: 0 var(--space-6);
  color: var(--color-identity-midnight-navy);
  background: var(--color-accent-primary);
  border: 1px solid var(--color-accent-primary);
  border-radius: 3px;
  font-size: var(--font-size-200);
  font-weight: 500;
  transition:
    transform 160ms ease,
    background-color 160ms ease;

  &:hover {
    color: var(--color-accent-primary);
    background: transparent;
    transform: translateY(-2px);
  }

  &:active {
    transform: translateY(0);
  }
`;

const Arrow = styled.span`
  font-size: 1.25em;
  line-height: 1;
`;
