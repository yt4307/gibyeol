import { describe, expect, it } from "vitest";
import {
  bytesToHex,
  concatBytes,
  decryptGbyl,
  encodeLetterContext,
  gbylFilename,
  hexToBytes,
  MEDIA_CODEC,
  MEDIA_TYPE,
  MAX_ARCHIVE_BYTES,
  packGbyl,
  parseGbyl,
  sha256,
  utf8,
} from "../src";

const letterKey = hexToBytes("cd".repeat(32));
const context = encodeLetterContext({
  chainId: 84_532,
  contractAddress: "11".repeat(20),
  letterId: "22".repeat(32),
  sender: "33".repeat(20),
  recipient: "44".repeat(20),
});
const iv = hexToBytes("66".repeat(12));

describe("GBYL", () => {
  it("encodes the canonical zero-item 8-byte archive and SHA-256 filename", async () => {
    const archive = await packGbyl([], letterKey, context);
    expect(bytesToHex(archive)).toBe("4742594c01000000");
    expect(await gbylFilename(archive)).toBe(
      "32ae373bcccea749cb77fac2a5c6159f63008c98ab4b83442297d523808c3b84.gbyl",
    );
    expect(parseGbyl(archive)).toEqual([]);
  });

  it("packs, parses, authenticates, and decrypts media by index", async () => {
    const inputs = [
      { type: MEDIA_TYPE.IMAGE, codec: MEDIA_CODEC.WEBP, bytes: utf8("image") },
      { type: MEDIA_TYPE.TIMELAPSE, codec: MEDIA_CODEC.WEBM, bytes: utf8("video") },
    ] as const;
    const archive = await packGbyl(inputs, letterKey, context, () => iv);
    expect(parseGbyl(archive)).toHaveLength(2);
    await expect(decryptGbyl(archive, letterKey, context)).resolves.toEqual(inputs);

    const tampered = archive.slice();
    tampered[tampered.length - 1] ^= 1;
    expect(bytesToHex(await sha256(tampered))).not.toBe(bytesToHex(await sha256(archive)));
    await expect(decryptGbyl(tampered, letterKey, context)).rejects.toThrow();
  });

  it("rejects unknown flags, codecs, trailing bytes, and truncated entries", async () => {
    const archive = await packGbyl(
      [{ type: MEDIA_TYPE.IMAGE, codec: MEDIA_CODEC.JPEG, bytes: utf8("x") }],
      letterKey,
      context,
      () => iv,
    );
    const badHeaderFlags = archive.slice();
    badHeaderFlags[5] = 1;
    expect(() => parseGbyl(badHeaderFlags)).toThrow(TypeError);

    const badCodec = archive.slice();
    badCodec[9] = 0xff;
    expect(() => parseGbyl(badCodec)).toThrow(TypeError);

    const badItemFlags = archive.slice();
    badItemFlags[11] = 1;
    expect(() => parseGbyl(badItemFlags)).toThrow(TypeError);
    expect(() => parseGbyl(new Uint8Array([...archive, 0]))).toThrow(TypeError);
    expect(() => parseGbyl(archive.slice(0, -1))).toThrow(RangeError);
    expect(() => parseGbyl(new Uint8Array(MAX_ARCHIVE_BYTES + 1))).toThrow(RangeError);

    await expect(
      packGbyl(
        [
          {
            type: MEDIA_TYPE.IMAGE,
            codec: MEDIA_CODEC.WEBP,
            bytes: new Uint8Array(MAX_ARCHIVE_BYTES),
          },
        ],
        letterKey,
        context,
        () => iv,
      ),
    ).rejects.toThrow(RangeError);
  });

  it("accepts an exactly 10 MiB structurally valid archive and rejects one byte more", () => {
    const archive = new Uint8Array(MAX_ARCHIVE_BYTES);
    archive.set([0x47, 0x42, 0x59, 0x4c, 0x01, 0x00, 0x00, 0x01]);
    archive.set([MEDIA_TYPE.IMAGE, MEDIA_CODEC.WEBP, 0x00, 0x00], 8);
    const ciphertextLength = MAX_ARCHIVE_BYTES - 28;
    new DataView(archive.buffer).setUint32(24, ciphertextLength, false);

    expect(parseGbyl(archive)).toHaveLength(1);
    expect(() => parseGbyl(new Uint8Array(MAX_ARCHIVE_BYTES + 1))).toThrow(RangeError);
  });

  it("authenticates item order through index-specific keys and AAD", async () => {
    const archive = await packGbyl(
      [
        { type: MEDIA_TYPE.IMAGE, codec: MEDIA_CODEC.WEBP, bytes: utf8("image") },
        { type: MEDIA_TYPE.TIMELAPSE, codec: MEDIA_CODEC.WEBM, bytes: utf8("video") },
      ],
      letterKey,
      context,
      () => iv,
    );
    const [first, second] = parseGbyl(archive);
    const firstLength = 20 + first!.ciphertext.byteLength;
    const reordered = concatBytes(
      archive.slice(0, 8),
      archive.slice(8 + firstLength),
      archive.slice(8, 8 + firstLength),
    );

    expect(parseGbyl(reordered)).toHaveLength(2);
    await expect(decryptGbyl(reordered, letterKey, context)).rejects.toThrow();
  });
});
