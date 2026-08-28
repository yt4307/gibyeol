import { describe, expect, it } from "vitest";
import {
  bytesToHex,
  decryptGbyl,
  decryptTextGtx1,
  encodeLetterContext,
  encryptTextGtx1,
  hexToBytes,
  mailboxKeyPairFromSeed,
  MEDIA_CODEC,
  MEDIA_TYPE,
  packGbyl,
  parseGbyl,
  QUICKNET_CHAIN_HASH,
  sha256,
  TlockAdapter,
  type TlockPrimitive,
  unwrapLetterKeyForRecipient,
  unwrapMailboxSeedGpk1,
  utf8,
  wrapLetterKeyForRecipient,
  wrapMailboxSeedGpk1,
} from "../src";

function localTlock(round: () => bigint): TlockAdapter {
  const primitive: TlockPrimitive = {
    async encrypt(payload, unlockRound, chainHash) {
      expect(unlockRound).toBe(200n);
      expect(chainHash).toEqual(hexToBytes(QUICKNET_CHAIN_HASH));
      return new Uint8Array([0x74, 0x6c, ...payload]);
    },
    async decrypt(ciphertext, chainHash) {
      expect(chainHash).toEqual(hexToBytes(QUICKNET_CHAIN_HASH));
      return ciphertext.slice(2);
    },
  };
  return new TlockAdapter({ unlockRound: 200n, currentRound: async () => round(), primitive });
}

describe("v1 local cryptographic flow", () => {
  it("creates a mailbox, seals a letter, rejects early opening, and restores all plaintext", async () => {
    const mailboxSeed = hexToBytes("11".repeat(32));
    const passkeyPrf = hexToBytes("12".repeat(32));
    const credentialId = hexToBytes("a1a2a3a4");
    let randomCall = 0;
    const passkeyEnvelope = await wrapMailboxSeedGpk1(
      mailboxSeed,
      credentialId,
      passkeyPrf,
      (length) => new Uint8Array(length).fill(++randomCall),
    );
    const restoredSeed = await unwrapMailboxSeedGpk1(passkeyEnvelope, passkeyPrf);
    const recipient = await mailboxKeyPairFromSeed(restoredSeed);
    const expectedRecipient = await mailboxKeyPairFromSeed(mailboxSeed);
    expect(recipient.publicKey).toEqual(expectedRecipient.publicKey);

    const letterKey = hexToBytes("21".repeat(32));
    const context = encodeLetterContext({
      chainId: 84_532,
      contractAddress: "0x3333333333333333333333333333333333333333",
      letterId: "44".repeat(32),
      sender: "0x5555555555555555555555555555555555555555",
      recipient: "0x6666666666666666666666666666666666666666",
    });
    const encryptedText = await encryptTextGtx1("2026년 크리스마스에 만나요 🎄", letterKey, context);
    const archive = await packGbyl(
      [
        { type: MEDIA_TYPE.IMAGE, codec: MEDIA_CODEC.WEBP, bytes: utf8("image bytes") },
        { type: MEDIA_TYPE.TIMELAPSE, codec: MEDIA_CODEC.WEBM, bytes: utf8("video bytes") },
      ],
      letterKey,
      context,
    );
    const archiveSha256 = await sha256(archive);
    expect(parseGbyl(archive)).toHaveLength(2);
    expect(bytesToHex(archiveSha256)).toHaveLength(64);

    let currentRound = 199n;
    const tlock = localTlock(() => currentRound);
    const sealedKey = await wrapLetterKeyForRecipient(letterKey, recipient.publicKey, tlock);
    await expect(unwrapLetterKeyForRecipient(sealedKey, recipient, tlock)).rejects.toThrow(
      "아직 개봉 round에 도달하지 않았습니다.",
    );

    currentRound = 200n;
    const openedLetterKey = await unwrapLetterKeyForRecipient(sealedKey, recipient, tlock);
    await expect(decryptTextGtx1(encryptedText, openedLetterKey, context)).resolves.toBe(
      "2026년 크리스마스에 만나요 🎄",
    );
    await expect(decryptGbyl(archive, openedLetterKey, context)).resolves.toEqual([
      { type: MEDIA_TYPE.IMAGE, codec: MEDIA_CODEC.WEBP, bytes: utf8("image bytes") },
      { type: MEDIA_TYPE.TIMELAPSE, codec: MEDIA_CODEC.WEBM, bytes: utf8("video bytes") },
    ]);
  });
});
