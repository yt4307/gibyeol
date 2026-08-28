"use client";

import { ComposeLetter } from "../components/ComposeLetter";
import { useSendLetter } from "../hooks/use-send-letter";

export type SendFlowProps = { address?: `0x${string}` };

export function SendFlow({ address }: SendFlowProps) {
  const { draft, busy, error, mediaSummary, update, seal, reset } = useSendLetter(address);
  if (!address) return null;
  if (!draft) return <p>저장된 편지를 확인하고 있어요…</p>;
  return <ComposeLetter draft={draft} busy={busy} error={error} mediaSummary={mediaSummary} onChange={update} onSubmit={(files) => { void seal(files); }} onReset={reset} />;
}
