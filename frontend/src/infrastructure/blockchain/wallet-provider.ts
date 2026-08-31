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
    peer?: {
      metadata?: {
        redirect?: {
          native?: string;
          universal?: string;
        };
      };
    };
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

async function initializeWalletConnectProvider(): Promise<WalletConnectProvider> {
  if (activeWalletConnectProvider) return activeWalletConnectProvider;

  const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID?.trim();
  if (!projectId) {
    throw new Error("모바일 지갑 연결 설정이 완료되지 않았습니다.");
  }

  const origin = process.env.NEXT_PUBLIC_WEB_ORIGIN?.trim() || window.location.origin;
  const configuredChainId = Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? "31337");
  const { EthereumProvider } = await import("@walletconnect/ethereum-provider");
  activeWalletConnectProvider = (await EthereumProvider.init({
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
  return activeWalletConnectProvider;
}

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

function safeWalletAppLink(value: string | undefined): string | undefined {
  const link = value?.trim();
  if (!link) return undefined;
  try {
    const protocol = new URL(link).protocol.toLowerCase();
    if (["javascript:", "data:", "file:", "blob:"].includes(protocol)) return undefined;
    return link;
  } catch {
    return undefined;
  }
}

/** 연결된 WalletConnect 지갑이 세션에 제공한 앱 링크를 반환한다. */
export function connectedWalletAppLink(provider: BrowserProvider = activeWalletProvider()!): string | undefined {
  const metadata = (provider as WalletConnectProvider | undefined)?.session?.peer?.metadata;
  return safeWalletAppLink(metadata?.redirect?.native)
    ?? safeWalletAppLink(metadata?.redirect?.universal);
}

/** 새 탭을 만들지 않고 현재 모바일 브라우저에서 연결된 지갑 앱으로 전환한다. */
export function openConnectedWalletApp(
  provider: BrowserProvider = activeWalletProvider()!,
  navigate: (url: string) => void = (url) => window.location.assign(url),
  userAgent = navigator.userAgent,
): boolean {
  if (!isMobileBrowser(userAgent)) return false;
  const link = connectedWalletAppLink(provider);
  if (!link) return false;
  try {
    navigate(link);
    return true;
  } catch {
    return false;
  }
}

/**
 * 새로고침 뒤 브라우저 저장소에 남아 있는 지갑 연결만 복원한다.
 * 저장된 WalletConnect 세션이 없을 때는 연결 화면을 열지 않는다.
 */
export async function restoreWalletProvider(): Promise<ConnectedWalletProvider | undefined> {
  const injected = injectedWalletProvider();
  if (injected) {
    activeProvider = injected;
    activeConnector = "injected";
    return { connector: "injected", provider: injected };
  }

  if (!process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID?.trim()) return undefined;
  const provider = await initializeWalletConnectProvider();
  if (!provider.session) return undefined;

  const configuredChainId = Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? "31337");
  if (!walletConnectSessionHasRequiredCapabilities(provider, configuredChainId)) {
    await provider.disconnect().catch(() => undefined);
    return undefined;
  }

  activeProvider = provider;
  activeConnector = "walletconnect";
  return { connector: "walletconnect", provider, accounts: provider.accounts };
}

function normalizedProviderAccounts(provider: BrowserProvider): string[] {
  const walletConnectProvider = provider as WalletConnectProvider;
  const sessionAccounts = Object.values(walletConnectProvider.session?.namespaces ?? {})
    .flatMap((namespace) => namespace.accounts ?? []);
  return [...(walletConnectProvider.accounts ?? []), ...sessionAccounts]
    .map((account) => account.split(":").at(-1)?.toLowerCase())
    .filter((account): account is string => Boolean(account));
}

/** 거래 직전에 실제 서명 가능한 지갑과 로그인 계정의 일치 여부를 다시 확인한다. */
export async function ensureWalletProvider(expectedAddress: string): Promise<BrowserProvider> {
  const provider = connectedWalletProvider() ?? (await restoreWalletProvider())?.provider;
  if (!provider) {
    throw new Error("거래를 승인할 지갑 연결이 만료되었습니다. 지갑을 다시 연결해 주세요.");
  }

  let accounts = normalizedProviderAccounts(provider);
  if (accounts.length === 0) {
    const requested = await provider.request({ method: "eth_accounts" });
    accounts = Array.isArray(requested)
      ? requested.filter((account): account is string => typeof account === "string")
        .map((account) => account.toLowerCase())
      : [];
  }
  if (!accounts.includes(expectedAddress.toLowerCase())) {
    throw new Error("로그인한 계정과 거래를 승인할 지갑 계정이 다릅니다. 같은 계정으로 다시 연결해 주세요.");
  }
  return provider;
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

  if (replaceSession && activeWalletConnectProvider) {
    await disconnectActiveWalletSession();
  }

  const configuredChainId = Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? "31337");
  const provider = await initializeWalletConnectProvider();

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
