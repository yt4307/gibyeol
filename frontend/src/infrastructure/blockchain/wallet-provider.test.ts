import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  init: vi.fn(),
}));

const walletConnectRequiredMethodsForTest = [
  "eth_sendTransaction",
  "personal_sign",
];

const approvedSession = () => ({
  requiredNamespaces: {
    eip155: {
      chains: ["eip155:84532"],
      methods: [...walletConnectRequiredMethodsForTest],
      events: ["accountsChanged", "chainChanged"],
    },
  },
  namespaces: {
    eip155: {
      accounts: ["eip155:84532:0x1111111111111111111111111111111111111111"],
      chains: ["eip155:84532"],
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
  connectedWalletAppLink,
  connectedWalletProvider,
  disconnectActiveWalletSession,
  ensureWalletProvider,
  isIOSBrowser,
  isMobileBrowser,
  openConnectedWalletApp,
  restoreWalletProvider,
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
    vi.spyOn(navigator, "userAgent", "get").mockReturnValue("Mozilla/5.0 (Linux; Android 15) Chrome/152 Mobile");
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
      customStoragePrefix: "gibyeol-wallet-v2",
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
    expect(mocks.init.mock.calls[0]?.[0]?.metadata).toEqual(expect.objectContaining({
      redirect: { universal: "https://www.gibyeol.kro.kr" },
    }));
  });

  it("restores a persisted WalletConnect session without opening the connection screen", async () => {
    vi.stubEnv("NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID", "project-id");
    const provider = {
      session: approvedSession(),
      accounts: ["0x1111111111111111111111111111111111111111"],
      connect: vi.fn(),
      disconnect: vi.fn(),
      request: vi.fn(),
    };
    mocks.init.mockResolvedValue(provider);

    const restored = await restoreWalletProvider();

    expect(restored).toEqual({ connector: "walletconnect", provider, accounts: provider.accounts });
    expect(provider.connect).not.toHaveBeenCalled();
    expect(activeWalletProvider()).toBe(provider);
  });

  it("does not open WalletConnect when no persisted session exists", async () => {
    vi.stubEnv("NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID", "project-id");
    const provider = {
      session: undefined,
      connect: vi.fn(),
      disconnect: vi.fn(),
      request: vi.fn(),
    };
    mocks.init.mockResolvedValue(provider);

    await expect(restoreWalletProvider()).resolves.toBeUndefined();

    expect(provider.connect).not.toHaveBeenCalled();
    expect(activeWalletProvider()).toBeUndefined();
  });

  it("recovers the persisted provider again at transaction time", async () => {
    vi.stubEnv("NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID", "project-id");
    const account = "0x1111111111111111111111111111111111111111";
    const provider = {
      session: approvedSession(),
      accounts: [account],
      connect: vi.fn(),
      disconnect: vi.fn(),
      request: vi.fn(),
    };
    mocks.init.mockResolvedValue(provider);

    await expect(ensureWalletProvider(account)).resolves.toBe(provider);

    expect(provider.connect).not.toHaveBeenCalled();
    expect(provider.request).not.toHaveBeenCalled();
  });

  it("omits automatic WalletConnect redirects on iOS to preserve the original browser tab", async () => {
    vi.spyOn(navigator, "userAgent", "get").mockReturnValue(
      "Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 CriOS/152 Mobile/15E148 Safari/604.1",
    );
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

    await connectWalletProvider();

    expect(mocks.init.mock.calls[0]?.[0]?.metadata).not.toHaveProperty("redirect");
  });

  it("disconnects a WalletConnect session while retaining its SDK instance", async () => {
    vi.stubEnv("NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID", "project-id");
    const provider: {
      session?: ReturnType<typeof approvedSession>;
      connect: ReturnType<typeof vi.fn>;
      disconnect: ReturnType<typeof vi.fn>;
      request: ReturnType<typeof vi.fn>;
    } = {
      session: undefined,
      connect: vi.fn().mockImplementation(async () => { provider.session = approvedSession(); }),
      disconnect: vi.fn().mockImplementation(async () => { provider.session = undefined; }),
      request: vi.fn(),
    };
    mocks.init.mockResolvedValue(provider);

    await connectWalletProvider();
    await disconnectActiveWalletSession();
    await connectWalletProvider();

    expect(mocks.init).toHaveBeenCalledOnce();
    expect(provider.disconnect).toHaveBeenCalledOnce();
    expect(provider.connect).toHaveBeenCalledTimes(2);
  });

  it("detects mobile browsers while retaining an approved WalletConnect session", async () => {
    vi.stubEnv("NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID", "project-id");
    const provider = {
      session: approvedSession(),
      connect: vi.fn(),
      disconnect: vi.fn(),
      request: vi.fn(),
    };
    mocks.init.mockResolvedValue(provider);

    await connectWalletProvider();

    expect(isMobileBrowser("Mozilla/5.0 (Linux; Android 15) Chrome/152 Mobile")).toBe(true);
    expect(isMobileBrowser("Mozilla/5.0 (Macintosh; Intel Mac OS X) Chrome/152")).toBe(false);
    expect(isIOSBrowser("Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X)")).toBe(true);
    expect(isIOSBrowser("Mozilla/5.0 (Macintosh; Intel Mac OS X)", "MacIntel", 5)).toBe(true);
    expect(isIOSBrowser("Mozilla/5.0 (Macintosh; Intel Mac OS X)", "MacIntel", 0)).toBe(false);
    expect(provider.connect).not.toHaveBeenCalled();
  });

  it("opens the connected wallet's native app link in the same browser tab", () => {
    const provider = {
      request: vi.fn(),
      session: {
        namespaces: {},
        peer: { metadata: { redirect: {
          native: "metamask://",
          universal: "https://metamask.app.link",
        } } },
      },
    };
    const navigate = vi.fn();

    expect(connectedWalletAppLink(provider)).toBe("metamask://");
    expect(openConnectedWalletApp(
      provider,
      navigate,
      "Mozilla/5.0 (Linux; Android 15) Chrome/152 Mobile",
    )).toBe(true);
    expect(navigate).toHaveBeenCalledWith("metamask://");
  });

  it("uses a secure universal link when no native wallet link is available", () => {
    const provider = {
      request: vi.fn(),
      session: {
        namespaces: {},
        peer: { metadata: { redirect: { universal: "https://metamask.app.link" } } },
      },
    };

    expect(connectedWalletAppLink(provider)).toBe("https://metamask.app.link");
  });

  it("does not navigate to unsafe wallet metadata or open an app on desktop", () => {
    const unsafeProvider = {
      request: vi.fn(),
      session: {
        namespaces: {},
        peer: { metadata: { redirect: { native: "javascript:alert(1)" } } },
      },
    };
    const mobileNavigate = vi.fn();
    expect(connectedWalletAppLink(unsafeProvider)).toBeUndefined();
    expect(openConnectedWalletApp(
      unsafeProvider,
      mobileNavigate,
      "Mozilla/5.0 (Linux; Android 15) Chrome/152 Mobile",
    )).toBe(false);

    const safeProvider = {
      request: vi.fn(),
      session: {
        namespaces: {},
        peer: { metadata: { redirect: { native: "metamask://" } } },
      },
    };
    const desktopNavigate = vi.fn();
    expect(openConnectedWalletApp(
      safeProvider,
      desktopNavigate,
      "Mozilla/5.0 (Macintosh; Intel Mac OS X) Chrome/152",
    )).toBe(false);
    expect(openConnectedWalletApp(
      safeProvider,
      () => { throw new Error("navigation blocked"); },
      "Mozilla/5.0 (Linux; Android 15) Chrome/152 Mobile",
    )).toBe(false);
    expect(mobileNavigate).not.toHaveBeenCalled();
    expect(desktopNavigate).not.toHaveBeenCalled();
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
      session?: ReturnType<typeof approvedSession>;
      connect: ReturnType<typeof vi.fn>;
      disconnect: ReturnType<typeof vi.fn>;
      request: ReturnType<typeof vi.fn>;
    } = {
      session: {
        requiredNamespaces: {
          eip155: { chains: ["eip155:84532"], methods: ["personal_sign"], events: [] },
        },
        namespaces: {
          eip155: {
            accounts: ["eip155:84532:0x1111111111111111111111111111111111111111"],
            chains: ["eip155:84532"],
            methods: ["personal_sign"],
            events: [],
          },
        },
      },
      connect: vi.fn().mockImplementation(async () => { provider.session = approvedSession(); }),
      disconnect: vi.fn().mockImplementation(async () => { provider.session = undefined; }),
      request: vi.fn(),
    };
    mocks.init.mockResolvedValue(provider);

    await connectWalletProvider();

    expect(provider.disconnect).toHaveBeenCalledOnce();
    expect(provider.connect).toHaveBeenCalledOnce();
  });

  it("replaces a WalletConnect session without replacing its SDK instance", async () => {
    vi.stubEnv("NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID", "project-id");
    const firstProvider: {
      session?: ReturnType<typeof approvedSession>;
      connect: ReturnType<typeof vi.fn>;
      disconnect: ReturnType<typeof vi.fn>;
      request: ReturnType<typeof vi.fn>;
    } = {
      session: undefined,
      connect: vi.fn().mockImplementation(async () => { firstProvider.session = approvedSession(); }),
      disconnect: vi.fn().mockImplementation(async () => { firstProvider.session = undefined; }),
      request: vi.fn(),
    };
    mocks.init.mockResolvedValue(firstProvider);

    await connectWalletProvider();
    const replaced = await connectWalletProvider({ replaceSession: true });

    expect(mocks.init).toHaveBeenCalledOnce();
    expect(firstProvider.disconnect).toHaveBeenCalledOnce();
    expect(firstProvider.connect).toHaveBeenCalledTimes(2);
    expect(replaced.provider).toBe(firstProvider);
  });

  it("rejects a newly connected session that did not approve personal signing", async () => {
    vi.stubEnv("NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID", "project-id");
    const provider: {
      session?: {
        requiredNamespaces?: Record<string, { chains?: string[]; methods: string[]; events: string[] }>;
        namespaces: Record<string, {
          accounts?: string[];
          chains?: string[];
          methods: string[];
          events: string[];
        }>;
      };
      connect: ReturnType<typeof vi.fn>;
      disconnect: ReturnType<typeof vi.fn>;
      request: ReturnType<typeof vi.fn>;
    } = {
      session: undefined,
      connect: vi.fn().mockImplementation(async () => {
        provider.session = {
          requiredNamespaces: {
            eip155: {
              chains: ["eip155:84532"],
              methods: ["eth_sendTransaction", "personal_sign"],
              events: ["accountsChanged", "chainChanged"],
            },
          },
          namespaces: {
            eip155: {
              accounts: ["eip155:84532:0x1111111111111111111111111111111111111111"],
              chains: ["eip155:84532"],
              methods: ["eth_sendTransaction"],
              events: ["accountsChanged", "chainChanged"],
            },
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

  it("accepts MetaMask chain-scoped namespaces after required permissions are approved", async () => {
    vi.stubEnv("NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID", "project-id");
    const provider = {
      session: {
        namespaces: {
          "eip155:84532": {
            accounts: ["eip155:84532:0x1111111111111111111111111111111111111111"],
            methods: ["eth_sendTransaction", "personal_sign"],
            events: ["accountsChanged", "chainChanged"],
          },
        },
      },
      connect: vi.fn(),
      disconnect: vi.fn(),
      request: vi.fn(),
    };
    mocks.init.mockResolvedValue(provider);

    await connectWalletProvider();

    expect(provider.disconnect).not.toHaveBeenCalled();
    expect(provider.connect).not.toHaveBeenCalled();
  });
});
