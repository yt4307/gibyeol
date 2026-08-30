import type { BrowserProvider } from "./config";

export type WalletConnector = "injected" | "walletconnect";

export type ConnectedWalletProvider = {
  connector: WalletConnector;
  provider: BrowserProvider;
  accounts?: readonly string[];
};

export type ConnectWalletProviderOptions = {
  replaceSession?: boolean;
  connector?: WalletConnector | "auto";
};

type WalletConnectProvider = BrowserProvider & {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  accounts?: string[];
  session?: {
    namespaces: Record<string, {
      accounts?: string[];
      chains?: string[];
      methods?: string[];
      events?: string[];
    }>;
  };
};

const walletConnectRequiredMethods = [
  "eth_sendTransaction",
  "personal_sign",
] as const;

const walletConnectOptionalMethods = [
  "eth_accounts",
  "eth_requestAccounts",
  "wallet_switchEthereumChain",
  "wallet_addEthereumChain",
] as const;

const walletConnectEvents = ["accountsChanged", "chainChanged"] as const;

let activeProvider: BrowserProvider | undefined;
let activeConnector: WalletConnector | undefined;
let activeWalletConnectProvider: WalletConnectProvider | undefined;

function walletConnectSessionHasRequiredCapabilities(
  provider: WalletConnectProvider,
  configuredChainId: number,
): boolean {
  if (!provider.session) return false;
  const requiredChain = `eip155:${configuredChainId}`;
  const namespaceEntries = Object.entries(provider.session.namespaces);
  const namespaces = namespaceEntries.map(([, namespace]) => namespace);
  const approvedMethods = new Set(namespaces.flatMap((namespace) => namespace.methods ?? []));
  const approvedEvents = new Set(namespaces.flatMap((namespace) => namespace.events ?? []));
  const approvedChains = new Set(namespaceEntries.flatMap(([namespaceKey, namespace]) => [
    ...(/^eip155:\d+$/.test(namespaceKey) ? [namespaceKey] : []),
    ...(namespace.chains ?? []),
    ...(namespace.accounts ?? []).map((account) => account.split(":").slice(0, 2).join(":")),
  ]));
  return approvedChains.has(requiredChain)
    && walletConnectRequiredMethods.every((method) => approvedMethods.has(method))
    && walletConnectEvents.every((event) => approvedEvents.has(event));
}

export function isMobileBrowser(userAgent = navigator.userAgent): boolean {
  return /Android|iPhone|iPad|iPod/i.test(userAgent);
}

export function isIOSBrowser(
  userAgent = navigator.userAgent,
  platform = navigator.platform,
  maxTouchPoints = navigator.maxTouchPoints,
): boolean {
  return /iPhone|iPad|iPod/i.test(userAgent)
    || (/Macintosh/i.test(userAgent) && platform === "MacIntel" && maxTouchPoints > 1);
}

export function injectedWalletProvider(): BrowserProvider | undefined {
  return (window as typeof window & { ethereum?: BrowserProvider }).ethereum;
}

export function activeWalletProvider(): BrowserProvider | undefined {
  return activeProvider ?? injectedWalletProvider();
}

export function connectedWalletProvider(): BrowserProvider | undefined {
  return activeProvider;
}

export function activeWalletConnector(): WalletConnector | undefined {
  return activeConnector ?? (injectedWalletProvider() ? "injected" : undefined);
}

export async function connectWalletProvider(
  { replaceSession = false, connector = "auto" }: ConnectWalletProviderOptions = {},
): Promise<ConnectedWalletProvider> {
  const injected = injectedWalletProvider();
  if (connector === "injected" && !injected) {
    throw new Error("브라우저에 설치된 지갑을 찾을 수 없습니다.");
  }
  if (injected && connector !== "walletconnect") {
    if (activeWalletConnectProvider) {
      await activeWalletConnectProvider.disconnect().catch(() => undefined);
      activeWalletConnectProvider = undefined;
    }
    if (replaceSession) {
      await injected.request({
        method: "wallet_requestPermissions",
        params: [{ eth_accounts: {} }],
      });
    }
    activeProvider = injected;
    activeConnector = "injected";
    return { connector: "injected", provider: injected };
  }

  const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID?.trim();
  if (!projectId) {
    throw new Error("모바일 지갑 연결 설정이 완료되지 않았습니다.");
  }

  if (replaceSession && activeWalletConnectProvider) {
    await disconnectActiveWalletSession();
  }

  const origin = process.env.NEXT_PUBLIC_WEB_ORIGIN?.trim() || window.location.origin;
  const configuredChainId = Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? "31337");
  let provider = activeWalletConnectProvider;
  if (!provider) {
    const { EthereumProvider } = await import("@walletconnect/ethereum-provider");
    provider = (await EthereumProvider.init({
      projectId,
      customStoragePrefix: "gibyeol-wallet-v2",
      chains: [configuredChainId],
      methods: [...walletConnectRequiredMethods],
      events: [...walletConnectEvents],
      optionalMethods: [...walletConnectOptionalMethods],
      rpcMap: {
        [configuredChainId]: process.env.NEXT_PUBLIC_RPC_URL ?? "http://localhost:8545",
      },
      metadata: {
        name: "기별",
        description: "미래로 보내는 암호 편지",
        url: origin,
        icons: [],
        ...(!isIOSBrowser() && { redirect: { universal: origin } }),
      },
      showQrModal: true,
    })) as WalletConnectProvider;
  }

  const staleSession = Boolean(provider.session) && (
    replaceSession
    || !walletConnectSessionHasRequiredCapabilities(provider, configuredChainId)
  );
  if (staleSession) {
    await provider.disconnect();
  }
  if (!provider.session) {
    await provider.connect();
  }
  if (!walletConnectSessionHasRequiredCapabilities(provider, configuredChainId)) {
    await provider.disconnect().catch(() => undefined);
    throw new Error(
      "연결된 지갑이 로그인 서명 권한을 승인하지 않았습니다. MetaMask에서 연결을 다시 승인해 주세요.",
    );
  }
  activeProvider = provider;
  activeConnector = "walletconnect";
  activeWalletConnectProvider = provider;
  return { connector: "walletconnect", provider, accounts: provider.accounts };
}

export async function disconnectActiveWalletProvider(): Promise<void> {
  const provider = activeWalletConnectProvider;
  activeProvider = undefined;
  activeConnector = undefined;
  activeWalletConnectProvider = undefined;
  if (provider?.session) {
    await provider.disconnect().catch(() => undefined);
  }
}

export async function disconnectActiveWalletSession(): Promise<void> {
  activeProvider = undefined;
  activeConnector = undefined;
  if (activeWalletConnectProvider?.session) {
    await activeWalletConnectProvider.disconnect().catch(() => undefined);
  }
}

export function clearActiveWalletProvider(): void {
  activeProvider = undefined;
  activeConnector = undefined;
  activeWalletConnectProvider = undefined;
}
