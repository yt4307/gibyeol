"use client";

import {
  bytesToHex,
  encodeLetterContext,
  encryptTextGtx1,
  hexToBytes,
  MEDIA_CODEC,
  MEDIA_TYPE,
  packGbyl,
  secureRandomBytes,
  sha256,
  wrapLetterKeyForRecipient,
  type MediaInput,
} from "@gibyeol/protocol";
import { useCallback, useEffect, useState } from "react";
import { isAddress, toHex } from "viem";
import { apiBaseUrl, chainId, contractAbi, contractAddress, publicClient, walletClient } from "@features/blockchain/data/config";
import { createQuicknetTlock } from "@features/blockchain/data/quicknet-tlock";
import { draftStorageKey, emptyDraft, type SendDraft } from "../data/send-draft";

const newLetterId = () => toHex(secureRandomBytes(32));
const asArrayBuffer = (bytes: Uint8Array) => {
  const output = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(output).set(bytes);
  return output;
};

export function useSendLetter(sender?: `0x${string}`) {
  const [draft, setDraftState] = useState<SendDraft | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sender) return;
    queueMicrotask(() => {
      const saved = localStorage.getItem(draftStorageKey(sender));
      try { setDraftState(saved ? JSON.parse(saved) as SendDraft : emptyDraft(newLetterId())); }
      catch { setDraftState(emptyDraft(newLetterId())); }
    });
  }, [sender]);

  const persist = useCallback((next: SendDraft) => {
    setDraftState(next);
    if (sender) localStorage.setItem(draftStorageKey(sender), JSON.stringify(next));
    return next;
  }, [sender]);

  const update = useCallback((values: Partial<Pick<SendDraft, "recipient" | "message">>) => {
    if (draft?.stage !== "DRAFT") return;
    persist({ ...draft, ...values });
  }, [draft, persist]);

  const reset = useCallback(() => sender && persist(emptyDraft(newLetterId())), [persist, sender]);

  const seal = useCallback(async (files: readonly File[]) => {
    if (!sender || !draft) throw new Error("지갑 연결이 필요합니다.");
    if (!isAddress(draft.recipient) || !draft.message.trim()) throw new Error("받는 주소와 편지 내용을 확인해 주세요.");
    setBusy(true); setError(null);
    try {
      let working = draft;
      if (working.stage === "DRAFT") {
        const recipient = working.recipient.toLowerCase() as `0x${string}`;
        const recipientKeyId = Number(await publicClient.readContract({ address: contractAddress, abi: contractAbi, functionName: "currentKeyId", args: [recipient] }));
        if (recipientKeyId < 1) throw new Error("받는 분의 메일박스가 아직 없습니다.");
        const recipientPublicKey = await publicClient.readContract({ address: contractAddress, abi: contractAbi, functionName: "mailboxPublicKeys", args: [recipient, recipientKeyId] });
        const letterKey = secureRandomBytes(32);
        const context = encodeLetterContext({ chainId, contractAddress, letterId: working.letterId, sender, recipient });
        const media: MediaInput[] = await Promise.all(files.map(async (file) => {
          if (!['image/webp', 'image/jpeg'].includes(file.type)) throw new Error("이미지는 WebP 또는 JPEG만 지원합니다.");
          return { type: MEDIA_TYPE.IMAGE, codec: file.type === 'image/webp' ? MEDIA_CODEC.WEBP : MEDIA_CODEC.JPEG, bytes: new Uint8Array(await file.arrayBuffer()) };
        }));
        const archive = await packGbyl(media, letterKey, context);
        working = persist({
          ...working,
          stage: "PACKED",
          recipient: recipient,
          recipientKeyId,
          letterKeyHex: bytesToHex(letterKey),
          encryptedTextHex: toHex(await encryptTextGtx1(working.message, letterKey, context)),
          sealedKeyHex: toHex(await wrapLetterKeyForRecipient(letterKey, hexToBytes(recipientPublicKey, 32), createQuicknetTlock())),
          archiveHex: bytesToHex(archive),
          archiveSha256: toHex(await sha256(archive)),
        });
      }
      if (working.stage === "PACKED") {
        const archive = hexToBytes(working.archiveHex!);
        const response = await fetch(`${apiBaseUrl}/packages/${working.archiveSha256!.slice(2)}`, {
          method: "PUT", credentials: "include", headers: { "Content-Type": "application/vnd.gibyeol.package" }, body: asArrayBuffer(archive),
        });
        if (!response.ok && response.status !== 204) throw new Error("암호화 패키지를 보관하지 못했습니다.");
        working = persist({ ...working, stage: "UPLOADED" });
      }
      if (working.stage === "UPLOADED") {
        const recipient = working.recipient as `0x${string}`;
        const latestKeyId = Number(await publicClient.readContract({ address: contractAddress, abi: contractAbi, functionName: "currentKeyId", args: [recipient] }));
        if (latestKeyId !== working.recipientKeyId) {
          const latestPublicKey = await publicClient.readContract({ address: contractAddress, abi: contractAbi, functionName: "mailboxPublicKeys", args: [recipient, latestKeyId] });
          working = persist({ ...working, recipientKeyId: latestKeyId, sealedKeyHex: toHex(await wrapLetterKeyForRecipient(hexToBytes(working.letterKeyHex!, 32), hexToBytes(latestPublicKey, 32), createQuicknetTlock())) });
        }
        const client = walletClient();
        const hash = await client.writeContract({ account: sender, address: contractAddress, abi: contractAbi, functionName: "sealLetter", args: [working.letterId, recipient, working.recipientKeyId!, working.encryptedTextHex!, working.sealedKeyHex!, working.archiveSha256!] });
        try { await publicClient.waitForTransactionReceipt({ hash, timeout: 60_000 }); }
        catch {
          const sealed = await publicClient.readContract({ address: contractAddress, abi: contractAbi, functionName: "sealedLetters", args: [working.letterId] });
          if (!sealed) throw new Error("거래 확인이 지연되고 있습니다. 같은 편지 ID로 다시 확인할 수 있어요.");
        }
        working = persist({ ...working, stage: "SEALED", transactionHash: hash, message: "", letterKeyHex: undefined });
      }
      return working;
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "편지를 봉인하지 못했습니다.";
      setError(message); throw cause;
    } finally { setBusy(false); }
  }, [draft, persist, sender]);

  return { draft, busy, error, update, seal, reset };
}
