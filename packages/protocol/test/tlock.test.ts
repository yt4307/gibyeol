import { describe, expect, it } from "vitest";
import {
  createRecoveryEnvelope,
  hexToBytes,
  mailboxKeyPairFromSeed,
  openRecoveryEnvelope,
  openSealBox,
  QUICKNET_CHAIN_HASH,
  rewrapRecoverySeedForClient,
  TlockAdapter,
  type TlockPrimitive,
  unwrapLetterKeyForRecipient,
  wrapLetterKeyForRecipient,
} from "../src";

function fakePrimitive(): TlockPrimitive {
  return {
    async encrypt(payload, round, chainHash) {
      expect(round).toBe(100n);
      expect(chainHash).toEqual(hexToBytes(QUICKNET_CHAIN_HASH));
      return new Uint8Array([0x74, ...payload]);
    },
    async decrypt(ciphertext, chainHash) {
      expect(chainHash).toEqual(hexToBytes(QUICKNET_CHAIN_HASH));
      return ciphertext.slice(1);
    },
  };
}

describe("tlock boundary", () => {
  it("rejects decryption before round and unwraps recipient key after round", async () => {
    let currentRound = 99n;
    const tlock = new TlockAdapter({
      unlockRound: 100n,
      currentRound: async () => currentRound,
      primitive: fakePrimitive(),
    });
    const recipient = await mailboxKeyPairFromSeed(hexToBytes("51".repeat(32)));
    const letterKey = hexToBytes("52".repeat(32));
    const sealed = await wrapLetterKeyForRecipient(letterKey, recipient.publicKey, tlock);

    await expect(unwrapLetterKeyForRecipient(sealed, recipient, tlock)).rejects.toThrow(
      "아직 개봉 round에 도달하지 않았습니다.",
    );
    currentRound = 100n;
    await expect(unwrapLetterKeyForRecipient(sealed, recipient, tlock)).resolves.toEqual(letterKey);
  });

  it("creates and opens a recovery envelope only after the configured round", async () => {
    const recovery = await mailboxKeyPairFromSeed(hexToBytes("61".repeat(32)));
    const mailboxSeed = hexToBytes("62".repeat(32));
    const tlock = new TlockAdapter({
      unlockRound: 100n,
      currentRound: async () => 100n,
      primitive: fakePrimitive(),
    });
    const envelope = await createRecoveryEnvelope(mailboxSeed, recovery.publicKey, tlock);
    await expect(openRecoveryEnvelope(envelope, recovery, tlock)).resolves.toEqual(mailboxSeed);

    const client = await mailboxKeyPairFromSeed(hexToBytes("63".repeat(32)));
    const rewrapped = await rewrapRecoverySeedForClient(
      envelope,
      recovery,
      client.publicKey,
      tlock,
    );
    await expect(openSealBox(rewrapped, client)).resolves.toEqual(mailboxSeed);
  });
});
