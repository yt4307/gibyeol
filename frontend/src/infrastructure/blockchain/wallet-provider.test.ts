import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  init: vi.fn(),
}));

vi.mock("@walletconnect/ethereum-provider", () => ({
  EthereumProvider: { init: mocks.init },
}));

import type { BrowserProvider } from "./config";
import {
  activeWalletConnector,
  activeWalletProvider,
  clearActiveWalletProvider,
  connectWalletProvider,
} from "./wallet-provider";

function setInjectedProvider(provider?: BrowserProvider) {
  Object.defineProperty(window, "ethereum", {
    configurable: true,
    value: provider,
  });
}

describe("wallet provider selection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("NEXT_PUBLIC_CHAIN_ID", "84532");
    vi.stubEnv("NEXT_PUBLIC_RPC_URL", "https://sepolia.base.org");
    vi.stubEnv("NEXT_PUBLIC_WEB_ORIGIN", "https://www.gibyeol.kro.kr");
    clearActiveWalletProvider();
    setInjectedProvider(undefined);
  });

  afterEach(() => {
    clearActiveWalletProvider();
    setInjectedProvider(undefined);
    vi.unstubAllEnvs();
  });

  it("prefers a wallet injected by a browser or wallet app", async () => {
    const injected = { request: vi.fn() } satisfies BrowserProvider;
    setInjectedProvider(injected);

    const connected = await connectWalletProvider();

    expect(connected).toEqual({ connector: "injected", provider: injected });
    expect(activeWalletProvider()).toBe(injected);
    expect(activeWalletConnector()).toBe("injected");
    expect(mocks.init).not.toHaveBeenCalled();
  });

  it("requests account selection when replacing an injected wallet", async () => {
    const injected = { request: vi.fn().mockResolvedValue(undefined) } satisfies BrowserProvider;
    setInjectedProvider(injected);

    await connectWalletProvider({ replaceSession: true });

    expect(injected.request).toHaveBeenCalledWith({
      method: "wallet_requestPermissions",
      params: [{ eth_accounts: {} }],
    });
  });

  it("explains missing WalletConnect configuration when no wallet is injected", async () => {
    vi.stubEnv("NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID", "");

    await expect(connectWalletProvider()).rejects.toThrow(
      "모바일 지갑 연결 설정이 완료되지 않았습니다.",
    );
  });

  it("opens WalletConnect and keeps its provider for later transactions", async () => {
    vi.stubEnv("NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID", "project-id");
    const provider = {
      session: undefined,
      connect: vi.fn().mockResolvedValue(undefined),
      disconnect: vi.fn().mockResolvedValue(undefined),
      request: vi.fn(),
    };
    mocks.init.mockResolvedValue(provider);

    const connected = await connectWalletProvider();

    expect(mocks.init).toHaveBeenCalledWith(expect.objectContaining({
      projectId: "project-id",
      optionalChains: [84532],
      optionalMethods: [
        "eth_requestAccounts",
        "eth_sendTransaction",
        "personal_sign",
        "wallet_switchEthereumChain",
        "wallet_addEthereumChain",
      ],
      optionalEvents: ["accountsChanged", "chainChanged"],
      rpcMap: { 84532: "https://sepolia.base.org" },
      metadata: expect.objectContaining({
        name: "기별",
        url: "https://www.gibyeol.kro.kr",
      }),
      showQrModal: true,
    }));
    expect(provider.connect).toHaveBeenCalledOnce();
    expect(connected).toEqual({ connector: "walletconnect", provider });
    expect(activeWalletProvider()).toBe(provider);
    expect(activeWalletConnector()).toBe("walletconnect");
  });

  it("opens WalletConnect when another wallet is explicitly requested", async () => {
    vi.stubEnv("NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID", "project-id");
    const injected = { request: vi.fn() } satisfies BrowserProvider;
    const provider = {
      session: undefined,
      connect: vi.fn().mockResolvedValue(undefined),
      disconnect: vi.fn().mockResolvedValue(undefined),
      request: vi.fn(),
    };
    setInjectedProvider(injected);
    mocks.init.mockResolvedValue(provider);

    const connected = await connectWalletProvider({ connector: "walletconnect" });

    expect(connected).toEqual({ connector: "walletconnect", provider });
    expect(injected.request).not.toHaveBeenCalled();
    expect(provider.connect).toHaveBeenCalledOnce();
  });

  it("does not silently replace a requested injected wallet with WalletConnect", async () => {
    vi.stubEnv("NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID", "project-id");

    await expect(connectWalletProvider({ connector: "injected" })).rejects.toThrow(
      "브라우저에 설치된 지갑을 찾을 수 없습니다.",
    );
    expect(mocks.init).not.toHaveBeenCalled();
  });

  it("reconnects a persisted session that lacks chain management methods", async () => {
    vi.stubEnv("NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID", "project-id");
    const provider: {
      session?: { namespaces: Record<string, { methods: string[]; events: string[] }> };
      connect: ReturnType<typeof vi.fn>;
      disconnect: ReturnType<typeof vi.fn>;
      request: ReturnType<typeof vi.fn>;
    } = {
      session: { namespaces: { eip155: { methods: ["personal_sign"], events: [] } } },
      connect: vi.fn().mockResolvedValue(undefined),
      disconnect: vi.fn().mockImplementation(async () => { provider.session = undefined; }),
      request: vi.fn(),
    };
    mocks.init.mockResolvedValue(provider);

    await connectWalletProvider();

    expect(provider.disconnect).toHaveBeenCalledOnce();
    expect(provider.connect).toHaveBeenCalledOnce();
  });

  it("disconnects an approved WalletConnect session before choosing another wallet", async () => {
    vi.stubEnv("NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID", "project-id");
    const provider: {
      session?: { namespaces: Record<string, { methods: string[]; events: string[] }> };
      connect: ReturnType<typeof vi.fn>;
      disconnect: ReturnType<typeof vi.fn>;
      request: ReturnType<typeof vi.fn>;
    } = {
      session: { namespaces: { eip155: { methods: [
        "eth_requestAccounts",
        "eth_sendTransaction",
        "personal_sign",
        "wallet_switchEthereumChain",
        "wallet_addEthereumChain",
      ], events: ["accountsChanged", "chainChanged"] } } },
      connect: vi.fn().mockResolvedValue(undefined),
      disconnect: vi.fn().mockImplementation(async () => { provider.session = undefined; }),
      request: vi.fn(),
    };
    mocks.init.mockResolvedValue(provider);

    await connectWalletProvider({ replaceSession: true });

    expect(provider.disconnect).toHaveBeenCalledOnce();
    expect(provider.connect).toHaveBeenCalledOnce();
  });
});
