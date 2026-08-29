import type { BrowserProvider } from "./config";

export type WalletConnector = "injected" | "walletconnect";

export type ConnectedWalletProvider = {
  connector: WalletConnector;
  provider: BrowserProvider;
};

export type ConnectWalletProviderOptions = {
  replaceSession?: boolean;
};

type WalletConnectProvider = BrowserProvider & {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  session?: {
    namespaces: Record<string, { methods?: string[] }>;
  };
};

const walletConnectMethods = [
  "eth_requestAccounts",
  "personal_sign",
  "wallet_switchEthereumChain",
  "wallet_addEthereumChain",
] as const;

let activeProvider: BrowserProvider | undefined;

export function injectedWalletProvider(): BrowserProvider | undefined {
  return (window as typeof window & { ethereum?: BrowserProvider }).ethereum;
}

export function activeWalletProvider(): BrowserProvider | undefined {
  return activeProvider ?? injectedWalletProvider();
}

export async function connectWalletProvider(
  { replaceSession = false }: ConnectWalletProviderOptions = {},
): Promise<ConnectedWalletProvider> {
  const injected = injectedWalletProvider();
  if (injected) {
    if (replaceSession) {
      await injected.request({
        method: "wallet_requestPermissions",
        params: [{ eth_accounts: {} }],
      });
    }
    activeProvider = injected;
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
  const staleSession = Boolean(provider.session) && (
    replaceSession || walletConnectMethods.some((method) => !approvedMethods.has(method))
  );
  if (staleSession) {
    await provider.disconnect();
  }
  if (!provider.session) {
    await provider.connect();
  }
  activeProvider = provider;
  return { connector: "walletconnect", provider };
}

export function clearActiveWalletProvider(): void {
  activeProvider = undefined;
}
