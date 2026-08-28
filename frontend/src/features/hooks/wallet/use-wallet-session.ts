"use client";

import { useCallback, useEffect, useState } from "react";
import { apiBaseUrl, chainId } from "@/infrastructure/blockchain/config";
import {
  activeWalletProvider,
  clearActiveWalletProvider,
  connectWalletProvider,
} from "@/infrastructure/blockchain/wallet-provider";
import { useAppStore } from "@/stores/use-app-store";

type SessionResponse = { walletAddress: `0x${string}` };

function isWalletAddress(value: unknown): value is `0x${string}` {
  return typeof value === "string" && /^0x[0-9a-f]{40}$/i.test(value);
}

type EventedWalletProvider = ReturnType<typeof activeWalletProvider> & {
  on?: (event: "accountsChanged", listener: (accounts: unknown) => void) => void;
  removeListener?: (event: "accountsChanged", listener: (accounts: unknown) => void) => void;
};

export function useWalletSession() {
  const session = useAppStore((state) => state.walletSession);
  const setSession = useAppStore((state) => state.setWalletSession);
  const authenticationStatus = useAppStore((state) => state.authenticationStatus);
  const setAuthenticationStatus = useAppStore((state) => state.setAuthenticationStatus);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const forgetSession = useCallback((notifyServer = false) => {
    setSession(null);
    setAuthenticationStatus("anonymous");
    clearActiveWalletProvider();
    if (notifyServer) {
      void fetch(`${apiBaseUrl}/auth/logout`, {
        method: "POST",
        credentials: "include",
      }).catch(() => undefined);
    }
  }, [setAuthenticationStatus, setSession]);

  useEffect(() => {
    let cancelled = false;

    const restore = async () => {
      await useAppStore.persist.rehydrate();
      if (cancelled) return;

      const cachedSession = useAppStore.getState().walletSession;
      if (!cachedSession) {
        setAuthenticationStatus("anonymous");
        return;
      }

      setAuthenticationStatus("restoring");
      try {
        const response = await fetch(`${apiBaseUrl}/auth/session`, { credentials: "include" });
        if (cancelled) return;
        if (!response.ok) {
          forgetSession();
          return;
        }
        const restored = (await response.json()) as SessionResponse;
        if (cancelled) return;
        if (!isWalletAddress(restored.walletAddress)) throw new Error("세션 응답이 올바르지 않습니다.");
        const address = restored.walletAddress.toLowerCase() as `0x${string}`;
        const provider = activeWalletProvider();
        const accounts = provider
          ? await provider.request({ method: "eth_accounts" }).catch(() => [])
          : [];
        if (cancelled) return;
        const connectedAddress = Array.isArray(accounts) && isWalletAddress(accounts[0])
          ? accounts[0].toLowerCase()
          : null;
        if (connectedAddress && connectedAddress !== address) {
          forgetSession(true);
          return;
        }
        setSession({ address, authenticated: true });
        setAuthenticationStatus("authenticated");
      } catch {
        if (!cancelled) {
          forgetSession();
          setError("저장된 로그인 상태를 확인하지 못했습니다.");
        }
      }
    };

    void restore();
    return () => { cancelled = true; };
  }, [forgetSession, setAuthenticationStatus, setSession]);

  useEffect(() => {
    if (!session) return;
    const provider = activeWalletProvider() as EventedWalletProvider;
    if (!provider?.on) return;

    const handleAccountsChanged = (accounts: unknown) => {
      const address = Array.isArray(accounts) && isWalletAddress(accounts[0])
        ? accounts[0].toLowerCase()
        : null;
      if (address !== session.address) forgetSession(true);
    };
    provider.on("accountsChanged", handleAccountsChanged);
    return () => provider.removeListener?.("accountsChanged", handleAccountsChanged);
  }, [forgetSession, session]);

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
      setAuthenticationStatus("authenticated");
      return next;
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "지갑 연결에 실패했습니다.";
      setError(message);
      throw cause;
    } finally {
      setBusy(false);
    }
  }, [setAuthenticationStatus, setSession]);

  return {
    session,
    error,
    busy,
    restoring: authenticationStatus === "restoring",
    authenticated: authenticationStatus === "authenticated",
    connect,
  };
}
