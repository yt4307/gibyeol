import sodium from "libsodium-wrappers";
import { ascii, ByteReader, ByteWriter, concatBytes } from "./bytes";
import {
  AES_GCM_IV_BYTES,
  AES_GCM_TAG_BYTES,
  decryptAesGcm,
  encryptAesGcm,
  hkdfSha256,
  type RandomBytes,
  secureRandomBytes,
} from "./crypto";

const GPK1_MAGIC = ascii("GPK1");
const MAILBOX_SEED_BYTES = 32;
const PRF_SALT_BYTES = 32;
const WRAPPED_SEED_BYTES = MAILBOX_SEED_BYTES + AES_GCM_TAG_BYTES;

function exactLength(value: Uint8Array, length: number, name: string): Uint8Array {
  if (value.byteLength !== length) {
    throw new RangeError(`${name}은 정확히 ${length}바이트여야 합니다.`);
  }
  return new Uint8Array(value);
}

export interface MailboxKeyPair {
  publicKey: Uint8Array;
  privateKey: Uint8Array;
}

export async function mailboxKeyPairFromSeed(seed: Uint8Array): Promise<MailboxKeyPair> {
  await sodium.ready;
  const pair = sodium.crypto_box_seed_keypair(exactLength(seed, MAILBOX_SEED_BYTES, "Mailbox Seed"));
  return { publicKey: new Uint8Array(pair.publicKey), privateKey: new Uint8Array(pair.privateKey) };
}

export async function sealBox(message: Uint8Array, publicKey: Uint8Array): Promise<Uint8Array> {
  await sodium.ready;
  return new Uint8Array(sodium.crypto_box_seal(message, exactLength(publicKey, 32, "X25519 public key")));
}

export async function openSealBox(
  ciphertext: Uint8Array,
  keyPair: MailboxKeyPair,
): Promise<Uint8Array> {
  await sodium.ready;
  if (ciphertext.byteLength < sodium.crypto_box_SEALBYTES) {
    throw new RangeError("sealed box ciphertext가 너무 짧습니다.");
  }
  return new Uint8Array(
    sodium.crypto_box_seal_open(
      ciphertext,
      exactLength(keyPair.publicKey, 32, "X25519 public key"),
      exactLength(keyPair.privateKey, 32, "X25519 private key"),
    ),
  );
}

export interface ParsedGpk1 {
  credentialId: Uint8Array;
  prfSalt: Uint8Array;
  iv: Uint8Array;
  wrappedSeed: Uint8Array;
  aad: Uint8Array;
}

async function derivePasskeyKek(prfOutput: Uint8Array, prfSalt: Uint8Array): Promise<Uint8Array> {
  return hkdfSha256(
    exactLength(prfOutput, 32, "WebAuthn PRF output"),
    "GIBYEOL/PASSKEY-KEK/V1",
    exactLength(prfSalt, PRF_SALT_BYTES, "PRF salt"),
  );
}

export async function wrapMailboxSeedGpk1(
  seed: Uint8Array,
  credentialId: Uint8Array,
  prfOutput: Uint8Array,
  randomBytes: RandomBytes = secureRandomBytes,
): Promise<Uint8Array> {
  if (credentialId.byteLength === 0 || credentialId.byteLength > 0xffff) {
    throw new RangeError("credential ID 길이가 uint16 범위에 맞지 않습니다.");
  }
  const prfSalt = exactLength(randomBytes(PRF_SALT_BYTES), PRF_SALT_BYTES, "PRF salt");
  const prefix = new ByteWriter()
    .writeBytes(GPK1_MAGIC)
    .writeUint16(credentialId.byteLength)
    .writeBytes(credentialId)
    .writeBytes(prfSalt)
    .toBytes();
  const encrypted = await encryptAesGcm(
    await derivePasskeyKek(prfOutput, prfSalt),
    exactLength(seed, MAILBOX_SEED_BYTES, "Mailbox Seed"),
    prefix,
    randomBytes,
  );
  return concatBytes(prefix, encrypted.iv, encrypted.ciphertext);
}

export function parseGpk1(input: Uint8Array): ParsedGpk1 {
  const reader = new ByteReader(input);
  reader.expectBytes(GPK1_MAGIC);
  const credentialIdLength = reader.readUint16();
  if (credentialIdLength === 0) {
    throw new RangeError("credential ID가 비어 있습니다.");
  }
  const credentialId = reader.readBytes(credentialIdLength);
  const prfSalt = reader.readBytes(PRF_SALT_BYTES);
  const aad = input.slice(0, 6 + credentialIdLength + PRF_SALT_BYTES);
  const iv = reader.readBytes(AES_GCM_IV_BYTES);
  const wrappedSeed = reader.readBytes(WRAPPED_SEED_BYTES);
  reader.finish();
  return { credentialId, prfSalt, iv, wrappedSeed, aad };
}

export async function unwrapMailboxSeedGpk1(
  envelope: Uint8Array,
  prfOutput: Uint8Array,
): Promise<Uint8Array> {
  const parsed = parseGpk1(envelope);
  return decryptAesGcm(
    await derivePasskeyKek(prfOutput, parsed.prfSalt),
    parsed.iv,
    parsed.wrappedSeed,
    parsed.aad,
  );
}
