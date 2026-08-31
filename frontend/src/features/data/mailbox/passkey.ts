import {
  hexToBytes,
  mailboxKeyPairFromSeed,
  parseGpk1,
  secureRandomBytes,
  unwrapMailboxSeedGpk1,
  wrapMailboxSeedGpk1,
} from "@gibyeol/protocol";

type PrfResults = { prf?: { results?: { first?: ArrayBuffer } } };

type MetaMaskWindow = typeof window & {
  ethereum?: { isMetaMask?: boolean };
};

export function isUnsupportedPasskeyBrowser(
  userAgent = navigator.userAgent,
  injectedMetaMask = Boolean((window as MetaMaskWindow).ethereum?.isMetaMask),
): boolean {
  const mobile = /Android|iPhone|iPad|iPod/i.test(userAgent);
  return /KAKAOTALK/i.test(userAgent)
    || (mobile && (injectedMetaMask || /MetaMaskMobile/i.test(userAgent)));
}

function assertPasskeyBrowserSupport() {
  if (isUnsupportedPasskeyBrowser()) {
    throw new Error(
      "앱 내 브라우저에서는 안전한 패스키를 사용할 수 없습니다. 주소를 복사해 Safari 또는 Chrome에서 기별을 열어 주세요.",
    );
  }
  if (typeof PublicKeyCredential === "undefined" || !navigator.credentials?.create) {
    throw new Error(
      "이 브라우저는 패스키를 지원하지 않습니다. 최신 Safari 또는 Chrome에서 다시 시도해 주세요.",
    );
  }
}

function asArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const output = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(output).set(bytes);
  return output;
}

function prfOutput(credential: PublicKeyCredential): Uint8Array | null {
  const first = (credential.getClientExtensionResults() as PrfResults).prf?.results?.first;
  if (!(first instanceof ArrayBuffer) || first.byteLength !== 32) {
    return null;
  }
  return new Uint8Array(first);
}

async function authenticatePrf(credentialId: ArrayBuffer, prfInput: Uint8Array) {
  const assertion = (await navigator.credentials.get({
    publicKey: {
      challenge: asArrayBuffer(secureRandomBytes(32)),
      allowCredentials: [{ type: "public-key", id: credentialId }],
      userVerification: "required",
      timeout: 60_000,
      extensions: { prf: { eval: { first: asArrayBuffer(prfInput) } } },
    },
  })) as PublicKeyCredential | null;
  const output = assertion ? prfOutput(assertion) : null;
  if (!output) throw new Error("이 패스키는 필요한 보안 기능을 지원하지 않습니다.");
  return output;
}

export async function createPasskeyMailbox(walletAddress: string) {
  assertPasskeyBrowserSupport();
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
  if (!credential) throw new Error("패스키 생성이 취소되었습니다.");
  const output = prfOutput(credential) ?? await authenticatePrf(credential.rawId, prfInput);
  const envelope = await wrapMailboxSeedGpk1(
    seed,
    new Uint8Array(credential.rawId),
    output,
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
  assertPasskeyBrowserSupport();
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
  if (!credential) throw new Error("패스키 확인이 취소되었습니다.");
  const output = prfOutput(credential);
  if (!output) throw new Error("이 패스키에서 필요한 보안 키를 얻지 못했습니다.");
  const seed = await unwrapMailboxSeedGpk1(envelope, output);
  try {
    return await mailboxKeyPairFromSeed(seed);
  } finally {
    seed.fill(0);
  }
}
