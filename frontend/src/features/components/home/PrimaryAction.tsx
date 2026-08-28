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
      <Arrow aria-hidden="true">↗</Arrow>
    </Action>
  );
}

const Action = styled(Link)`
  display: inline-flex;
  gap: var(--space-3);
  align-items: center;
  justify-content: center;
  min-height: 48px;
  padding: 0 var(--space-5);
  color: var(--color-white);
  background: var(--color-neutral-1300);
  border-radius: 999px;
  font-size: var(--font-size-200);
  font-weight: 500;
  transition:
    transform 160ms ease,
    background-color 160ms ease;

  &:hover {
    background: var(--color-brand-800);
    transform: translateY(-2px);
  }

  &:active {
    transform: translateY(0);
  }
`;

const Arrow = styled.span`
  font-size: 1.1em;
  line-height: 1;
`;
