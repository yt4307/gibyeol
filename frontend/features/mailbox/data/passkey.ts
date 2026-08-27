import {
  hexToBytes,
  mailboxKeyPairFromSeed,
  parseGpk1,
  secureRandomBytes,
  unwrapMailboxSeedGpk1,
  wrapMailboxSeedGpk1,
} from "@gibyeol/protocol";

type PrfResults = { prf?: { results?: { first?: ArrayBuffer } } };

function asArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const output = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(output).set(bytes);
  return output;
}

function prfOutput(credential: PublicKeyCredential): Uint8Array {
  const first = (credential.getClientExtensionResults() as PrfResults).prf?.results?.first;
  if (!(first instanceof ArrayBuffer) || first.byteLength !== 32) {
    throw new Error("이 Passkey는 WebAuthn PRF를 지원하지 않습니다.");
  }
  return new Uint8Array(first);
}

export async function createPasskeyMailbox(walletAddress: string) {
  const seed = secureRandomBytes(32);
  const prfInput = secureRandomBytes(32);
  const credential = (await navigator.credentials.create({
    publicKey: {
      challenge: asArrayBuffer(secureRandomBytes(32)),
      rp: { name: "Gibyeol" },
      user: {
        id: asArrayBuffer(hexToBytes(walletAddress, 20)),
        name: walletAddress,
        displayName: `기별 ${walletAddress.slice(0, 8)}`,
      },
      pubKeyCredParams: [{ type: "public-key", alg: -7 }],
      authenticatorSelection: { residentKey: "preferred", userVerification: "required" },
      timeout: 60_000,
      attestation: "none",
      extensions: { prf: { eval: { first: asArrayBuffer(prfInput) } } },
    },
  })) as PublicKeyCredential | null;
  if (!credential) throw new Error("Passkey 생성이 취소되었습니다.");
  const envelope = await wrapMailboxSeedGpk1(
    seed,
    new Uint8Array(credential.rawId),
    prfOutput(credential),
    (() => {
      let saltPending = true;
      return (length: number) => {
        if (saltPending && length === 32) {
          saltPending = false;
          return new Uint8Array(prfInput);
        }
        return secureRandomBytes(length);
      };
    })(),
  );
  return { seed, envelope, keyPair: await mailboxKeyPairFromSeed(seed) };
}

export async function openPasskeyMailbox(envelope: Uint8Array) {
  const parsed = parseGpk1(envelope);
  const credential = (await navigator.credentials.get({
    publicKey: {
      challenge: asArrayBuffer(secureRandomBytes(32)),
      allowCredentials: [{ type: "public-key", id: asArrayBuffer(parsed.credentialId) }],
      userVerification: "required",
      timeout: 60_000,
      extensions: { prf: { eval: { first: asArrayBuffer(parsed.prfSalt) } } },
    },
  })) as PublicKeyCredential | null;
  if (!credential) throw new Error("Passkey 확인이 취소되었습니다.");
  const seed = await unwrapMailboxSeedGpk1(envelope, prfOutput(credential));
  try {
    return await mailboxKeyPairFromSeed(seed);
  } finally {
    seed.fill(0);
  }
}
