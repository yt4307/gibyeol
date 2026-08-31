"use client";

import { useEffect, useState } from "react";
import { useUnlockCountdown } from "@features/hooks/home/use-unlock-countdown";
import { ChristmasArrival } from "@features/components/inbox/ChristmasArrival";
import { InboxList } from "@features/components/inbox/InboxList";
import { LetterReader } from "@features/components/inbox/LetterReader";
import { RecoveryPanel } from "@features/components/inbox/RecoveryPanel";
import type { InboxLetter } from "@features/data/inbox/inbox";
import { useInbox } from "@features/hooks/inbox/use-inbox";

const inboxUnlockAt = process.env.NODE_ENV === "development"
  ? "2026-08-31T00:00:00+09:00"
  : "2026-12-25T00:00:00+09:00";

export function InboxFlow({ address }: { address: `0x${string}` }) {
  const inbox = useInbox(address); const [recoveryLetter, setRecoveryLetter] = useState<InboxLetter | null>(null);
  const daysRemaining = useUnlockCountdown(inboxUnlockAt);
  const unlocked = daysRemaining === 0;
  const retry = () => inbox.selected ? inbox.open(inbox.selected) : inbox.refresh();

  useEffect(() => {
    if (!inbox.opened) return;
    const frame = window.requestAnimationFrame(() => {
      const reader = document.querySelector<HTMLElement>("#opened-letter");
      if (!reader) return;
      const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      reader.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "start" });
      reader.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [inbox.opened]);

  return <>{unlocked && inbox.letters.length > 0 && <ChristmasArrival letterCount={inbox.letters.length} busy={inbox.busy} onOpenFirst={() => { const first = inbox.letters[0]; if (first) void inbox.open(first).catch(() => undefined); }} />}<InboxList letters={inbox.letters} unlocked={unlocked} busy={inbox.busy} error={recoveryLetter ? null : inbox.error} openingLetterId={inbox.activity === "opening" ? inbox.selected?.letterId : undefined} onRetry={() => { void retry().catch(() => undefined); }} onOpen={(letter) => { void inbox.open(letter).catch(() => undefined); }} onRecover={setRecoveryLetter} />{recoveryLetter && <RecoveryPanel busy={inbox.busy} activity={inbox.activity} error={inbox.error} onRequestCode={inbox.requestEmailCode} onRecover={(code) => { void inbox.recover(recoveryLetter, code).then(() => setRecoveryLetter(null)).catch(() => undefined); }} onCancel={() => setRecoveryLetter(null)} />}{inbox.opened && <LetterReader letter={inbox.opened} />}</>;
}
