import { createPublicClient, createWalletClient, custom, http, parseAbi } from "viem";
import { base, baseSepolia, foundry } from "viem/chains";
import { activeWalletProvider } from "./wallet-provider";

export const contractAbi = parseAbi([
  "function currentKeyId(address owner) view returns (uint32)",
  "function mailboxPublicKeys(address owner, uint32 keyId) view returns (bytes32)",
  "function mailboxActive(address owner) view returns (bool)",
  "function sealedLetters(bytes32 letterId) view returns (bool)",
  "function RECOVERY_PUBLIC_KEY() view returns (bytes32)",
  "function registerMailboxKey(bytes32 publicKey, bytes passkeyEnvelope, bytes recoveryEnvelope)",
  "function deactivateMailbox()",
  "function sealLetter(bytes32 letterId, address recipient, uint32 recipientKeyId, bytes encryptedText, bytes sealedKey, bytes32 archiveSha256)",
  "event MailboxKeyRegistered(address indexed owner, uint32 indexed keyId, bytes32 publicKey)",
  "event MailboxDeactivated(address indexed owner, uint32 indexed keyId)",
  "event LetterSealed(bytes32 indexed letterId, address indexed sender, address indexed recipient, uint32 recipientKeyId, bytes32 archiveSha256)",
]);

export const chainId = Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? "31337");
export const chain = chainId === base.id ? base : chainId === baseSepolia.id ? baseSepolia : foundry;
export const walletChainName = chainId === baseSepolia.id ? "Base Sepolia Testnet" : chain.name;
export const blockExplorerUrl = chain.blockExplorers?.default.url;
export const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL ?? "http://localhost:8545";
export const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080/api/v1";
export const contractAddress = (process.env.NEXT_PUBLIC_GIBYEOL_CONTRACT_ADDRESS ??
  "0x0000000000000000000000000000000000000000") as `0x${string}`;
export const deploymentBlock = BigInt(process.env.NEXT_PUBLIC_DEPLOYMENT_BLOCK ?? "0");

export const publicClient = createPublicClient({ chain, transport: http(rpcUrl) });

export type BrowserProvider = {
  request(args: { method: string; params?: readonly unknown[] | object }): Promise<unknown>;
};

export function browserProvider(): BrowserProvider {
  const provider = activeWalletProvider();
  if (!provider) throw new Error("브라우저 지갑을 찾을 수 없습니다.");
  return provider;
}

export function walletClient() {
  return createWalletClient({ chain, transport: custom(browserProvider()) });
}
