"use client";

import { useCallback, useEffect, useState } from "react";
import {
  apiBaseUrl,
  chain,
  chainId,
  rpcUrl,
  walletChainName,
} from "@/infrastructure/blockchain/config";
import {
  activeWalletConnector,
  activeWalletProvider,
  clearActiveWalletProvider,
  connectWalletProvider,
  connectedWalletProvider,
  injectedWalletProvider,
} from "@/infrastructure/blockchain/wallet-provider";
import type { WalletConnector } from "@/infrastructure/blockchain/wallet-provider";
import { useAppStore } from "@/stores/use-app-store";

type SessionResponse = { walletAddress: `0x${string}` };
type ErrorPayload = { error?: { code?: unknown; message?: unknown } };
export type WalletPendingAction = "connect" | "account" | "change" | "logout" | null;

type AuthenticationAction = Exclude<WalletPendingAction, "logout" | null>;

function walletAddresses(value: unknown): `0x${string}`[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value
    .filter(isWalletAddress)
    .map((address) => address.toLowerCase() as `0x${string}`))];
}

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
  const [pendingAction, setPendingAction] = useState<WalletPendingAction>(null);
  const [availableAccounts, setAvailableAccounts] = useState<`0x${string}`[]>([]);
  const [accountSelectionAction, setAccountSelectionAction] = useState<AuthenticationAction | null>(null);
  const [walletAccountMismatch, setWalletAccountMismatch] = useState(false);

  const forgetSession = useCallback((notifyServer = false) => {
    setSession(null);
    setAuthenticationStatus("anonymous");
    setWalletAccountMismatch(false);
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
      const currentState = useAppStore.getState();
      // App Router의 페이지 이동에서는 이미 검증된 메모리 세션을 그대로 사용한다.
      // 전체 새로고침으로 메모리가 초기화된 경우에만 저장소와 서버를 다시 확인한다.
      if (currentState.walletSession && currentState.authenticationStatus === "authenticated") {
        return;
      }
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
    // 새로고침 뒤 발견된 임의의 injected wallet은 SIWE에 사용한 지갑이라는 보장이 없다.
    // 현재 실행 중 사용자가 명시적으로 연결한 provider의 이벤트만 세션에 반영한다.
    const provider = connectedWalletProvider() as EventedWalletProvider;
    if (!provider?.on) return;
    let confirmationTimer: ReturnType<typeof setTimeout> | undefined;

    const handleAccountsChanged = () => {
      if (confirmationTimer) clearTimeout(confirmationTimer);
      confirmationTimer = setTimeout(() => {
        void provider.request({ method: "eth_accounts" })
          .then((accounts) => {
            const confirmedAccounts = walletAddresses(accounts);
            // 새로고침이나 지갑 앱 복귀 직후에는 WalletConnect가 일시적으로 빈 계정 목록을
            // 보낼 수 있다. 서버 세션은 유효하므로 실제 다른 주소가 확인될 때만 해제한다.
            if (confirmedAccounts.length === 0 || confirmedAccounts.includes(session.address)) return;
            setError("지갑에서 계정이 변경되었습니다. 변경한 계정으로 다시 로그인해 주세요.");
            // provider 이벤트만으로 서버 세션을 삭제하지 않는다. 사용자가 계정 변경이나
            // 로그아웃을 명시적으로 선택하기 전까지 HttpOnly 세션 쿠키를 보존한다.
            setWalletAccountMismatch(true);
          })
          .catch(() => {
            // 모바일 지갑에서 브라우저로 돌아오는 동안의 일시적인 provider 중단은 무시한다.
          });
      }, 1_000);
    };
    provider.on("accountsChanged", handleAccountsChanged);
    return () => {
      if (confirmationTimer) clearTimeout(confirmationTimer);
      provider.removeListener?.("accountsChanged", handleAccountsChanged);
    };
  }, [session]);

  const authenticateAddress = useCallback(async (
    provider: NonNullable<ReturnType<typeof activeWalletProvider>>,
    address: `0x${string}`,
  ) => {
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
              chainName: walletChainName,
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
      setWalletAccountMismatch(false);
      return next;
  }, [setAuthenticationStatus, setSession]);

  const authenticate = useCallback(async (
    action: AuthenticationAction = "connect",
    options: { replaceSession?: boolean; connector?: WalletConnector | "auto" } = {},
  ) => {
    setPendingAction(action);
    setError(null);
    setAvailableAccounts([]);
    setAccountSelectionAction(null);
    try {
      const { provider } = await connectWalletProvider(options);
      const accounts = walletAddresses(await walletRequest<string[]>(provider, "지갑 계정 연결", {
        method: "eth_requestAccounts",
      }));
      if (accounts.length === 0) throw new Error("연결된 계정이 없습니다.");
      if (accounts.length > 1) {
        setAvailableAccounts(accounts);
        setAccountSelectionAction(action);
        return undefined;
      }
      return await authenticateAddress(provider, accounts[0]);
    } catch (cause) {
      const message = errorDetails(cause, "지갑 연결에 실패했습니다.");
      setError(message);
      throw cause;
    } finally {
      setPendingAction(null);
    }
  }, [authenticateAddress]);

  const connect = useCallback(() => authenticate("connect"), [authenticate]);

  const clearAuthenticatedSession = useCallback(async () => {
    await fetch(`${apiBaseUrl}/auth/logout`, {
      method: "POST",
      credentials: "include",
    }).catch(() => undefined);
    setSession(null);
    setAuthenticationStatus("anonymous");
    setWalletAccountMismatch(false);
  }, [setAuthenticationStatus, setSession]);

  const changeAccount = useCallback(async () => {
    const connector = activeWalletConnector() ?? "auto";
    await clearAuthenticatedSession();
    return authenticate("account", { replaceSession: true, connector });
  }, [authenticate, clearAuthenticatedSession]);

  const changeWallet = useCallback(async () => {
    const currentConnector = activeWalletConnector();
    const nextConnector: WalletConnector = currentConnector === "injected"
      ? "walletconnect"
      : injectedWalletProvider() ? "injected" : "walletconnect";
    await clearAuthenticatedSession();
    clearActiveWalletProvider();
    return authenticate("change", {
      replaceSession: nextConnector === "walletconnect",
      connector: nextConnector,
    });
  }, [authenticate, clearAuthenticatedSession]);

  const selectAccount = useCallback(async (address: string) => {
    const normalizedAddress = address.toLowerCase() as `0x${string}`;
    if (!availableAccounts.includes(normalizedAddress)) {
      setError("선택할 수 없는 지갑 계정입니다.");
      return undefined;
    }
    const provider = activeWalletProvider();
    if (!provider) {
      setError("연결된 지갑을 찾을 수 없습니다. 다시 연결해 주세요.");
      return undefined;
    }

    setPendingAction(accountSelectionAction ?? "connect");
    setError(null);
    try {
      const next = await authenticateAddress(provider, normalizedAddress);
      setAvailableAccounts([]);
      setAccountSelectionAction(null);
      return next;
    } catch (cause) {
      setError(errorDetails(cause, "선택한 계정으로 로그인하지 못했습니다."));
      throw cause;
    } finally {
      setPendingAction(null);
    }
  }, [accountSelectionAction, authenticateAddress, availableAccounts]);

  const cancelAccountSelection = useCallback(() => {
    setAvailableAccounts([]);
    setAccountSelectionAction(null);
    setError(null);
  }, []);

  const logout = useCallback(async () => {
    setPendingAction("logout");
    setError(null);
    try {
      const response = await fetch(`${apiBaseUrl}/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
      if (!response.ok) throw await apiResponseError(response, "로그아웃 단계 실패");
    } catch (cause) {
      setError(errorDetails(cause, "서버 로그아웃 요청에 실패했습니다."));
    } finally {
      setSession(null);
      setAuthenticationStatus("anonymous");
      setWalletAccountMismatch(false);
      clearActiveWalletProvider();
      setPendingAction(null);
    }
  }, [setAuthenticationStatus, setSession]);

  return {
    session,
    error,
    busy: pendingAction !== null,
    pendingAction,
    availableAccounts,
    restoring: authenticationStatus === "restoring",
    authenticated: authenticationStatus === "authenticated" && !walletAccountMismatch,
    connect,
    selectAccount,
    cancelAccountSelection,
    changeAccount,
    changeWallet,
    logout,
  };
}
