import { beforeEach, describe, expect, it, vi } from "vitest";
import { encodeFunctionData, parseAbi } from "viem";
import type { InboxLetter } from "./inbox";

const mocks = vi.hoisted(() => ({ getLogs: vi.fn(), getTransaction: vi.fn() }));

vi.mock("@/infrastructure/blockchain/config", async () => {
  const { parseAbi } = await import("viem");
  return {
    contractAddress: "0x3333333333333333333333333333333333333333",
    deploymentBlock: 1n,
    contractAbi: parseAbi([
      "function registerMailboxKey(bytes32 publicKey, bytes passkeyEnvelope, bytes recoveryEnvelope)",
      "function sealLetter(bytes32 letterId, address recipient, uint32 recipientKeyId, bytes encryptedText, bytes sealedKey, bytes32 archiveSha256)",
    ]),
    publicClient: { getLogs: mocks.getLogs, getTransaction: mocks.getTransaction },
  };
});

import { loadLetterCalldata, loadMailboxEnvelopes } from "./onchain-inbox";

const abi = parseAbi([
  "function registerMailboxKey(bytes32 publicKey, bytes passkeyEnvelope, bytes recoveryEnvelope)",
  "function sealLetter(bytes32 letterId, address recipient, uint32 recipientKeyId, bytes encryptedText, bytes sealedKey, bytes32 archiveSha256)",
]);
const letter: InboxLetter = {
  letterId: `0x${"11".repeat(32)}`,
  sender: "0x2222222222222222222222222222222222222222",
  recipient: "0x3333333333333333333333333333333333333333",
  recipientKeyId: 4,
  archiveSha256: `0x${"44".repeat(32)}`,
  transactionHash: `0x${"55".repeat(32)}`,
  blockNumber: 10n,
};

describe("on-chain calldata recovery", () => {
  beforeEach(() => vi.clearAllMocks());

  it("decodes letter ciphertext only when event fields match transaction calldata", async () => {
    const input = encodeFunctionData({
      abi,
      functionName: "sealLetter",
      args: [letter.letterId, letter.recipient, 4, "0x47545831", "0x0909", letter.archiveSha256],
    });
    mocks.getTransaction.mockResolvedValue({ input });

    await expect(loadLetterCalldata(letter)).resolves.toEqual({
      encryptedText: "0x47545831",
      sealedKey: "0x0909",
    });
    await expect(loadLetterCalldata({ ...letter, recipientKeyId: 5 })).rejects.toThrow(
      "블록체인 기록과 거래 호출 데이터가 일치하지 않습니다.",
    );
  });

  it("recovers passkey and recovery envelopes from the matching registration transaction", async () => {
    const publicKey = `0x${"66".repeat(32)}` as const;
    mocks.getLogs.mockResolvedValue([{ transactionHash: letter.transactionHash, args: { publicKey } }]);
    mocks.getTransaction.mockResolvedValue({
      input: encodeFunctionData({
        abi,
        functionName: "registerMailboxKey",
        args: [publicKey, "0x47504b31", "0x746c6f636b"],
      }),
    });

    await expect(loadMailboxEnvelopes(letter.recipient, 4)).resolves.toEqual({
      passkeyEnvelope: "0x47504b31",
      recoveryEnvelope: "0x746c6f636b",
    });
  });

  it("rejects a registration event whose public key differs from calldata", async () => {
    mocks.getLogs.mockResolvedValue([{
      transactionHash: letter.transactionHash,
      args: { publicKey: `0x${"77".repeat(32)}` },
    }]);
    mocks.getTransaction.mockResolvedValue({
      input: encodeFunctionData({
        abi,
        functionName: "registerMailboxKey",
        args: [`0x${"66".repeat(32)}`, "0x47504b31", "0x746c6f636b"],
      }),
    });

    await expect(loadMailboxEnvelopes(letter.recipient, 4)).rejects.toThrow(
      "메일박스의 블록체인 기록과 호출 데이터가 일치하지 않습니다.",
    );
  });
});
