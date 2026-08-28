import { describe, expect, it } from "vitest";
import {
  decryptTextGtx1,
  encodeLetterContext,
  encryptTextGtx1,
  hexToBytes,
  parseGtx1,
} from "../src";

const letterKey = hexToBytes("ab".repeat(32));
const context = encodeLetterContext({
  chainId: 84_532,
  contractAddress: "10".repeat(20),
  letterId: "20".repeat(32),
  sender: "30".repeat(20),
  recipient: "40".repeat(20),
});
const iv = hexToBytes("55".repeat(12));

describe("GTX1", () => {
  it("chooses gzip only when shorter and round-trips UTF-8", async () => {
    const compressed = await encryptTextGtx1("기별 ".repeat(200), letterKey, context, () => iv);
    const plain = await encryptTextGtx1("짧음", letterKey, context, () => iv);

    expect(parseGtx1(compressed).compressed).toBe(true);
    expect(parseGtx1(plain).compressed).toBe(false);
    await expect(decryptTextGtx1(compressed, letterKey, context)).resolves.toBe("기별 ".repeat(200));
    await expect(decryptTextGtx1(plain, letterKey, context)).resolves.toBe("짧음");
  });

  it("rejects reserved flags, truncated tags, and tampered context", async () => {
    const encrypted = await encryptTextGtx1("인증할 본문", letterKey, context, () => iv);
    const badFlags = encrypted.slice();
    badFlags[4] = 0x80;
    expect(() => parseGtx1(badFlags)).toThrow(TypeError);
    expect(() => parseGtx1(encrypted.slice(0, 30))).toThrow(RangeError);

    const wrongContext = context.slice();
    wrongContext[wrongContext.length - 1] ^= 1;
    await expect(decryptTextGtx1(encrypted, letterKey, wrongContext)).rejects.toThrow();

    const wrongLength = encrypted.slice();
    wrongLength[8] ^= 1;
    await expect(decryptTextGtx1(wrongLength, letterKey, context)).rejects.toThrow(TypeError);

    const wrongIv = encrypted.slice();
    wrongIv[9] ^= 1;
    await expect(decryptTextGtx1(wrongIv, letterKey, context)).rejects.toThrow();

    const wrongCiphertext = encrypted.slice();
    wrongCiphertext[wrongCiphertext.length - 1] ^= 1;
    await expect(decryptTextGtx1(wrongCiphertext, letterKey, context)).rejects.toThrow();
  });
});
