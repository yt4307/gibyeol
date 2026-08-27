import { describe, expect, it } from "vitest";
import {
  bytesToHex,
  decryptAesGcm,
  deriveMediaKey,
  deriveTextKey,
  encodeLetterContext,
  encodeMediaAad,
  encodeTextAad,
  encryptAesGcm,
  hexToBytes,
  utf8,
} from "../src";

const context = encodeLetterContext({
  chainId: 84_532,
  contractAddress: "0x1111111111111111111111111111111111111111",
  letterId: "22".repeat(32),
  sender: "0x3333333333333333333333333333333333333333",
  recipient: "0x4444444444444444444444444444444444444444",
});

describe("LetterContextV1 and crypto adapters", () => {
  it("encodes the canonical context and AAD", () => {
    expect(bytesToHex(context)).toBe(
      "47494259454f4c3a4c45545445523a5631" +
        "00".repeat(29) +
        "014a34" +
        "11".repeat(20) +
        "22".repeat(32) +
        "33".repeat(20) +
        "44".repeat(20),
    );
    expect(bytesToHex(encodeTextAad(context)).endsWith("54455854")).toBe(true);
    expect(bytesToHex(encodeMediaAad(context, 2)).endsWith("4d454449410002")).toBe(true);
  });

  it("derives distinct deterministic text and media keys", async () => {
    const letterKey = hexToBytes("00".repeat(32));
    const textKey = await deriveTextKey(letterKey);
    const media0 = await deriveMediaKey(letterKey, 0);
    const media1 = await deriveMediaKey(letterKey, 1);

    expect(bytesToHex(textKey)).toBe("fd09d4789e715813cd8de386ad358bff7a9bb4bbc567afc6847d6d76774790ea");
    expect(bytesToHex(media0)).toBe("9ebe206bc94a1e0b7c0a6e74a5c1c67d1798320ed41da5b9503a4e9256478be5");
    expect(media1).not.toEqual(media0);
  });

  it("round-trips AES-GCM and authenticates AAD", async () => {
    const key = hexToBytes("01".repeat(32));
    const iv = hexToBytes("02".repeat(12));
    const plaintext = utf8("기별 protocol vector");
    const aad = encodeTextAad(context);
    const encrypted = await encryptAesGcm(key, plaintext, aad, () => iv);

    expect(bytesToHex(encrypted.ciphertext)).toBe(
      "ed6e79a2f9d3e18da1a3c8a73fc8ae92d4d0b29b84c36b1b3d0ed8d0618de2aac56d9f79bffb",
    );
    await expect(decryptAesGcm(key, iv, encrypted.ciphertext, aad)).resolves.toEqual(plaintext);
    await expect(
      decryptAesGcm(key, iv, encrypted.ciphertext, encodeMediaAad(context, 0)),
    ).rejects.toThrow();
  });
});
