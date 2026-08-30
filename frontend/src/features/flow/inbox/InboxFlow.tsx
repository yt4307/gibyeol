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
  return <><InboxList letters={inbox.letters} unlocked={daysRemaining === 0} busy={inbox.busy} onOpen={(letter) => { void inbox.open(letter).catch(() => undefined); }} onRecover={setRecoveryLetter} />{inbox.error && <p role="alert">{inbox.error}</p>}{recoveryLetter && <RecoveryPanel busy={inbox.busy} onRequestCode={inbox.requestEmailCode} onRecover={(code) => { void inbox.recover(recoveryLetter, code).then(() => setRecoveryLetter(null)).catch(() => undefined); }} onCancel={() => setRecoveryLetter(null)} />}{inbox.opened && <LetterReader letter={inbox.opened} />}</>;
}
