import { describe, expect, it } from "vitest";
import {
  bytesToHex,
  hexToBytes,
  mailboxKeyPairFromSeed,
  openSealBox,
  parseGpk1,
  sealBox,
  unwrapMailboxSeedGpk1,
  wrapMailboxSeedGpk1,
} from "../src";

describe("mailbox key and GPK1", () => {
  it("derives an X25519 keypair from seed and opens sealed boxes", async () => {
    const seed = hexToBytes("01".repeat(32));
    const keyPair = await mailboxKeyPairFromSeed(seed);
    expect(bytesToHex(keyPair.publicKey)).toBe(
      "1b1b58dd50ea14b60da17b790cd02754d970c9bab864ebb3c0f3016fe51d3f57",
    );
    const message = hexToBytes("02".repeat(32));
    await expect(openSealBox(await sealBox(message, keyPair.publicKey), keyPair)).resolves.toEqual(
      message,
    );
  });

  it("wraps Mailbox Seed in canonical GPK1 and authenticates its prefix", async () => {
    const seed = hexToBytes("10".repeat(32));
    const credentialId = hexToBytes("a1a2a3a4");
    const prfOutput = hexToBytes("20".repeat(32));
    const salt = hexToBytes("30".repeat(32));
    const iv = hexToBytes("40".repeat(12));
    const envelope = await wrapMailboxSeedGpk1(seed, credentialId, prfOutput, (length) => {
      if (length === 32) return salt;
      if (length === 12) return iv;
      throw new Error("unexpected random length");
    });

    const parsed = parseGpk1(envelope);
    expect(parsed.credentialId).toEqual(credentialId);
    expect(parsed.prfSalt).toEqual(salt);
    expect(parsed.iv).toEqual(iv);
    await expect(unwrapMailboxSeedGpk1(envelope, prfOutput)).resolves.toEqual(seed);

    const tampered = envelope.slice();
    tampered[7] ^= 1;
    await expect(unwrapMailboxSeedGpk1(tampered, prfOutput)).rejects.toThrow();
    await expect(
      unwrapMailboxSeedGpk1(envelope, hexToBytes("21".repeat(32))),
    ).rejects.toThrow();
    expect(() => parseGpk1(new Uint8Array([...envelope, 0]))).toThrow(TypeError);
  });
});
