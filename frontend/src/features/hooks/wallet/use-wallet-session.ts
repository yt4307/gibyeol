"use client";

import { useCallback, useEffect, useState } from "react";
import { apiBaseUrl, chain, chainId, rpcUrl } from "@/infrastructure/blockchain/config";
import {
  activeWalletProvider,
  clearActiveWalletProvider,
  connectWalletProvider,
} from "@/infrastructure/blockchain/wallet-provider";
import { useAppStore } from "@/stores/use-app-store";

type SessionResponse = { walletAddress: `0x${string}` };
type ErrorPayload = { error?: { code?: unknown; message?: unknown } };

function isWalletAddress(value: unknown): value is `0x${string}` {
  return typeof value === "string" && /^0x[0-9a-f]{40}$/i.test(value);
}

function errorDetails(cause: unknown, fallback: string): string {
  if (cause instanceof Error && cause.message) return cause.message;
  if (typeof cause !== "object" || cause === null) return fallback;

  const error = cause as { code?: unknown; message?: unknown; error?: unknown };
  const nested = typeof error.error === "object" && error.error !== null
    ? error.error as { code?: unknown; message?: unknown }
    : undefined;
  const message = typeof error.message === "string"
    ? error.message
    : typeof nested?.message === "string" ? nested.message : fallback;
  const code = error.code ?? nested?.code;

  return typeof code === "string" || typeof code === "number"
    ? `${message} (코드: ${code})`
    : message;
}

function errorCode(cause: unknown): string | number | undefined {
  if (typeof cause !== "object" || cause === null) return undefined;
  const error = cause as { code?: unknown; error?: unknown };
  if (typeof error.code === "string" || typeof error.code === "number") return error.code;
  if (typeof error.error !== "object" || error.error === null) return undefined;
  const nestedCode = (error.error as { code?: unknown }).code;
  return typeof nestedCode === "string" || typeof nestedCode === "number" ? nestedCode : undefined;
}

class WalletRequestError extends Error {
  constructor(message: string, readonly code?: string | number) {
    super(message);
    this.name = "WalletRequestError";
  }
}

async function walletRequest<T>(
  provider: NonNullable<ReturnType<typeof activeWalletProvider>>,
  stage: string,
  args: { method: string; params?: readonly unknown[] | object },
): Promise<T> {
  try {
    return await provider.request(args) as T;
  } catch (cause) {
    throw new WalletRequestError(
      `${stage} 단계 실패: ${errorDetails(cause, "지갑에서 요청을 처리하지 못했습니다.")}`,
      errorCode(cause),
    );
  }
}

async function apiResponseError(response: Response, fallback: string): Promise<Error> {
  let payload: ErrorPayload | undefined;
  try {
    payload = await response.json() as ErrorPayload;
  } catch {
    // JSON 오류 본문이 없으면 상태 코드만으로 진단한다.
  }
  const code = typeof payload?.error?.code === "string" ? payload.error.code : undefined;
  const message = typeof payload?.error?.message === "string" ? payload.error.message : undefined;
  const detail = [message, code ? `코드: ${code}` : undefined, `HTTP ${response.status}`]
    .filter(Boolean)
    .join(" · ");

  return new Error(`${fallback}: ${detail}`);
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
      const accounts = await walletRequest<string[]>(provider, "지갑 계정 연결", {
        method: "eth_requestAccounts",
      });
      const address = accounts[0]?.toLowerCase() as `0x${string}` | undefined;
      if (!address) throw new Error("연결된 계정이 없습니다.");
      const actualChain = Number(await walletRequest<string>(provider, "네트워크 확인", {
        method: "eth_chainId",
      }));
      if (actualChain !== chainId) {
        const chainIdHex = `0x${chainId.toString(16)}`;
        try {
          await walletRequest(provider, "네트워크 전환", {
            method: "wallet_switchEthereumChain",
            params: [{ chainId: chainIdHex }],
          });
        } catch (cause) {
          if (!(cause instanceof WalletRequestError) || Number(cause.code) !== 4902) throw cause;
          await walletRequest(provider, "네트워크 추가", {
            method: "wallet_addEthereumChain",
            params: [{
              chainId: chainIdHex,
              chainName: chain.name,
              nativeCurrency: chain.nativeCurrency,
              rpcUrls: [rpcUrl],
              blockExplorerUrls: chain.blockExplorers ? [chain.blockExplorers.default.url] : undefined,
            }],
          });
          await walletRequest(provider, "네트워크 전환", {
            method: "wallet_switchEthereumChain",
            params: [{ chainId: chainIdHex }],
          });
        }
      }
      const challengeResponse = await fetch(`${apiBaseUrl}/auth/challenge`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletAddress: address, chainId }),
      });
      if (!challengeResponse.ok) {
        throw await apiResponseError(challengeResponse, "로그인 요청 생성 단계 실패");
      }
      const challenge = (await challengeResponse.json()) as { message: string };
      const signature = await walletRequest<string>(provider, "지갑 서명", {
        method: "personal_sign",
        params: [challenge.message, address],
      });
      const verifyResponse = await fetch(`${apiBaseUrl}/auth/verify`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: challenge.message, signature }),
      });
      if (!verifyResponse.ok) {
        throw await apiResponseError(verifyResponse, "서명 검증 단계 실패");
      }
      const next = { address, authenticated: true };
      setSession(next);
      setAuthenticationStatus("authenticated");
      return next;
    } catch (cause) {
      const message = errorDetails(cause, "지갑 연결에 실패했습니다.");
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
