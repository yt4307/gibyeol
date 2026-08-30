import { ascii, ByteReader, ByteWriter } from "./bytes";
import {
  AES_GCM_IV_BYTES,
  AES_GCM_TAG_BYTES,
  decryptAesGcm,
  deriveTextKey,
  encryptAesGcm,
  type RandomBytes,
  secureRandomBytes,
} from "./crypto";
import { encodeTextAad } from "./context";

const GTX1_MAGIC = ascii("GTX1");
const FLAG_GZIP = 0x01;
export const MAX_ENCRYPTED_TEXT_BYTES = 65_536;

function asArrayBuffer(value: Uint8Array): ArrayBuffer {
  const buffer = new ArrayBuffer(value.byteLength);
  new Uint8Array(buffer).set(value);
  return buffer;
}

async function transform(
  input: Uint8Array,
  stream: CompressionStream | DecompressionStream,
): Promise<Uint8Array> {
  const output = new Response(stream.readable).arrayBuffer();
  const writer = stream.writable.getWriter();
  await writer.write(new Uint8Array(asArrayBuffer(input)));
  await writer.close();
  return new Uint8Array(await output);
}

export function gzip(input: Uint8Array): Promise<Uint8Array> {
  return transform(input, new CompressionStream("gzip"));
}

export function gunzip(input: Uint8Array): Promise<Uint8Array> {
  return transform(input, new DecompressionStream("gzip"));
}

export interface ParsedGtx1 {
  compressed: boolean;
  originalUtf8Length: number;
  iv: Uint8Array;
  ciphertext: Uint8Array;
}

export async function encryptTextGtx1(
  text: string,
  letterKey: Uint8Array,
  letterContext: Uint8Array,
  randomBytes: RandomBytes = secureRandomBytes,
): Promise<Uint8Array> {
  const original = new TextEncoder().encode(text);
  const compressed = await gzip(original);
  const useCompressed = compressed.byteLength < original.byteLength;
  const plaintext = useCompressed ? compressed : original;
  const key = await deriveTextKey(letterKey);
  const encrypted = await encryptAesGcm(key, plaintext, encodeTextAad(letterContext), randomBytes);
  const output = new ByteWriter()
    .writeBytes(GTX1_MAGIC)
    .writeUint8(useCompressed ? FLAG_GZIP : 0)
    .writeUint32(original.byteLength)
    .writeBytes(encrypted.iv)
    .writeBytes(encrypted.ciphertext)
    .toBytes();

  if (output.byteLength > MAX_ENCRYPTED_TEXT_BYTES) {
    throw new RangeError("GTX1이 온체인 최대 크기 65,536바이트를 초과합니다.");
  }
  return output;
}

export function parseGtx1(input: Uint8Array): ParsedGtx1 {
  if (input.byteLength > MAX_ENCRYPTED_TEXT_BYTES) {
    throw new RangeError("GTX1 최대 크기를 초과했습니다.");
  }
  const reader = new ByteReader(input);
  reader.expectBytes(GTX1_MAGIC);
  const flags = reader.readUint8();
  if ((flags & ~FLAG_GZIP) !== 0) {
    throw new TypeError("지원하지 않는 GTX1 flags입니다.");
  }
  const originalUtf8Length = reader.readUint32();
  const iv = reader.readBytes(AES_GCM_IV_BYTES);
  if (reader.remaining < AES_GCM_TAG_BYTES) {
    throw new RangeError("GTX1 ciphertext에 인증 tag가 없습니다.");
  }
  const ciphertext = reader.readBytes(reader.remaining);
  reader.finish();
  return { compressed: flags === FLAG_GZIP, originalUtf8Length, iv, ciphertext };
}

export async function decryptTextGtx1(
  input: Uint8Array,
  letterKey: Uint8Array,
  letterContext: Uint8Array,
): Promise<string> {
  const parsed = parseGtx1(input);
  const key = await deriveTextKey(letterKey);
  const decrypted = await decryptAesGcm(
    key,
    parsed.iv,
    parsed.ciphertext,
    encodeTextAad(letterContext),
  );
  const original = parsed.compressed ? await gunzip(decrypted) : decrypted;
  if (original.byteLength !== parsed.originalUtf8Length) {
    throw new TypeError("GTX1 원문 길이가 header와 다릅니다.");
  }
  return new TextDecoder("utf-8", { fatal: true }).decode(original);
}
