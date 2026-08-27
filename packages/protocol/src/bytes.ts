const HEX_PATTERN = /^[0-9a-fA-F]*$/;

export function ascii(value: string): Uint8Array {
  if ([...value].some((character) => character.charCodeAt(0) > 0x7f)) {
    throw new RangeError("ASCII 문자열만 허용됩니다.");
  }

  return new TextEncoder().encode(value);
}

export function utf8(value: string): Uint8Array {
  return new TextEncoder().encode(value);
}

export function concatBytes(...chunks: readonly Uint8Array[]): Uint8Array {
  const length = chunks.reduce((total, chunk) => total + chunk.byteLength, 0);
  const output = new Uint8Array(length);
  let offset = 0;

  for (const chunk of chunks) {
    output.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return output;
}

export function bytesToHex(value: Uint8Array): string {
  return [...value].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function hexToBytes(value: string, expectedLength?: number): Uint8Array {
  const normalized = value.startsWith("0x") ? value.slice(2) : value;
  if (normalized.length % 2 !== 0 || !HEX_PATTERN.test(normalized)) {
    throw new TypeError("hex 문자열 형식이 올바르지 않습니다.");
  }

  const output = Uint8Array.from(
    normalized.match(/.{2}/g)?.map((pair) => Number.parseInt(pair, 16)) ?? [],
  );

  if (expectedLength !== undefined && output.byteLength !== expectedLength) {
    throw new RangeError(`hex 값은 정확히 ${expectedLength}바이트여야 합니다.`);
  }

  return output;
}

export class ByteWriter {
  readonly #chunks: Uint8Array[] = [];

  writeBytes(value: Uint8Array): this {
    this.#chunks.push(new Uint8Array(value));
    return this;
  }

  writeUint8(value: number): this {
    return this.writeInteger(value, 1);
  }

  writeUint16(value: number): this {
    return this.writeInteger(value, 2);
  }

  writeUint32(value: number): this {
    return this.writeInteger(value, 4);
  }

  writeUint256(value: bigint): this {
    if (value < 0n || value >= 1n << 256n) {
      throw new RangeError("uint256 범위를 벗어났습니다.");
    }

    const output = new Uint8Array(32);
    let remaining = value;
    for (let index = output.length - 1; index >= 0; index -= 1) {
      output[index] = Number(remaining & 0xffn);
      remaining >>= 8n;
    }

    return this.writeBytes(output);
  }

  toBytes(): Uint8Array {
    return concatBytes(...this.#chunks);
  }

  private writeInteger(value: number, byteLength: 1 | 2 | 4): this {
    const maximum = 2 ** (byteLength * 8) - 1;
    if (!Number.isSafeInteger(value) || value < 0 || value > maximum) {
      throw new RangeError(`uint${byteLength * 8} 범위를 벗어났습니다.`);
    }

    const output = new Uint8Array(4);
    new DataView(output.buffer).setUint32(0, value, false);
    return this.writeBytes(output.slice(4 - byteLength));
  }
}

export class ByteReader {
  #offset = 0;

  constructor(private readonly input: Uint8Array) {}

  get remaining(): number {
    return this.input.byteLength - this.#offset;
  }

  readBytes(length: number): Uint8Array {
    if (!Number.isSafeInteger(length) || length < 0 || length > this.remaining) {
      throw new RangeError("입력 바이트 범위를 벗어났습니다.");
    }

    const output = this.input.slice(this.#offset, this.#offset + length);
    this.#offset += length;
    return output;
  }

  readUint8(): number {
    return this.readBytes(1)[0]!;
  }

  readUint16(): number {
    const bytes = this.readBytes(2);
    return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint16(0, false);
  }

  readUint32(): number {
    const bytes = this.readBytes(4);
    return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(0, false);
  }

  expectBytes(expected: Uint8Array): void {
    const actual = this.readBytes(expected.byteLength);
    if (actual.some((byte, index) => byte !== expected[index])) {
      throw new TypeError("예상한 magic 또는 version 바이트와 다릅니다.");
    }
  }

  finish(): void {
    if (this.remaining !== 0) {
      throw new TypeError("허용되지 않은 trailing bytes가 있습니다.");
    }
  }
}
