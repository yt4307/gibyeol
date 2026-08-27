"use client";

import { useEffect, useState } from "react";

const DAY_IN_MS = 24 * 60 * 60 * 1_000;

function calculateDaysRemaining(unlockAt: string) {
  const remaining = new Date(unlockAt).getTime() - Date.now();
  return Math.max(0, Math.ceil(remaining / DAY_IN_MS));
}

export function useUnlockCountdown(unlockAt: string) {
  const [daysRemaining, setDaysRemaining] = useState<number | null>(null);

  useEffect(() => {
    const update = () => setDaysRemaining(calculateDaysRemaining(unlockAt));

    update();
    const intervalId = window.setInterval(update, 60 * 60 * 1_000);

    return () => window.clearInterval(intervalId);
  }, [unlockAt]);

  return daysRemaining;
}
