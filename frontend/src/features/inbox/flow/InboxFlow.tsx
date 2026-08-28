"use client";

import { useState } from "react";
import { useUnlockCountdown } from "@features/home/hooks/use-unlock-countdown";
import { InboxList } from "../components/InboxList";
import { LetterReader } from "../components/LetterReader";
import { RecoveryPanel } from "../components/RecoveryPanel";
import type { InboxLetter } from "../data/inbox";
import { useInbox } from "../hooks/use-inbox";

export function InboxFlow({ address }: { address: `0x${string}` }) {
  const inbox = useInbox(address); const [recoveryLetter, setRecoveryLetter] = useState<InboxLetter | null>(null);
  const daysRemaining = useUnlockCountdown("2026-12-25T00:00:00+09:00");
  return <><InboxList letters={inbox.letters} unlocked={daysRemaining === 0} busy={inbox.busy} onOpen={(letter) => { void inbox.open(letter); }} onRecover={setRecoveryLetter} />{inbox.error && <p role="alert">{inbox.error}</p>}{recoveryLetter && <RecoveryPanel busy={inbox.busy} onRequestCode={inbox.requestEmailCode} onRecover={(code) => { void inbox.recover(recoveryLetter, code).then(() => setRecoveryLetter(null)); }} onCancel={() => setRecoveryLetter(null)} />}{inbox.opened && <LetterReader letter={inbox.opened} />}</>;
}
