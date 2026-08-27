import { ascii, ByteReader, ByteWriter, bytesToHex } from "./bytes";
import {
  AES_GCM_IV_BYTES,
  AES_GCM_TAG_BYTES,
  decryptAesGcm,
  deriveMediaKey,
  encryptAesGcm,
  type RandomBytes,
  secureRandomBytes,
} from "./crypto";
import { encodeMediaAad } from "./context";
import { MAX_ARCHIVE_BYTES, PROTOCOL_VERSION } from "./constants";

const GBYL_MAGIC = ascii("GBYL");

export const MEDIA_TYPE = {
  IMAGE: 0x01,
  TIMELAPSE: 0x02,
} as const;

export const MEDIA_CODEC = {
  WEBP: 0x01,
  JPEG: 0x02,
  WEBM: 0x10,
  MP4: 0x11,
} as const;

export interface MediaInput {
  type: (typeof MEDIA_TYPE)[keyof typeof MEDIA_TYPE];
  codec: (typeof MEDIA_CODEC)[keyof typeof MEDIA_CODEC];
  bytes: Uint8Array;
}

export interface EncryptedMediaItem {
  type: MediaInput["type"];
  codec: MediaInput["codec"];
  iv: Uint8Array;
  ciphertext: Uint8Array;
}

function assertMediaMapping(type: number, codec: number): asserts type is MediaInput["type"] {
  const valid =
    (type === MEDIA_TYPE.IMAGE && ([MEDIA_CODEC.WEBP, MEDIA_CODEC.JPEG] as number[]).includes(codec)) ||
    (type === MEDIA_TYPE.TIMELAPSE &&
      ([MEDIA_CODEC.WEBM, MEDIA_CODEC.MP4] as number[]).includes(codec));
  if (!valid) {
    throw new TypeError("지원하지 않는 media type/codec 조합입니다.");
  }
}

export async function packGbyl(
  items: readonly MediaInput[],
  letterKey: Uint8Array,
  letterContext: Uint8Array,
  randomBytes: RandomBytes = secureRandomBytes,
): Promise<Uint8Array> {
  if (items.length > 0xffff) {
    throw new RangeError("GBYL itemCount가 uint16 범위를 초과했습니다.");
  }
  const writer = new ByteWriter()
    .writeBytes(GBYL_MAGIC)
    .writeUint8(PROTOCOL_VERSION)
    .writeUint8(0)
    .writeUint16(items.length);

  for (const [index, item] of items.entries()) {
    assertMediaMapping(item.type, item.codec);
    const key = await deriveMediaKey(letterKey, index);
    const encrypted = await encryptAesGcm(
      key,
      item.bytes,
      encodeMediaAad(letterContext, index),
      randomBytes,
    );
    writer
      .writeUint8(item.type)
      .writeUint8(item.codec)
      .writeUint16(0)
      .writeBytes(encrypted.iv)
      .writeUint32(encrypted.ciphertext.byteLength)
      .writeBytes(encrypted.ciphertext);
  }

  const archive = writer.toBytes();
  if (archive.byteLength > MAX_ARCHIVE_BYTES) {
    throw new RangeError("GBYL 최종 파일이 10 MiB를 초과했습니다.");
  }
  return archive;
}

export function parseGbyl(input: Uint8Array): EncryptedMediaItem[] {
  if (input.byteLength > MAX_ARCHIVE_BYTES) {
    throw new RangeError("GBYL 최종 파일이 10 MiB를 초과했습니다.");
  }
  const reader = new ByteReader(input);
  reader.expectBytes(GBYL_MAGIC);
  if (reader.readUint8() !== PROTOCOL_VERSION) {
    throw new TypeError("지원하지 않는 GBYL version입니다.");
  }
  if (reader.readUint8() !== 0) {
    throw new TypeError("지원하지 않는 GBYL header flags입니다.");
  }
  const itemCount = reader.readUint16();
  const items: EncryptedMediaItem[] = [];

  for (let index = 0; index < itemCount; index += 1) {
    const type = reader.readUint8();
    const codec = reader.readUint8();
    assertMediaMapping(type, codec);
    if (reader.readUint16() !== 0) {
      throw new TypeError("지원하지 않는 GBYL item flags입니다.");
    }
    const iv = reader.readBytes(AES_GCM_IV_BYTES);
    const ciphertextLength = reader.readUint32();
    if (ciphertextLength < AES_GCM_TAG_BYTES) {
      throw new RangeError("GBYL item ciphertext에 인증 tag가 없습니다.");
    }
    items.push({
      type,
      codec: codec as MediaInput["codec"],
      iv,
      ciphertext: reader.readBytes(ciphertextLength),
    });
  }
  reader.finish();
  return items;
}

export async function decryptGbyl(
  input: Uint8Array,
  letterKey: Uint8Array,
  letterContext: Uint8Array,
): Promise<MediaInput[]> {
  const encryptedItems = parseGbyl(input);
  return Promise.all(
    encryptedItems.map(async (item, index) => ({
      type: item.type,
      codec: item.codec,
      bytes: await decryptAesGcm(
        await deriveMediaKey(letterKey, index),
        item.iv,
        item.ciphertext,
        encodeMediaAad(letterContext, index),
      ),
    })),
  );
}

export async function sha256(input: Uint8Array): Promise<Uint8Array> {
  const buffer = new ArrayBuffer(input.byteLength);
  new Uint8Array(buffer).set(input);
  return new Uint8Array(await crypto.subtle.digest("SHA-256", buffer));
}

export async function gbylFilename(input: Uint8Array): Promise<string> {
  return `${bytesToHex(await sha256(input))}.gbyl`;
}
