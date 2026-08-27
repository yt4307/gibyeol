import { createRequire } from "node:module";

const require = createRequire(new URL("../frontend/package.json", import.meta.url));
const {
  Buffer,
  defaultChainInfo,
  defaultChainUrl,
  HttpChainClient,
  timelockDecrypt,
  timelockEncrypt,
} = require("tlock-js");

const options = {
  disableBeaconVerification: false,
  noCache: false,
  chainVerificationParams: {
    chainHash: defaultChainInfo.hash,
    publicKey: defaultChainInfo.public_key,
  },
};
const chain = { baseUrl: defaultChainUrl, info: async () => defaultChainInfo };
const client = new HttpChainClient(chain, options);
const latest = await client.latest();
const plaintext = `gibyeol-quicknet-${latest.round}`;
const ciphertext = await timelockEncrypt(latest.round, Buffer.from(plaintext), client);
const decrypted = await timelockDecrypt(ciphertext, client);

if (decrypted.toString() !== plaintext) throw new Error("Quicknet tlock roundtrip mismatch.");
console.log(JSON.stringify({ ok: true, round: latest.round, chainHash: defaultChainInfo.hash }));
