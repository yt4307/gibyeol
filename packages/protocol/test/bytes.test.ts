import { describe, expect, it } from "vitest";
import { ByteReader, ByteWriter, bytesToHex, hexToBytes } from "../src";

describe("strict byte reader/writer", () => {
  it("writes integers in canonical big-endian order", () => {
    const bytes = new ByteWriter()
      .writeUint8(0x12)
      .writeUint16(0x3456)
      .writeUint32(0x789abcde)
      .writeUint256(1n)
      .toBytes();

    expect(bytesToHex(bytes)).toBe(
      "123456789abcde" + "00".repeat(31) + "01",
    );

    const reader = new ByteReader(bytes);
    expect(reader.readUint8()).toBe(0x12);
    expect(reader.readUint16()).toBe(0x3456);
    expect(reader.readUint32()).toBe(0x789abcde);
    expect(reader.readBytes(32)).toEqual(hexToBytes("00".repeat(31) + "01"));
    reader.finish();
  });

  it("rejects overflow, underflow, invalid hex, and trailing bytes", () => {
    expect(() => new ByteWriter().writeUint16(65_536)).toThrow(RangeError);
    expect(() => new ByteWriter().writeUint256(-1n)).toThrow(RangeError);
    expect(() => hexToBytes("xyz")).toThrow(TypeError);
    expect(() => new ByteReader(Uint8Array.of(1)).readUint16()).toThrow(RangeError);
    expect(() => new ByteReader(Uint8Array.of(1)).finish()).toThrow(TypeError);
  });
});
