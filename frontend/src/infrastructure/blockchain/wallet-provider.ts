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
    namespaces: Record<string, { methods?: string[]; events?: string[] }>;
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

function walletConnectSessionHasRequiredCapabilities(provider: WalletConnectProvider): boolean {
  if (!provider.session) return false;
  const namespaces = Object.values(provider.session.namespaces);
  const approvedMethods = new Set(namespaces.flatMap((namespace) => namespace.methods ?? []));
  const approvedEvents = new Set(namespaces.flatMap((namespace) => namespace.events ?? []));
  return walletConnectRequiredMethods.every((method) => approvedMethods.has(method))
    && walletConnectEvents.every((event) => approvedEvents.has(event));
}

export function isMobileBrowser(userAgent = navigator.userAgent): boolean {
  return /Android|iPhone|iPad|iPod/i.test(userAgent);
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

  const { EthereumProvider } = await import("@walletconnect/ethereum-provider");
  const origin = process.env.NEXT_PUBLIC_WEB_ORIGIN?.trim() || window.location.origin;
  const configuredChainId = Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? "31337");
  const provider = (await EthereumProvider.init({
    projectId,
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
      redirect: { universal: origin },
    },
    showQrModal: true,
  })) as WalletConnectProvider;

  const staleSession = Boolean(provider.session) && (
    replaceSession
    || !walletConnectSessionHasRequiredCapabilities(provider)
  );
  if (staleSession) {
    await provider.disconnect();
  }
  if (!provider.session) {
    await provider.connect();
  }
  if (!walletConnectSessionHasRequiredCapabilities(provider)) {
    await provider.disconnect().catch(() => undefined);
    throw new Error(
      "연결된 지갑이 로그인 서명 권한을 승인하지 않았습니다. MetaMask에서 연결을 다시 승인해 주세요.",
    );
  }
  activeProvider = provider;
  activeConnector = "walletconnect";
  return { connector: "walletconnect", provider, accounts: provider.accounts };
}

export function clearActiveWalletProvider(): void {
  activeProvider = undefined;
  activeConnector = undefined;
}
