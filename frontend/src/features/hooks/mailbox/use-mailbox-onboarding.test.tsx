import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const address = "0x1111111111111111111111111111111111111111" as const;
const transactionHash = `0x${"aa".repeat(32)}` as const;

const mocks = vi.hoisted(() => ({
  createPasskeyMailbox: vi.fn(),
  createRecoveryEnvelope: vi.fn(),
  connectedWalletAppLink: vi.fn(),
  ensureWalletProvider: vi.fn(),
  openConnectedWalletApp: vi.fn(),
  readContract: vi.fn(),
  waitForTransactionReceipt: vi.fn(),
  walletClient: vi.fn(),
  writeContract: vi.fn(),
}));

vi.mock("@gibyeol/protocol", () => ({
  bytesToHex: (value: Uint8Array) => [...value].map((byte) => byte.toString(16).padStart(2, "0")).join(""),
  createRecoveryEnvelope: mocks.createRecoveryEnvelope,
  hexToBytes: () => new Uint8Array(32).fill(4),
}));

vi.mock("@/infrastructure/blockchain/config", () => ({
  contractAbi: [],
  contractAddress: "0x3333333333333333333333333333333333333333",
  publicClient: {
    readContract: mocks.readContract,
    waitForTransactionReceipt: mocks.waitForTransactionReceipt,
  },
  walletClient: mocks.walletClient,
}));

vi.mock("@/infrastructure/blockchain/quicknet-tlock", () => ({
  createQuicknetTlock: () => ({ encrypt: vi.fn(), decrypt: vi.fn() }),
}));

vi.mock("@/infrastructure/blockchain/wallet-provider", () => ({
  connectedWalletAppLink: mocks.connectedWalletAppLink,
  ensureWalletProvider: mocks.ensureWalletProvider,
  openConnectedWalletApp: mocks.openConnectedWalletApp,
}));

vi.mock("@features/data/mailbox/passkey", () => ({
  createPasskeyMailbox: mocks.createPasskeyMailbox,
}));

import { mailboxEnvelopeStorageKey, useMailboxOnboarding } from "./use-mailbox-onboarding";

const storage = new Map<string, string>();
const memoryStorage = {
  clear: () => storage.clear(),
  getItem: (key: string) => storage.get(key) ?? null,
  removeItem: (key: string) => storage.delete(key),
  setItem: (key: string, value: string) => storage.set(key, value),
};

describe("useMailboxOnboarding", () => {
  beforeAll(() => vi.stubGlobal("localStorage", memoryStorage));

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    mocks.walletClient.mockImplementation((provider: { request: (args: { method: string }) => Promise<unknown> }) => ({
      writeContract: async (args: unknown) => {
        await provider.request({ method: "eth_sendTransaction" });
        return mocks.writeContract(args);
      },
    }));
    mocks.connectedWalletAppLink.mockReturnValue(undefined);
    mocks.openConnectedWalletApp.mockReturnValue(false);
    mocks.ensureWalletProvider.mockResolvedValue({ request: vi.fn() });
    mocks.createPasskeyMailbox.mockResolvedValue({
      seed: new Uint8Array(32).fill(1),
      envelope: new Uint8Array([0x47, 0x50, 0x4b, 0x31]),
      keyPair: {
        publicKey: new Uint8Array(32).fill(2),
        privateKey: new Uint8Array(32).fill(3),
      },
    });
    mocks.createRecoveryEnvelope.mockResolvedValue(new Uint8Array([9, 9]));
    mocks.writeContract.mockResolvedValue(transactionHash);
    mocks.waitForTransactionReceipt.mockResolvedValue({ status: "success" });
  });

  it("prepares the mailbox first, then restores the signing provider on a second user action", async () => {
    mocks.readContract
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(`0x${"04".repeat(32)}`)
      .mockResolvedValueOnce(1);

    const provider = { request: vi.fn().mockResolvedValue(undefined) };
    mocks.ensureWalletProvider.mockResolvedValue(provider);
    const { result } = renderHook(() => useMailboxOnboarding(address));
    await waitFor(() => expect(result.current.keyId).toBe(0));

    await act(async () => { await result.current.register(); });

    expect(result.current).toMatchObject({ busy: false, stage: "awaiting-wallet" });
    expect(mocks.ensureWalletProvider).not.toHaveBeenCalled();
    expect(mocks.writeContract).not.toHaveBeenCalled();

    await act(async () => { await result.current.register(); });

    expect(mocks.ensureWalletProvider).toHaveBeenCalledWith(address);
    expect(mocks.walletClient).toHaveBeenCalledOnce();
    expect(provider.request).toHaveBeenCalledWith({ method: "eth_sendTransaction" });
    expect(mocks.waitForTransactionReceipt).toHaveBeenCalledWith({
      hash: transactionHash,
      timeout: 60_000,
    });
    expect(result.current).toMatchObject({ busy: false, stage: null, keyId: 1, active: true });
    expect(localStorage.getItem(mailboxEnvelopeStorageKey(address, 1))).toBe("47504b31");
  });

  it("opens the connected mobile wallet after the prepared transaction request is submitted", async () => {
    let releaseTransaction!: (hash: typeof transactionHash) => void;
    mocks.connectedWalletAppLink.mockReturnValue("metamask://");
    mocks.openConnectedWalletApp.mockReturnValue(true);
    mocks.writeContract.mockImplementation(() => new Promise((resolve) => {
      releaseTransaction = resolve;
    }));
    mocks.readContract
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(`0x${"04".repeat(32)}`)
      .mockResolvedValueOnce(1);

    const { result } = renderHook(() => useMailboxOnboarding(address));
    await waitFor(() => expect(result.current.keyId).toBe(0));
    await act(async () => { await result.current.register(); });
    await waitFor(() => expect(result.current.stage).toBe("awaiting-wallet"));
    let registration!: Promise<number | undefined>;
    act(() => { registration = result.current.register(); });
    await waitFor(() => expect(mocks.writeContract).toHaveBeenCalledOnce());
    await waitFor(() => expect(mocks.openConnectedWalletApp).toHaveBeenCalledOnce(), {
      timeout: 1_000,
    });

    await act(async () => {
      releaseTransaction(transactionHash);
      await registration;
    });

    expect(result.current.stage).toBeNull();
    expect(result.current.active).toBe(true);
  });

  it("retains the prepared envelope when wallet approval is rejected", async () => {
    mocks.readContract
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(`0x${"04".repeat(32)}`)
      .mockResolvedValueOnce(1);
    mocks.writeContract.mockRejectedValueOnce(Object.assign(new Error("User rejected"), { code: 4001 }));

    const { result } = renderHook(() => useMailboxOnboarding(address));
    await waitFor(() => expect(result.current.keyId).toBe(0));
    await act(async () => { await result.current.register(); });

    let rejection: unknown;
    await act(async () => {
      try { await result.current.register(); }
      catch (cause) { rejection = cause; }
    });
    expect(rejection).toBeInstanceOf(Error);
    await waitFor(() => expect(result.current.stage).toBe("awaiting-wallet"));
    await waitFor(() => expect(result.current.error).toBe(
      "지갑에서 메일박스 등록 승인을 취소했습니다. 준비된 복구 봉투로 다시 승인할 수 있어요.",
    ));

    mocks.writeContract.mockResolvedValueOnce(transactionHash);
    await act(async () => { await result.current.register(); });

    expect(mocks.createPasskeyMailbox).toHaveBeenCalledOnce();
    expect(result.current).toMatchObject({ stage: null, keyId: 1, active: true });
  });
});
