import type { BrowserProvider } from "./config";

export type WalletConnector = "injected" | "walletconnect";

export type ConnectedWalletProvider = {
  connector: WalletConnector;
  provider: BrowserProvider;
};

type WalletConnectProvider = BrowserProvider & {
  connect(): Promise<void>;
};

let activeProvider: BrowserProvider | undefined;

export function injectedWalletProvider(): BrowserProvider | undefined {
  return (window as typeof window & { ethereum?: BrowserProvider }).ethereum;
}

export function activeWalletProvider(): BrowserProvider | undefined {
  return activeProvider ?? injectedWalletProvider();
}

export async function connectWalletProvider(): Promise<ConnectedWalletProvider> {
  const injected = injectedWalletProvider();
  if (injected) {
    activeProvider = injected;
    return { connector: "injected", provider: injected };
  }

  const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID?.trim();
  if (!projectId) {
    throw new Error("모바일 지갑 연결 설정이 완료되지 않았습니다.");
  }

  const { EthereumProvider } = await import("@walletconnect/ethereum-provider");
  const origin = process.env.NEXT_PUBLIC_WEB_ORIGIN?.trim() || window.location.origin;
  const provider = (await EthereumProvider.init({
    projectId,
    chains: [Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? "31337")],
    rpcMap: {
      [Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? "31337")]:
        process.env.NEXT_PUBLIC_RPC_URL ?? "http://localhost:8545",
    },
    metadata: {
      name: "기별",
      description: "미래로 보내는 암호 편지",
      url: origin,
      icons: [],
    },
    showQrModal: true,
  })) as WalletConnectProvider;

  if (!(provider as WalletConnectProvider & { connected?: boolean }).connected) {
    await provider.connect();
  }
  activeProvider = provider;
  return { connector: "walletconnect", provider };
}

export function clearActiveWalletProvider(): void {
  activeProvider = undefined;
}
