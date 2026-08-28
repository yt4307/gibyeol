import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { draftStorageKey, type SendDraft } from "../data/send-draft";

const sender = "0x1111111111111111111111111111111111111111" as const;
const recipient = "0x2222222222222222222222222222222222222222" as const;
const transactionHash = `0x${"aa".repeat(32)}` as const;

const mocks = vi.hoisted(() => ({
  readContract: vi.fn(),
  getLogs: vi.fn(),
  getTransaction: vi.fn(),
  waitForTransactionReceipt: vi.fn(),
  writeContract: vi.fn(),
  wrapLetterKeyForRecipient: vi.fn(),
}));

vi.mock("@features/blockchain/data/config", () => ({
  apiBaseUrl: "https://api.example.test/api/v1",
  chainId: 84_532,
  contractAbi: [],
  contractAddress: "0x3333333333333333333333333333333333333333",
  deploymentBlock: 1n,
  publicClient: {
    readContract: mocks.readContract,
    getLogs: mocks.getLogs,
    getTransaction: mocks.getTransaction,
    waitForTransactionReceipt: mocks.waitForTransactionReceipt,
  },
  walletClient: () => ({ writeContract: mocks.writeContract }),
}));

vi.mock("@features/blockchain/data/quicknet-tlock", () => ({
  createQuicknetTlock: () => ({ encrypt: vi.fn(), decrypt: vi.fn() }),
}));

vi.mock("@gibyeol/protocol", () => ({
  bytesToHex: (value: Uint8Array) => [...value].map((byte) => byte.toString(16).padStart(2, "0")).join(""),
  encodeLetterContext: () => new Uint8Array([1]),
  encryptTextGtx1: async () => new Uint8Array([0x47, 0x54, 0x58, 0x31]),
  hexToBytes: (value: string) => Uint8Array.from(value.replace(/^0x/, "").match(/.{2}/g) ?? [], (byte) => Number.parseInt(byte, 16)),
  MEDIA_CODEC: { WEBP: 1, JPEG: 2, WEBM: 16, MP4: 17 },
  MEDIA_TYPE: { IMAGE: 1, TIMELAPSE: 2 },
  packGbyl: async () => new Uint8Array([0x47, 0x42, 0x59, 0x4c, 1, 0, 0, 0]),
  secureRandomBytes: () => new Uint8Array(32).fill(7),
  sha256: async () => new Uint8Array(32).fill(8),
  wrapLetterKeyForRecipient: mocks.wrapLetterKeyForRecipient,
}));

import { useSendLetter } from "./use-send-letter";

const storage = new Map<string, string>();
const memoryStorage = {
  clear: () => storage.clear(),
  getItem: (key: string) => storage.get(key) ?? null,
  removeItem: (key: string) => storage.delete(key),
  setItem: (key: string, value: string) => storage.set(key, value),
};

function storedDraft(overrides: Partial<SendDraft>): SendDraft {
  return {
    letterId: `0x${"01".repeat(32)}`,
    recipient,
    message: "크리스마스에 만나요",
    stage: "DRAFT",
    ...overrides,
  };
}

describe("useSendLetter", () => {
  beforeAll(() => vi.stubGlobal("localStorage", memoryStorage));

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, status: 201 }));
    mocks.wrapLetterKeyForRecipient.mockResolvedValue(new Uint8Array([9, 9]));
    mocks.waitForTransactionReceipt.mockResolvedValue({ status: "success" });
    mocks.writeContract.mockResolvedValue(transactionHash);
    mocks.getLogs.mockResolvedValue([]);
  });

  it("packs, uploads, seals, and removes the plaintext key after confirmation", async () => {
    mocks.readContract
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(`0x${"02".repeat(32)}`)
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(1);

    const { result } = renderHook(() => useSendLetter(sender));
    await waitFor(() => expect(result.current.draft?.stage).toBe("DRAFT"));
    act(() => result.current.update({ recipient, message: "크리스마스에 만나요" }));
    await act(async () => { await result.current.seal([]); });

    expect(result.current.draft).toMatchObject({
      recipient,
      stage: "SEALED",
      transactionHash,
      message: "",
      letterKeyHex: undefined,
    });
    expect(fetch).toHaveBeenCalledOnce();
    expect(mocks.writeContract).toHaveBeenCalledOnce();
  });

  it("recovers an already sealed letter without sending a duplicate transaction", async () => {
    localStorage.setItem(draftStorageKey(sender), JSON.stringify(storedDraft({
      stage: "WAITING_TRANSACTION",
      recipientKeyId: 1,
      letterKeyHex: "03".repeat(32),
      encryptedTextHex: "0x47545831",
      sealedKeyHex: "0x0909",
      archiveHex: "4742594c01000000",
      archiveSha256: `0x${"08".repeat(32)}`,
    })));
    mocks.readContract.mockResolvedValueOnce(true);
    mocks.getLogs.mockResolvedValueOnce([{ transactionHash }]);

    const { result } = renderHook(() => useSendLetter(sender));
    await waitFor(() => expect(result.current.draft?.stage).toBe("WAITING_TRANSACTION"));
    await act(async () => { await result.current.seal([]); });

    expect(result.current.draft?.stage).toBe("SEALED");
    expect(result.current.draft?.transactionHash).toBe(transactionHash);
    expect(mocks.writeContract).not.toHaveBeenCalled();
  });

  it("rewraps the existing letter key when the recipient key rotated", async () => {
    localStorage.setItem(draftStorageKey(sender), JSON.stringify(storedDraft({
      stage: "ENCRYPTING_KEY",
      recipientKeyId: 1,
      letterKeyHex: "03".repeat(32),
      encryptedTextHex: "0x47545831",
      archiveHex: "4742594c01000000",
      archiveSha256: `0x${"08".repeat(32)}`,
    })));
    mocks.readContract
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(`0x${"04".repeat(32)}`)
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(2);

    const { result } = renderHook(() => useSendLetter(sender));
    await waitFor(() => expect(result.current.draft?.stage).toBe("ENCRYPTING_KEY"));
    await act(async () => { await result.current.seal([]); });

    expect(mocks.wrapLetterKeyForRecipient).toHaveBeenCalledOnce();
    expect(result.current.draft).toMatchObject({ stage: "SEALED", recipientKeyId: 2 });
    expect(mocks.writeContract.mock.calls[0]?.[0].args[2]).toBe(2);
  });
});
