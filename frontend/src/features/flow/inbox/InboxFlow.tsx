"use client";

import { useState } from "react";
import { useUnlockCountdown } from "@features/hooks/home/use-unlock-countdown";
import { InboxList } from "@features/components/inbox/InboxList";
import { LetterReader } from "@features/components/inbox/LetterReader";
import { RecoveryPanel } from "@features/components/inbox/RecoveryPanel";
import type { InboxLetter } from "@features/data/inbox/inbox";
import { useInbox } from "@features/hooks/inbox/use-inbox";

export function InboxFlow({ address }: { address: `0x${string}` }) {
  const inbox = useInbox(address); const [recoveryLetter, setRecoveryLetter] = useState<InboxLetter | null>(null);
  const daysRemaining = useUnlockCountdown("2026-12-25T00:00:00+09:00");
  const retry = () => inbox.selected ? inbox.open(inbox.selected) : inbox.refresh();
  return <><InboxList letters={inbox.letters} unlocked={daysRemaining === 0} busy={inbox.busy} error={recoveryLetter ? null : inbox.error} openingLetterId={inbox.activity === "opening" ? inbox.selected?.letterId : undefined} onRetry={() => { void retry().catch(() => undefined); }} onOpen={(letter) => { void inbox.open(letter).catch(() => undefined); }} onRecover={setRecoveryLetter} />{recoveryLetter && <RecoveryPanel busy={inbox.busy} activity={inbox.activity} error={inbox.error} onRequestCode={inbox.requestEmailCode} onRecover={(code) => { void inbox.recover(recoveryLetter, code).then(() => setRecoveryLetter(null)).catch(() => undefined); }} onCancel={() => setRecoveryLetter(null)} />}{inbox.opened && <LetterReader letter={inbox.opened} />}</>;
}
