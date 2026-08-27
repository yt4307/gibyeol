import { ascii, concatBytes } from "./bytes";

export const AES_KEY_BYTES = 32;
export const AES_GCM_IV_BYTES = 12;
export const AES_GCM_TAG_BYTES = 16;
export const HKDF_ZERO_SALT = new Uint8Array(32);

export type RandomBytes = (length: number) => Uint8Array;

export const secureRandomBytes: RandomBytes = (length) => {
  if (!Number.isSafeInteger(length) || length < 0) {
    throw new RangeError("random byte 길이가 올바르지 않습니다.");
  }
  return crypto.getRandomValues(new Uint8Array(length));
};

function exactLength(value: Uint8Array, length: number, name: string): Uint8Array {
  if (value.byteLength !== length) {
    throw new RangeError(`${name}은 정확히 ${length}바이트여야 합니다.`);
  }
  return new Uint8Array(value);
}

function asArrayBuffer(value: Uint8Array): ArrayBuffer {
  const buffer = new ArrayBuffer(value.byteLength);
  new Uint8Array(buffer).set(value);
  return buffer;
}

export async function hkdfSha256(
  inputKeyMaterial: Uint8Array,
  info: Uint8Array | string,
  salt: Uint8Array = HKDF_ZERO_SALT,
  length = 32,
): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey("raw", asArrayBuffer(inputKeyMaterial), "HKDF", false, [
    "deriveBits",
  ]);
  const bits = await crypto.subtle.deriveBits(
    {
      name: "HKDF",
      hash: "SHA-256",
      salt: asArrayBuffer(salt),
      info: asArrayBuffer(typeof info === "string" ? ascii(info) : info),
    },
    key,
    length * 8,
  );
  return new Uint8Array(bits);
}

export function deriveTextKey(letterKey: Uint8Array): Promise<Uint8Array> {
  return hkdfSha256(exactLength(letterKey, 32, "Letter Key"), "GIBYEOL/TEXT/V1");
}

export function deriveMediaKey(letterKey: Uint8Array, index: number): Promise<Uint8Array> {
  if (!Number.isSafeInteger(index) || index < 0 || index > 0xffff) {
    throw new RangeError("미디어 index가 uint16 범위를 벗어났습니다.");
  }
  return hkdfSha256(
    exactLength(letterKey, 32, "Letter Key"),
    concatBytes(ascii("GIBYEOL/MEDIA/V1/"), Uint8Array.of(index >> 8, index & 0xff)),
  );
}

export interface AesGcmCiphertext {
  iv: Uint8Array;
  ciphertext: Uint8Array;
}

export async function encryptAesGcm(
  keyBytes: Uint8Array,
  plaintext: Uint8Array,
  aad: Uint8Array,
  randomBytes: RandomBytes = secureRandomBytes,
): Promise<AesGcmCiphertext> {
  const key = await crypto.subtle.importKey(
    "raw",
    asArrayBuffer(exactLength(keyBytes, AES_KEY_BYTES, "AES key")),
    "AES-GCM",
    false,
    ["encrypt"],
  );
  const iv = exactLength(randomBytes(AES_GCM_IV_BYTES), AES_GCM_IV_BYTES, "AES-GCM IV");
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: asArrayBuffer(iv), additionalData: asArrayBuffer(aad), tagLength: 128 },
    key,
    asArrayBuffer(plaintext),
  );
  return { iv, ciphertext: new Uint8Array(encrypted) };
}

export async function decryptAesGcm(
  keyBytes: Uint8Array,
  iv: Uint8Array,
  ciphertext: Uint8Array,
  aad: Uint8Array,
): Promise<Uint8Array> {
  if (ciphertext.byteLength < AES_GCM_TAG_BYTES) {
    throw new RangeError("AES-GCM ciphertext에 tag가 없습니다.");
  }
  const key = await crypto.subtle.importKey(
    "raw",
    asArrayBuffer(exactLength(keyBytes, AES_KEY_BYTES, "AES key")),
    "AES-GCM",
    false,
    ["decrypt"],
  );
  const decrypted = await crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: asArrayBuffer(exactLength(iv, AES_GCM_IV_BYTES, "AES-GCM IV")),
      additionalData: asArrayBuffer(aad),
      tagLength: 128,
    },
    key,
    asArrayBuffer(ciphertext),
  );
  return new Uint8Array(decrypted);
}
