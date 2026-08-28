import { decodeFunctionData, parseAbiItem } from "viem";
import { contractAbi, contractAddress, deploymentBlock, publicClient } from "@/infrastructure/blockchain/config";
import type { InboxLetter } from "./inbox";

const letterEvent = parseAbiItem("event LetterSealed(bytes32 indexed letterId, address indexed sender, address indexed recipient, uint32 recipientKeyId, bytes32 archiveSha256)");
const mailboxEvent = parseAbiItem("event MailboxKeyRegistered(address indexed owner, uint32 indexed keyId, bytes32 publicKey)");

export async function loadInbox(recipient: `0x${string}`): Promise<InboxLetter[]> {
  const logs = await publicClient.getLogs({ address: contractAddress, event: letterEvent, args: { recipient }, fromBlock: deploymentBlock, toBlock: "latest" });
  return logs.flatMap((log) => log.args.letterId && log.args.sender && log.args.recipient && log.args.recipientKeyId !== undefined && log.args.archiveSha256 && log.transactionHash && log.blockNumber !== null ? [{
    letterId: log.args.letterId,
    sender: log.args.sender,
    recipient: log.args.recipient,
    recipientKeyId: Number(log.args.recipientKeyId),
    archiveSha256: log.args.archiveSha256,
    transactionHash: log.transactionHash,
    blockNumber: log.blockNumber,
  }] : []).sort((left, right) => left.blockNumber > right.blockNumber ? -1 : 1);
}

export async function loadLetterCalldata(letter: InboxLetter) {
  const transaction = await publicClient.getTransaction({ hash: letter.transactionHash });
  const decoded = decodeFunctionData({ abi: contractAbi, data: transaction.input });
  if (decoded.functionName !== "sealLetter") throw new Error("편지 거래 calldata가 올바르지 않습니다.");
  const [letterId, recipient, keyId, encryptedText, sealedKey, archiveSha256] = decoded.args;
  if (letterId !== letter.letterId || recipient.toLowerCase() !== letter.recipient.toLowerCase() || Number(keyId) !== letter.recipientKeyId || archiveSha256 !== letter.archiveSha256) {
    throw new Error("이벤트와 거래 calldata가 일치하지 않습니다.");
  }
  return { encryptedText, sealedKey };
}

export async function loadMailboxEnvelopes(owner: `0x${string}`, keyId: number) {
  const logs = await publicClient.getLogs({ address: contractAddress, event: mailboxEvent, args: { owner, keyId }, fromBlock: deploymentBlock, toBlock: "latest" });
  const registration = logs.at(-1);
  if (!registration?.transactionHash) throw new Error("메일박스 등록 거래를 찾을 수 없습니다.");
  const transaction = await publicClient.getTransaction({ hash: registration.transactionHash });
  const decoded = decodeFunctionData({ abi: contractAbi, data: transaction.input });
  if (decoded.functionName !== "registerMailboxKey") throw new Error("메일박스 등록 calldata가 올바르지 않습니다.");
  const [publicKey, passkeyEnvelope, recoveryEnvelope] = decoded.args;
  if (publicKey !== registration.args.publicKey) throw new Error("메일박스 이벤트와 calldata가 일치하지 않습니다.");
  return { passkeyEnvelope, recoveryEnvelope };
}
