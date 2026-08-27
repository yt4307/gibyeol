"use client";

import styled from "@emotion/styled";

export type StatusPillProps = {
  label: string;
};

export function StatusPill({ label }: StatusPillProps) {
  return (
    <Pill>
      <Dot aria-hidden="true" />
      {label}
    </Pill>
  );
}

const Pill = styled.span`
  display: inline-flex;
  gap: var(--space-2);
  align-items: center;
  min-height: 32px;
  padding: 0 var(--space-3);
  color: var(--color-secondary-900);
  background: var(--color-secondary-200);
  border: 1px solid var(--color-secondary-300);
  border-radius: 999px;
  font-size: var(--font-size-100);
  font-weight: 500;
`;

const Dot = styled.span`
  width: 6px;
  height: 6px;
  background: var(--color-secondary-600);
  border-radius: 50%;
  box-shadow: 0 0 0 4px rgb(86 139 89 / 12%);
`;
