import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { chainId, walletChainName } from "@/infrastructure/blockchain/config";
import {
  clearActiveWalletProvider,
  connectWalletProvider,
} from "@/infrastructure/blockchain/wallet-provider";
import { useAppStore } from "@/stores/use-app-store";
import { useWalletSession } from "./use-wallet-session";

const walletConnectMocks = vi.hoisted(() => ({ init: vi.fn() }));

vi.mock("@walletconnect/ethereum-provider", () => ({
  EthereumProvider: { init: walletConnectMocks.init },
}));

const address = "0x1111111111111111111111111111111111111111" as const;
const secondAddress = "0x2222222222222222222222222222222222222222" as const;

function cacheWalletSession(cachedAddress: `0x${string}` = address) {
  window.localStorage.setItem("gibyeol:wallet-session", JSON.stringify({
    state: { walletSession: { address: cachedAddress, authenticated: true } },
    version: 1,
  }));
}

describe("useWalletSession", () => {
  beforeEach(() => {
    walletConnectMocks.init.mockReset();
    window.localStorage.clear();
    clearActiveWalletProvider();
    delete (window as typeof window & { ethereum?: unknown }).ethereum;
    useAppStore.setState({ walletSession: null, authenticationStatus: "restoring" });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("restores the persisted wallet after the server validates its cookie", async () => {
    cacheWalletSession();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ walletAddress: address }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useWalletSession());

    expect(result.current.restoring).toBe(true);
    await waitFor(() => expect(result.current.authenticated).toBe(true));
    expect(result.current.session?.address).toBe(address);
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("/auth/session"), {
      credentials: "include",
    });
  });

  it("keeps an already validated session across client-side page remounts", async () => {
    useAppStore.setState({
      walletSession: { address, authenticated: true },
      authenticationStatus: "authenticated",
    });
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useWalletSession());

    await waitFor(() => expect(result.current.authenticated).toBe(true));
    expect(result.current.session?.address).toBe(address);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("clears a persisted wallet when the server session has expired", async () => {
    cacheWalletSession();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));

    const { result } = renderHook(() => useWalletSession());

    await waitFor(() => expect(result.current.restoring).toBe(false));
    expect(result.current.authenticated).toBe(false);
    expect(result.current.session).toBeNull();
  });

  it("shows the anonymous state without a server request when no session is cached", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useWalletSession());

    await waitFor(() => expect(result.current.restoring).toBe(false));
    expect(result.current.session).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("restores the server session without trusting an unrelated injected wallet", async () => {
    cacheWalletSession();
    (window as typeof window & { ethereum?: { request: ReturnType<typeof vi.fn> } }).ethereum = {
      request: vi.fn().mockResolvedValue(["0x2222222222222222222222222222222222222222"]),
    };
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ walletAddress: address }) })
    );

    const { result } = renderHook(() => useWalletSession());

    await waitFor(() => expect(result.current.restoring).toBe(false));
    expect(result.current.session?.address).toBe(address);
    expect(result.current.authenticated).toBe(true);
  });

  it("restores a selected account even when it is not first in the wallet list", async () => {
    cacheWalletSession(secondAddress);
    (window as typeof window & { ethereum?: { request: ReturnType<typeof vi.fn> } }).ethereum = {
      request: vi.fn().mockResolvedValue([address, secondAddress]),
    };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ walletAddress: secondAddress }),
    }));

    const { result } = renderHook(() => useWalletSession());

    await waitFor(() => expect(result.current.authenticated).toBe(true));
    expect(result.current.session?.address).toBe(secondAddress);
  });

  it("keeps the session when a mobile wallet briefly reports an empty account list", async () => {
    cacheWalletSession();
    let accountsChanged: (() => void) | undefined;
    const provider = {
      request: vi.fn().mockResolvedValue([]),
      on: vi.fn((_event: string, listener: () => void) => { accountsChanged = listener; }),
      removeListener: vi.fn(),
    };
    (window as typeof window & { ethereum?: typeof provider }).ethereum = provider;
    await connectWalletProvider();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ walletAddress: address }),
    }));

    const { result } = renderHook(() => useWalletSession());
    await waitFor(() => expect(result.current.authenticated).toBe(true));
    await waitFor(() => expect(accountsChanged).toBeTypeOf("function"));

    vi.useFakeTimers();
    await act(async () => {
      accountsChanged?.();
      await vi.advanceTimersByTimeAsync(1_000);
    });

    expect(result.current.authenticated).toBe(true);
    expect(result.current.session?.address).toBe(address);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("blocks wallet actions without deleting the server session after an account change", async () => {
    cacheWalletSession();
    let accountsChanged: (() => void) | undefined;
    const provider = {
      request: vi.fn().mockResolvedValue([secondAddress]),
      on: vi.fn((_event: string, listener: () => void) => { accountsChanged = listener; }),
      removeListener: vi.fn(),
    };
    (window as typeof window & { ethereum?: typeof provider }).ethereum = provider;
    await connectWalletProvider();
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ walletAddress: address }) })
      .mockResolvedValueOnce({ ok: true });
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useWalletSession());
    await waitFor(() => expect(result.current.authenticated).toBe(true));
    await waitFor(() => expect(accountsChanged).toBeTypeOf("function"));

    vi.useFakeTimers();
    await act(async () => {
      accountsChanged?.();
      await vi.advanceTimersByTimeAsync(1_000);
    });

    expect(result.current.authenticated).toBe(false);
    expect(result.current.session?.address).toBe(address);
    expect(result.current.error).toContain("계정이 변경되었습니다");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(window.localStorage.getItem("gibyeol:wallet-session")).toContain(address);
  });

  it("does not persist the authentication token in browser storage", async () => {
    await act(async () => {
      useAppStore.setState({
        walletSession: { address, authenticated: true },
        authenticationStatus: "authenticated",
      });
    });

    const persisted = window.localStorage.getItem("gibyeol:wallet-session") ?? "";
    expect(persisted).toContain(address);
    expect(persisted).not.toContain("token");
  });

  it("logs out from the server and clears the persisted wallet", async () => {
    cacheWalletSession();
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ walletAddress: address }) })
      .mockResolvedValueOnce({ ok: true });
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useWalletSession());
    await waitFor(() => expect(result.current.authenticated).toBe(true));

    await act(async () => { await result.current.logout(); });

    expect(result.current.authenticated).toBe(false);
    expect(result.current.session).toBeNull();
    expect(window.localStorage.getItem("gibyeol:wallet-session")).not.toContain(address);
    expect(fetchMock).toHaveBeenLastCalledWith(expect.stringContaining("/auth/logout"), {
      method: "POST",
      credentials: "include",
    });
  });

  it("replaces raw JSON-RPC details with actionable guidance", async () => {
    const providerError = { code: -32603, message: "Internal JSON-RPC error." };
    (window as typeof window & { ethereum?: { request: ReturnType<typeof vi.fn> } }).ethereum = {
      request: vi.fn()
        .mockResolvedValueOnce([address])
        .mockResolvedValueOnce(`0x${chainId.toString(16)}`)
        .mockRejectedValueOnce(providerError),
    };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ message: "Sign in to Gibyeol" }),
    }));

    const { result } = renderHook(() => useWalletSession());
    await waitFor(() => expect(result.current.restoring).toBe(false));

    let thrown: unknown;
    await act(async () => {
      try {
        await result.current.connect();
      } catch (cause) {
        thrown = cause;
      }
    });
    expect(thrown).toBeInstanceOf(Error);
    expect(result.current.error).toBe("블록체인 네트워크 응답이 원활하지 않습니다. 잠시 후 다시 시도해 주세요.");
  });

  it("adds an unknown chain before switching and signing in", async () => {
    const request = vi.fn()
      .mockResolvedValueOnce([address])
      .mockResolvedValueOnce("0x1")
      .mockRejectedValueOnce({ code: 4902, message: "Unrecognized chain ID" })
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce("0xsignature");
    (window as typeof window & { ethereum?: { request: ReturnType<typeof vi.fn> } }).ethereum = { request };
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ message: "Sign in to Gibyeol" }),
      })
      .mockResolvedValueOnce({ ok: true }));

    const { result } = renderHook(() => useWalletSession());
    await waitFor(() => expect(result.current.restoring).toBe(false));

    await act(async () => { await result.current.connect(); });

    expect(result.current.authenticated).toBe(true);
    expect(request.mock.calls.map(([args]) => args.method)).toEqual([
      "eth_requestAccounts",
      "eth_chainId",
      "wallet_switchEthereumChain",
      "wallet_addEthereumChain",
      "wallet_switchEthereumChain",
      "personal_sign",
    ]);
    expect(request.mock.calls[3]?.[0]).toMatchObject({
      params: [{
        chainId: `0x${chainId.toString(16)}`,
        chainName: walletChainName,
      }],
    });
  });

  it("lets the user choose one of the accounts shared by the wallet", async () => {
    const request = vi.fn()
      .mockResolvedValueOnce([address, secondAddress])
      .mockResolvedValueOnce(`0x${chainId.toString(16)}`)
      .mockResolvedValueOnce("0xsignature");
    (window as typeof window & { ethereum?: { request: ReturnType<typeof vi.fn> } }).ethereum = { request };
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ message: "Sign in to Gibyeol" }),
      })
      .mockResolvedValueOnce({ ok: true });
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useWalletSession());
    await waitFor(() => expect(result.current.restoring).toBe(false));

    await act(async () => { await result.current.connect(); });

    expect(result.current.availableAccounts).toEqual([address, secondAddress]);
    expect(result.current.authenticated).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();

    await act(async () => { await result.current.selectAccount(secondAddress); });

    expect(result.current.availableAccounts).toEqual([]);
    expect(result.current.session?.address).toBe(secondAddress);
    expect(result.current.authenticated).toBe(true);
    expect(JSON.parse(fetchMock.mock.calls[0]?.[1]?.body as string)).toMatchObject({
      walletAddress: secondAddress,
      chainId,
    });
    expect(request).toHaveBeenLastCalledWith({
      method: "personal_sign",
      params: ["Sign in to Gibyeol", secondAddress],
    });
  });

  it("waits for a second user gesture before requesting a mobile WalletConnect signature", async () => {
    vi.spyOn(navigator, "userAgent", "get").mockReturnValue("Mozilla/5.0 (Linux; Android 15) Chrome/152 Mobile");
    vi.stubEnv("NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID", "project-id");
    const request = vi.fn(async ({ method }: { method: string }) => {
      if (method === "eth_requestAccounts") return [address];
      if (method === "eth_chainId") return `0x${chainId.toString(16)}`;
      if (method === "personal_sign") return "0xsignature";
      return null;
    });
    const walletConnectProvider: {
      accounts: string[];
      session?: {
        requiredNamespaces: Record<string, { chains: string[]; methods: string[]; events: string[] }>;
        namespaces: Record<string, {
          accounts: string[];
          chains: string[];
          methods: string[];
          events: string[];
        }>;
      };
      connect: ReturnType<typeof vi.fn>;
      disconnect: ReturnType<typeof vi.fn>;
      request: typeof request;
    } = {
      accounts: [address],
      session: undefined,
      connect: vi.fn().mockImplementation(async () => {
        walletConnectProvider.session = {
          requiredNamespaces: {
            eip155: {
              chains: [`eip155:${chainId}`],
              methods: ["eth_sendTransaction", "personal_sign"],
              events: ["accountsChanged", "chainChanged"],
            },
          },
          namespaces: {
            eip155: {
              accounts: [`eip155:${chainId}:${address}`],
              chains: [`eip155:${chainId}`],
              methods: ["eth_sendTransaction", "personal_sign"],
              events: ["accountsChanged", "chainChanged"],
            },
          },
        };
      }),
      disconnect: vi.fn().mockResolvedValue(undefined),
      request,
    };
    walletConnectMocks.init.mockResolvedValue(walletConnectProvider);
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ message: "Sign in to Gibyeol" }) })
      .mockResolvedValueOnce({ ok: true });
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useWalletSession());
    await waitFor(() => expect(result.current.restoring).toBe(false));
    await act(async () => { await result.current.connect(); });

    expect(result.current.pendingSignatureAddress).toBe(address);
    expect(request).not.toHaveBeenCalledWith(expect.objectContaining({ method: "eth_requestAccounts" }));
    expect(request).not.toHaveBeenCalledWith(expect.objectContaining({ method: "personal_sign" }));
    expect(fetchMock).not.toHaveBeenCalled();

    await act(async () => { await result.current.continueAuthentication(); });

    expect(request).toHaveBeenCalledWith({ method: "personal_sign", params: ["Sign in to Gibyeol", address] });
    expect(result.current.authenticated).toBe(true);
    expect(result.current.pendingSignatureAddress).toBeUndefined();
  });

  it("replaces the WalletConnect provider before changing wallets and signing in again", async () => {
    vi.spyOn(navigator, "userAgent", "get").mockReturnValue("Mozilla/5.0 (Linux; Android 15) Chrome/152 Mobile");
    vi.stubEnv("NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID", "project-id");
    const request = vi.fn(async ({ method }: { method: string }) => {
      if (method === "eth_chainId") return `0x${chainId.toString(16)}`;
      if (method === "personal_sign") return "0xsignature";
      return null;
    });
    const approvedWalletSession = () => ({
      namespaces: {
        eip155: {
          accounts: [`eip155:${chainId}:${address}`],
          chains: [`eip155:${chainId}`],
          methods: ["eth_sendTransaction", "personal_sign"],
          events: ["accountsChanged", "chainChanged"],
        },
      },
    });
    type MockWalletConnectProvider = {
      accounts: string[];
      session?: ReturnType<typeof approvedWalletSession>;
      connect: ReturnType<typeof vi.fn>;
      disconnect: ReturnType<typeof vi.fn>;
      request: typeof request;
    };
    const firstProvider: MockWalletConnectProvider = {
      accounts: [address],
      session: undefined,
      connect: vi.fn().mockImplementation(async () => {
        firstProvider.session = approvedWalletSession();
      }),
      disconnect: vi.fn().mockImplementation(async () => {
        firstProvider.session = undefined;
      }),
      request,
    };
    const replacementProvider: MockWalletConnectProvider = {
      accounts: [address],
      session: undefined,
      connect: vi.fn().mockImplementation(async () => {
        replacementProvider.session = approvedWalletSession();
      }),
      disconnect: vi.fn().mockImplementation(async () => {
        replacementProvider.session = undefined;
      }),
      request,
    };
    walletConnectMocks.init
      .mockResolvedValueOnce(firstProvider)
      .mockResolvedValueOnce(replacementProvider);
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ message: "First challenge" }) })
      .mockResolvedValueOnce({ ok: true })
      .mockResolvedValueOnce({ ok: true })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ message: "Second challenge" }) })
      .mockResolvedValueOnce({ ok: true }));

    const { result } = renderHook(() => useWalletSession());
    await waitFor(() => expect(result.current.restoring).toBe(false));
    await act(async () => { await result.current.connect(); });
    await act(async () => { await result.current.continueAuthentication(); });
    expect(result.current.authenticated).toBe(true);

    await act(async () => { await result.current.changeWallet(); });
    expect(result.current.authenticated).toBe(false);
    expect(result.current.pendingSignatureAddress).toBe(address);
    await act(async () => { await result.current.continueAuthentication(); });

    expect(walletConnectMocks.init).toHaveBeenCalledTimes(2);
    expect(firstProvider.disconnect).toHaveBeenCalledOnce();
    expect(firstProvider.connect).toHaveBeenCalledOnce();
    expect(replacementProvider.connect).toHaveBeenCalledOnce();
    expect(request.mock.calls.filter(([args]) => args.method === "personal_sign")).toHaveLength(2);
    expect(result.current.authenticated).toBe(true);
  });

  it("keeps the WalletConnect session available after logout and signs in again", async () => {
    vi.spyOn(navigator, "userAgent", "get").mockReturnValue("Mozilla/5.0 (Linux; Android 15) Chrome/152 Mobile");
    vi.stubEnv("NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID", "project-id");
    const request = vi.fn(async ({ method }: { method: string }) => {
      if (method === "eth_chainId") return `0x${chainId.toString(16)}`;
      if (method === "personal_sign") return "0xsignature";
      return null;
    });
    const approvedWalletSession = () => ({
      namespaces: {
        eip155: {
          accounts: [`eip155:${chainId}:${address}`],
          chains: [`eip155:${chainId}`],
          methods: ["eth_sendTransaction", "personal_sign"],
          events: ["accountsChanged", "chainChanged"],
        },
      },
    });
    const walletConnectProvider: {
      accounts: string[];
      session?: ReturnType<typeof approvedWalletSession>;
      connect: ReturnType<typeof vi.fn>;
      disconnect: ReturnType<typeof vi.fn>;
      request: typeof request;
    } = {
      accounts: [address],
      session: undefined,
      connect: vi.fn().mockImplementation(async () => {
        walletConnectProvider.session = approvedWalletSession();
      }),
      disconnect: vi.fn().mockImplementation(async () => {
        walletConnectProvider.session = undefined;
      }),
      request,
    };
    walletConnectMocks.init.mockResolvedValue(walletConnectProvider);
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ message: "First challenge" }) })
      .mockResolvedValueOnce({ ok: true })
      .mockResolvedValueOnce({ ok: true })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ message: "Second challenge" }) })
      .mockResolvedValueOnce({ ok: true }));

    const { result } = renderHook(() => useWalletSession());
    await waitFor(() => expect(result.current.restoring).toBe(false));
    await act(async () => { await result.current.connect(); });
    await act(async () => { await result.current.continueAuthentication(); });
    expect(result.current.authenticated).toBe(true);

    await act(async () => { await result.current.logout(); });
    expect(result.current.authenticated).toBe(false);
    await act(async () => { await result.current.connect(); });
    await act(async () => { await result.current.continueAuthentication(); });

    expect(walletConnectMocks.init).toHaveBeenCalledOnce();
    expect(walletConnectProvider.disconnect).not.toHaveBeenCalled();
    expect(walletConnectProvider.connect).toHaveBeenCalledOnce();
    expect(request.mock.calls.filter(([args]) => args.method === "personal_sign")).toHaveLength(2);
    expect(result.current.authenticated).toBe(true);
  });

  it("asks an injected wallet to approve accounts again when changing accounts", async () => {
    cacheWalletSession();
    const request = vi.fn(async ({ method }: { method: string }) => {
      if (method === "eth_accounts") return [address];
      if (method === "wallet_requestPermissions") return [{ parentCapability: "eth_accounts" }];
      if (method === "eth_requestAccounts") return [secondAddress];
      if (method === "eth_chainId") return `0x${chainId.toString(16)}`;
      if (method === "personal_sign") return "0xsignature";
      return null;
    });
    (window as typeof window & { ethereum?: { request: typeof request } }).ethereum = { request };
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ walletAddress: address }) })
      .mockResolvedValueOnce({ ok: true })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ message: "Sign in to Gibyeol" }) })
      .mockResolvedValueOnce({ ok: true });
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useWalletSession());
    await waitFor(() => expect(result.current.authenticated).toBe(true));

    await act(async () => { await result.current.changeAccount(); });

    expect(request).toHaveBeenCalledWith({
      method: "wallet_requestPermissions",
      params: [{ eth_accounts: {} }],
    });
    expect(result.current.session?.address).toBe(secondAddress);
    expect(result.current.authenticated).toBe(true);
  });

  it("translates backend signature verification errors", async () => {
    (window as typeof window & { ethereum?: { request: ReturnType<typeof vi.fn> } }).ethereum = {
      request: vi.fn()
        .mockResolvedValueOnce([address])
        .mockResolvedValueOnce(`0x${chainId.toString(16)}`)
        .mockResolvedValueOnce("0xsignature"),
    };
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ message: "Sign in to Gibyeol" }),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ error: { code: "SIWE_INVALID", message: "Signature is invalid." } }),
      }));

    const { result } = renderHook(() => useWalletSession());
    await waitFor(() => expect(result.current.restoring).toBe(false));

    let thrown: unknown;
    await act(async () => {
      try {
        await result.current.connect();
      } catch (cause) {
        thrown = cause;
      }
    });
    expect(thrown).toBeInstanceOf(Error);
    expect(result.current.error).toBe("지갑 서명을 확인하지 못했습니다. 다시 서명해 주세요.");
  });
});
