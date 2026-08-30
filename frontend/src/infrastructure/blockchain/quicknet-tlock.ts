import { hexToBytes, QUICKNET_CHAIN_HASH, TlockAdapter, UNLOCK_ROUND } from "@gibyeol/protocol";
import {
  Buffer,
  defaultChainInfo,
  defaultChainUrl,
  HttpChainClient,
  timelockDecrypt,
  timelockEncrypt,
  type ChainClient,
} from "tlock-js";

function quicknetClient(): ChainClient {
  const options = {
    disableBeaconVerification: false,
    noCache: false,
    chainVerificationParams: {
      chainHash: defaultChainInfo.hash,
      publicKey: defaultChainInfo.public_key,
    },
  };
  const staticChain = { baseUrl: defaultChainUrl, info: async () => defaultChainInfo };
  return new HttpChainClient(staticChain, options);
}

export function createQuicknetTlock(unlockRound = BigInt(UNLOCK_ROUND)) {
  const client = quicknetClient();
  return new TlockAdapter({
    unlockRound,
    chainHash: QUICKNET_CHAIN_HASH,
    currentRound: async () => BigInt((await client.latest()).round),
    primitive: {
      encrypt: async (payload, round, chainHash) => {
        if (chainHash.some((byte, index) => byte !== hexToBytes(QUICKNET_CHAIN_HASH)[index])) {
          throw new Error("시간 잠금 네트워크 식별값이 일치하지 않습니다.");
        }
        return new TextEncoder().encode(
          await timelockEncrypt(Number(round), Buffer.from(payload), client),
        );
      },
      decrypt: async (ciphertext) =>
        new Uint8Array(await timelockDecrypt(new TextDecoder().decode(ciphertext), client)),
    },
  });
}
