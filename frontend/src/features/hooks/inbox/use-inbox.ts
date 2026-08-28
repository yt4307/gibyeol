"use client";

import {
  bytesToHex,
  decryptGbyl,
  decryptTextGtx1,
  encodeLetterContext,
  hexToBytes,
  MEDIA_TYPE,
  openSealBox,
  sha256,
  unwrapLetterKeyForRecipient,
  type MailboxKeyPair,
} from "@gibyeol/protocol";
import { useCallback, useEffect, useState } from "react";
import { apiBaseUrl, chainId, contractAbi, contractAddress, publicClient } from "@features/data/blockchain/config";
import { createQuicknetTlock } from "@features/data/blockchain/quicknet-tlock";
import { openPasskeyMailbox } from "@features/data/mailbox/passkey";
import type { InboxLetter, OpenedLetter } from "@features/data/inbox/inbox";
import { loadInbox, loadLetterCalldata, loadMailboxEnvelopes } from "@features/data/inbox/onchain-inbox";

const encode = (bytes: Uint8Array) => rtrim(btoa(String.fromCharCode(...bytes)).replaceAll("+", "-").replaceAll("/", "_"));
const decode = (value: string) => Uint8Array.from(atob(value.replaceAll("-", "+").replaceAll("_", "/") + "=".repeat((4 - value.length % 4) % 4)), (character) => character.charCodeAt(0));
const rtrim = (value: string) => value.replace(/=+$/, "");
const mediaType = (codec: number) => codec === 1 ? "image/webp" : codec === 2 ? "image/jpeg" : codec === 16 ? "video/webm" : "video/mp4";

export function useInbox(address?: `0x${string}`) {
  const [letters, setLetters] = useState<InboxLetter[]>([]);
  const [selected, setSelected] = useState<InboxLetter | null>(null);
  const [opened, setOpened] = useState<OpenedLetter | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!address) return;
    setBusy(true); setError(null);
    try { setLetters(await loadInbox(address)); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "받은 편지를 불러오지 못했습니다."); }
    finally { setBusy(false); }
  }, [address]);

  useEffect(() => { queueMicrotask(() => { void refresh(); }); }, [refresh]);
  useEffect(() => () => { opened?.media.forEach(({ url }) => URL.revokeObjectURL(url)); }, [opened]);

  const decryptWith = useCallback(async (letter: InboxLetter, keyPair: MailboxKeyPair) => {
    let letterKey: Uint8Array | undefined;
    try {
      const registeredPublicKey = await publicClient.readContract({ address: contractAddress, abi: contractAbi, functionName: "mailboxPublicKeys", args: [letter.recipient, letter.recipientKeyId] });
      if (bytesToHex(keyPair.publicKey) !== registeredPublicKey.slice(2).toLowerCase()) {
        throw new Error("Passkey에서 복구한 키가 온체인 메일박스 공개키와 다릅니다.");
      }
      const calldata = await loadLetterCalldata(letter);
      const archiveResponse = await fetch(`${apiBaseUrl}/packages/${letter.archiveSha256.slice(2)}`);
      if (!archiveResponse.ok) throw new Error("편지 미디어 패키지를 찾을 수 없습니다.");
      const archive = new Uint8Array(await archiveResponse.arrayBuffer());
      const actualHash = [...await sha256(archive)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
      if (actualHash !== letter.archiveSha256.slice(2).toLowerCase()) throw new Error("패키지 SHA-256이 온체인 기록과 다릅니다.");
      const context = encodeLetterContext({ chainId, contractAddress, letterId: letter.letterId, sender: letter.sender, recipient: letter.recipient });
      letterKey = await unwrapLetterKeyForRecipient(hexToBytes(calldata.sealedKey), keyPair, createQuicknetTlock());
      const [message, media] = await Promise.all([
        decryptTextGtx1(hexToBytes(calldata.encryptedText), letterKey, context),
        decryptGbyl(archive, letterKey, context),
      ]);
      const result: OpenedLetter = {
        message,
        media: media.map((item) => ({
          url: URL.createObjectURL(new Blob([new Uint8Array(item.bytes)], { type: mediaType(item.codec) })),
          kind: item.type === MEDIA_TYPE.TIMELAPSE ? "video" : "image",
        })),
      };
      setOpened(result); return result;
    } finally {
      letterKey?.fill(0);
      keyPair.privateKey.fill(0);
    }
  }, []);

  const open = useCallback(async (letter: InboxLetter) => {
    setSelected(letter); setOpened(null); setBusy(true); setError(null);
    try {
      const envelopes = await loadMailboxEnvelopes(letter.recipient, letter.recipientKeyId);
      return await decryptWith(letter, await openPasskeyMailbox(hexToBytes(envelopes.passkeyEnvelope)));
    } catch (cause) { const message = cause instanceof Error ? cause.message : "편지를 열지 못했습니다."; setError(message); throw cause; }
    finally { setBusy(false); }
  }, [decryptWith]);

  const requestEmailCode = useCallback(async (email: string) => {
    const response = await fetch(`${apiBaseUrl}/mailbox/email/challenge`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) });
    if (!response.ok) throw new Error("인증 메일을 보내지 못했습니다.");
  }, []);

  const recover = useCallback(async (letter: InboxLetter, code: string) => {
    setBusy(true); setError(null);
    try {
      const verify = await fetch(`${apiBaseUrl}/mailbox/email/verify`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code }) });
      if (!verify.ok) throw new Error("이메일 인증 코드를 확인해 주세요.");
      const envelopes = await loadMailboxEnvelopes(letter.recipient, letter.recipientKeyId);
      const recoveryCiphertext = await createQuicknetTlock().decrypt(hexToBytes(envelopes.recoveryEnvelope));
      const clientSeed = crypto.getRandomValues(new Uint8Array(32));
      const { mailboxKeyPairFromSeed } = await import("@gibyeol/protocol");
      let clientPair: MailboxKeyPair | undefined;
      try {
        clientPair = await mailboxKeyPairFromSeed(clientSeed);
        const response = await fetch(`${apiBaseUrl}/recovery/unwrap`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ keyId: letter.recipientKeyId, recoveryCiphertext: encode(recoveryCiphertext), clientPublicKey: encode(clientPair.publicKey) }) });
        if (!response.ok) throw new Error("복구 seed를 확인하지 못했습니다.");
        const body = await response.json() as { sealedSeed: string };
        const mailboxSeed = await openSealBox(decode(body.sealedSeed), clientPair);
        try {
          return await decryptWith(letter, await mailboxKeyPairFromSeed(mailboxSeed));
        } finally {
          mailboxSeed.fill(0);
        }
      } finally {
        clientSeed.fill(0);
        recoveryCiphertext.fill(0);
        clientPair?.privateKey.fill(0);
      }
    } catch (cause) { const message = cause instanceof Error ? cause.message : "메일박스를 복구하지 못했습니다."; setError(message); throw cause; }
    finally { setBusy(false); }
  }, [decryptWith]);

  return { letters, selected, opened, busy, error, refresh, open, requestEmailCode, recover };
}
