"use client";

import { useCallback, useEffect, useState } from "react";
import { apiBaseUrl } from "@features/blockchain/data/config";

export function useEmailRegistration(address?: string) {
  const [verifiedAddress, setVerifiedAddress] = useState<string | null>(null);
  const [codeSentAddress, setCodeSentAddress] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const verified = Boolean(address && verifiedAddress === address);
  const codeSent = Boolean(address && codeSentAddress === address);

  useEffect(() => {
    if (!address) return;
    let cancelled = false;
    queueMicrotask(() => {
      void fetch(`${apiBaseUrl}/mailbox/email/status`, { credentials: "include" })
        .then(async (response) => response.ok ? response.json() as Promise<{ verified: boolean }> : { verified: false })
        .then((status) => { if (!cancelled) setVerifiedAddress(status.verified ? address : null); })
        .catch(() => { if (!cancelled) setVerifiedAddress(null); });
    });
    return () => { cancelled = true; };
  }, [address]);

  const requestCode = useCallback(async (email: string) => {
    setBusy(true); setError(null);
    try {
      const response = await fetch(`${apiBaseUrl}/mailbox/email/challenge`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) });
      if (!response.ok) throw new Error("인증 메일을 보내지 못했습니다.");
      setCodeSentAddress(address ?? null);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "이메일 인증 요청에 실패했습니다."); throw cause; }
    finally { setBusy(false); }
  }, [address]);

  const verifyCode = useCallback(async (code: string) => {
    setBusy(true); setError(null);
    try {
      const response = await fetch(`${apiBaseUrl}/mailbox/email/verify`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code }) });
      if (!response.ok) throw new Error("인증 코드를 확인해 주세요.");
      setVerifiedAddress(address ?? null);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "이메일 인증에 실패했습니다."); throw cause; }
    finally { setBusy(false); }
  }, [address]);

  return { verified, codeSent, busy, error, requestCode, verifyCode };
}
