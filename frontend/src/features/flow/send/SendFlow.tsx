"use client";

import { ComposeLetter } from "@features/components/send/ComposeLetter";
import { useSendLetter } from "@features/hooks/send/use-send-letter";

export type SendFlowProps = { address?: `0x${string}`; walletReady?: boolean };

export function SendFlow({ address, walletReady = true }: SendFlowProps) {
  const { draft, busy, error, mediaSummary, update, seal, reset } = useSendLetter(address);
  if (!address) return null;
  if (!draft) return <p>저장된 편지를 확인하고 있어요…</p>;
  return <ComposeLetter draft={draft} walletReady={walletReady} busy={busy} error={error} mediaSummary={mediaSummary} onChange={update} onSubmit={(files) => { void Promise.resolve(seal(files)).catch(() => undefined); }} onReset={reset} />;
}
