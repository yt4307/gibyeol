import type { BrowserProvider } from "./config";

export type WalletConnector = "injected" | "walletconnect";

export type ConnectedWalletProvider = {
  connector: WalletConnector;
  provider: BrowserProvider;
};

export type ConnectWalletProviderOptions = {
  replaceSession?: boolean;
  connector?: WalletConnector | "auto";
};

type WalletConnectProvider = BrowserProvider & {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  session?: {
    namespaces: Record<string, { methods?: string[]; events?: string[] }>;
  };
};

const walletConnectMethods = [
  "eth_requestAccounts",
  "eth_sendTransaction",
  "personal_sign",
  "wallet_switchEthereumChain",
  "wallet_addEthereumChain",
] as const;

const walletConnectEvents = ["accountsChanged", "chainChanged"] as const;

let activeProvider: BrowserProvider | undefined;
let activeConnector: WalletConnector | undefined;

export function injectedWalletProvider(): BrowserProvider | undefined {
  return (window as typeof window & { ethereum?: BrowserProvider }).ethereum;
}

export function activeWalletProvider(): BrowserProvider | undefined {
  return activeProvider ?? injectedWalletProvider();
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
    optionalChains: [configuredChainId],
    optionalMethods: [...walletConnectMethods],
    optionalEvents: [...walletConnectEvents],
    rpcMap: {
      [configuredChainId]: process.env.NEXT_PUBLIC_RPC_URL ?? "http://localhost:8545",
    },
    metadata: {
      name: "기별",
      description: "미래로 보내는 암호 편지",
      url: origin,
      icons: [],
    },
    showQrModal: true,
  })) as WalletConnectProvider;

  const approvedMethods = new Set(
    Object.values(provider.session?.namespaces ?? {}).flatMap((namespace) => namespace.methods ?? []),
  );
  const approvedEvents = new Set(
    Object.values(provider.session?.namespaces ?? {}).flatMap((namespace) => namespace.events ?? []),
  );
  const staleSession = Boolean(provider.session) && (
    replaceSession
    || walletConnectMethods.some((method) => !approvedMethods.has(method))
    || walletConnectEvents.some((event) => !approvedEvents.has(event))
  );
  if (staleSession) {
    await provider.disconnect();
  }
  if (!provider.session) {
    await provider.connect();
  }
  activeProvider = provider;
  activeConnector = "walletconnect";
  return { connector: "walletconnect", provider };
}

export function clearActiveWalletProvider(): void {
  activeProvider = undefined;
  activeConnector = undefined;
}
