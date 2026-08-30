import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  init: vi.fn(),
}));

const walletConnectRequiredMethodsForTest = [
  "eth_sendTransaction",
  "personal_sign",
];

const approvedSession = () => ({
  namespaces: {
    eip155: {
      methods: [...walletConnectRequiredMethodsForTest],
      events: ["accountsChanged", "chainChanged"],
    },
  },
});

vi.mock("@walletconnect/ethereum-provider", () => ({
  EthereumProvider: { init: mocks.init },
}));

import type { BrowserProvider } from "./config";
import {
  activeWalletConnector,
  activeWalletProvider,
  clearActiveWalletProvider,
  connectWalletProvider,
  connectedWalletProvider,
  isMobileBrowser,
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
    expect(connectedWalletProvider()).toBe(injected);
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
    const provider: {
      session?: ReturnType<typeof approvedSession>;
      connect: ReturnType<typeof vi.fn>;
      disconnect: ReturnType<typeof vi.fn>;
      request: ReturnType<typeof vi.fn>;
    } = {
      session: undefined,
      connect: vi.fn().mockImplementation(async () => { provider.session = approvedSession(); }),
      disconnect: vi.fn().mockResolvedValue(undefined),
      request: vi.fn(),
    };
    mocks.init.mockResolvedValue(provider);

    const connected = await connectWalletProvider();

    expect(mocks.init).toHaveBeenCalledWith(expect.objectContaining({
      projectId: "project-id",
      chains: [84532],
      methods: ["eth_sendTransaction", "personal_sign"],
      events: ["accountsChanged", "chainChanged"],
      optionalMethods: [
        "eth_accounts",
        "eth_requestAccounts",
        "wallet_switchEthereumChain",
        "wallet_addEthereumChain",
      ],
      rpcMap: { 84532: "https://sepolia.base.org" },
      metadata: expect.objectContaining({
        name: "기별",
        url: "https://www.gibyeol.kro.kr",
      }),
      showQrModal: true,
    }));
    expect(provider.connect).toHaveBeenCalledOnce();
    expect(connected).toEqual({ connector: "walletconnect", provider, accounts: undefined });
    expect(activeWalletProvider()).toBe(provider);
    expect(activeWalletConnector()).toBe("walletconnect");
  });

  it("detects mobile browsers while retaining an approved WalletConnect session", async () => {
    vi.stubEnv("NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID", "project-id");
    const provider = {
      session: {
        namespaces: { eip155: { methods: [...walletConnectRequiredMethodsForTest], events: ["accountsChanged", "chainChanged"] } },
      },
      connect: vi.fn(),
      disconnect: vi.fn(),
      request: vi.fn(),
    };
    mocks.init.mockResolvedValue(provider);

    await connectWalletProvider();

    expect(isMobileBrowser("Mozilla/5.0 (Linux; Android 15) Chrome/152 Mobile")).toBe(true);
    expect(isMobileBrowser("Mozilla/5.0 (Macintosh; Intel Mac OS X) Chrome/152")).toBe(false);
    expect(provider.connect).not.toHaveBeenCalled();
  });

  it("opens WalletConnect when another wallet is explicitly requested", async () => {
    vi.stubEnv("NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID", "project-id");
    const injected = { request: vi.fn() } satisfies BrowserProvider;
    const provider: {
      session?: ReturnType<typeof approvedSession>;
      connect: ReturnType<typeof vi.fn>;
      disconnect: ReturnType<typeof vi.fn>;
      request: ReturnType<typeof vi.fn>;
    } = {
      session: undefined,
      connect: vi.fn().mockImplementation(async () => { provider.session = approvedSession(); }),
      disconnect: vi.fn().mockResolvedValue(undefined),
      request: vi.fn(),
    };
    setInjectedProvider(injected);
    mocks.init.mockResolvedValue(provider);

    const connected = await connectWalletProvider({ connector: "walletconnect" });

    expect(connected).toEqual({ connector: "walletconnect", provider, accounts: undefined });
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

  it("reconnects a persisted session that lacks required signing capabilities", async () => {
    vi.stubEnv("NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID", "project-id");
    const provider: {
      session?: { namespaces: Record<string, { methods: string[]; events: string[] }> };
      connect: ReturnType<typeof vi.fn>;
      disconnect: ReturnType<typeof vi.fn>;
      request: ReturnType<typeof vi.fn>;
    } = {
      session: { namespaces: { eip155: { methods: ["personal_sign"], events: [] } } },
      connect: vi.fn().mockImplementation(async () => { provider.session = approvedSession(); }),
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
        "eth_sendTransaction",
        "personal_sign",
      ], events: ["accountsChanged", "chainChanged"] } } },
      connect: vi.fn().mockImplementation(async () => { provider.session = approvedSession(); }),
      disconnect: vi.fn().mockImplementation(async () => { provider.session = undefined; }),
      request: vi.fn(),
    };
    mocks.init.mockResolvedValue(provider);

    await connectWalletProvider({ replaceSession: true });

    expect(provider.disconnect).toHaveBeenCalledOnce();
    expect(provider.connect).toHaveBeenCalledOnce();
  });

  it("rejects a newly connected session that did not approve personal signing", async () => {
    vi.stubEnv("NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID", "project-id");
    const provider: {
      session?: { namespaces: Record<string, { methods: string[]; events: string[] }> };
      connect: ReturnType<typeof vi.fn>;
      disconnect: ReturnType<typeof vi.fn>;
      request: ReturnType<typeof vi.fn>;
    } = {
      session: undefined,
      connect: vi.fn().mockImplementation(async () => {
        provider.session = {
          namespaces: {
            eip155: { methods: ["eth_sendTransaction"], events: ["accountsChanged", "chainChanged"] },
          },
        };
      }),
      disconnect: vi.fn().mockImplementation(async () => { provider.session = undefined; }),
      request: vi.fn(),
    };
    mocks.init.mockResolvedValue(provider);

    await expect(connectWalletProvider()).rejects.toThrow("로그인 서명 권한을 승인하지 않았습니다");

    expect(provider.disconnect).toHaveBeenCalledOnce();
    expect(activeWalletConnector()).toBeUndefined();
  });
});
