import { hexToBytes } from "./bytes";
import { openSealBox, sealBox, type MailboxKeyPair } from "./mailbox";

export const QUICKNET_CHAIN_HASH =
  "52db9ba70e0cc0f6eaf7803dd07447a1f5477735fd3f661792ba94600c84e971" as const;

export interface TlockPrimitive {
  encrypt(payload: Uint8Array, round: bigint, chainHash: Uint8Array): Promise<Uint8Array>;
  decrypt(ciphertext: Uint8Array, chainHash: Uint8Array): Promise<Uint8Array>;
}

export interface TlockAdapterOptions {
  unlockRound: bigint;
  currentRound: () => Promise<bigint>;
  primitive: TlockPrimitive;
  chainHash?: string;
}

export class TlockAdapter {
  readonly #unlockRound: bigint;
  readonly #currentRound: () => Promise<bigint>;
  readonly #primitive: TlockPrimitive;
  readonly #chainHash: Uint8Array;

  constructor(options: TlockAdapterOptions) {
    if (options.unlockRound <= 0n) {
      throw new RangeError("unlock round는 양수여야 합니다.");
    }
    this.#unlockRound = options.unlockRound;
    this.#currentRound = options.currentRound;
    this.#primitive = options.primitive;
    this.#chainHash = hexToBytes(options.chainHash ?? QUICKNET_CHAIN_HASH, 32);
  }

  encrypt(payload: Uint8Array): Promise<Uint8Array> {
    return this.#primitive.encrypt(payload, this.#unlockRound, this.#chainHash);
  }

  async decrypt(ciphertext: Uint8Array): Promise<Uint8Array> {
    if ((await this.#currentRound()) < this.#unlockRound) {
      throw new Error("아직 개봉 round에 도달하지 않았습니다.");
    }
    return this.#primitive.decrypt(ciphertext, this.#chainHash);
  }
}

export async function wrapLetterKeyForRecipient(
  letterKey: Uint8Array,
  recipientPublicKey: Uint8Array,
  tlock: TlockAdapter,
): Promise<Uint8Array> {
  if (letterKey.byteLength !== 32) {
    throw new RangeError("Letter Key는 정확히 32바이트여야 합니다.");
  }
  return tlock.encrypt(await sealBox(letterKey, recipientPublicKey));
}

export async function unwrapLetterKeyForRecipient(
  sealedKey: Uint8Array,
  recipientKeyPair: MailboxKeyPair,
  tlock: TlockAdapter,
): Promise<Uint8Array> {
  return openSealBox(await tlock.decrypt(sealedKey), recipientKeyPair);
}

export async function createRecoveryEnvelope(
  mailboxSeed: Uint8Array,
  recoveryPublicKey: Uint8Array,
  tlock: TlockAdapter,
): Promise<Uint8Array> {
  return tlock.encrypt(await sealBox(mailboxSeed, recoveryPublicKey));
}

export async function openRecoveryEnvelope(
  envelope: Uint8Array,
  recoveryKeyPair: MailboxKeyPair,
  tlock: TlockAdapter,
): Promise<Uint8Array> {
  return openSealBox(await tlock.decrypt(envelope), recoveryKeyPair);
}

export async function rewrapRecoverySeedForClient(
  envelope: Uint8Array,
  recoveryKeyPair: MailboxKeyPair,
  clientPublicKey: Uint8Array,
  tlock: TlockAdapter,
): Promise<Uint8Array> {
  const seed = await openRecoveryEnvelope(envelope, recoveryKeyPair, tlock);
  return sealBox(seed, clientPublicKey);
}
