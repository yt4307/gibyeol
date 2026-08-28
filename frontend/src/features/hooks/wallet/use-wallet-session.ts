"use client";

import { useCallback, useState } from "react";
import { apiBaseUrl, chainId } from "@/infrastructure/blockchain/config";
import { connectWalletProvider } from "@/infrastructure/blockchain/wallet-provider";
import { useAppStore } from "@/stores/use-app-store";

export function useWalletSession() {
  const session = useAppStore((state) => state.walletSession);
  const setSession = useAppStore((state) => state.setWalletSession);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const connect = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const { provider } = await connectWalletProvider();
      const accounts = (await provider.request({ method: "eth_requestAccounts" })) as string[];
      const address = accounts[0]?.toLowerCase() as `0x${string}` | undefined;
      if (!address) throw new Error("연결된 계정이 없습니다.");
      const actualChain = Number(await provider.request({ method: "eth_chainId" }));
      if (actualChain !== chainId) {
        await provider.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: `0x${chainId.toString(16)}` }],
        });
      }
      const challengeResponse = await fetch(`${apiBaseUrl}/auth/challenge`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletAddress: address, chainId }),
      });
      if (!challengeResponse.ok) throw new Error("로그인 요청을 만들지 못했습니다.");
      const challenge = (await challengeResponse.json()) as { message: string };
      const signature = (await provider.request({
        method: "personal_sign",
        params: [challenge.message, address],
      })) as string;
      const verifyResponse = await fetch(`${apiBaseUrl}/auth/verify`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: challenge.message, signature }),
      });
      if (!verifyResponse.ok) throw new Error("지갑 서명을 확인하지 못했습니다.");
      const next = { address, authenticated: true };
      setSession(next);
      return next;
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "지갑 연결에 실패했습니다.";
      setError(message);
      throw cause;
    } finally {
      setBusy(false);
    }
  }, [setSession]);

  return { session, error, busy, connect };
}
