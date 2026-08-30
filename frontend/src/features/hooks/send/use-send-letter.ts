"use client";

import {
  bytesToHex,
  encodeLetterContext,
  encryptTextGtx1,
  hexToBytes,
  packGbyl,
  secureRandomBytes,
  sha256,
  wrapLetterKeyForRecipient,
} from "@gibyeol/protocol";
import { useCallback, useEffect, useState } from "react";
import { isAddress, parseAbiItem, toHex } from "viem";
import { apiBaseUrl, chainId, contractAbi, contractAddress, deploymentBlock, publicClient, walletClient } from "@/infrastructure/blockchain/config";
import { loadBlockRangePages } from "@/infrastructure/blockchain/log-ranges";
import { createQuicknetTlock } from "@/infrastructure/blockchain/quicknet-tlock";
import { apiResponseError, userFacingErrorMessage } from "@/infrastructure/errors/user-facing-error";
import { preprocessMediaFiles, type MediaPreprocessingSummary } from "@features/data/send/media-preprocessing";
import { draftStorageKey, emptyDraft, type SendDraft } from "@features/data/send/send-draft";

const newLetterId = () => toHex(secureRandomBytes(32));
const asArrayBuffer = (bytes: Uint8Array) => {
  const output = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(output).set(bytes);
  return output;
};
const letterEvent = parseAbiItem("event LetterSealed(bytes32 indexed letterId, address indexed sender, address indexed recipient, uint32 recipientKeyId, bytes32 archiveSha256)");

async function isMailboxActive(recipient: `0x${string}`) {
  return publicClient.readContract({
    address: contractAddress,
    abi: contractAbi,
    functionName: "mailboxActive",
    args: [recipient],
  });
}

export function useSendLetter(sender?: `0x${string}`) {
  const [draft, setDraftState] = useState<SendDraft | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mediaSummary, setMediaSummary] = useState<MediaPreprocessingSummary | null>(null);

  useEffect(() => {
    if (!sender) return;
    queueMicrotask(() => {
      const saved = localStorage.getItem(draftStorageKey(sender));
      try {
        const parsed = saved ? JSON.parse(saved) as Omit<SendDraft, "stage"> & { stage: string } : emptyDraft(newLetterId());
        const stage = parsed.stage === "PACKED" ? "UPLOADING_PACKAGE"
          : parsed.stage === "UPLOADED" ? "ENCRYPTING_KEY"
          : parsed.stage === "PACKING" ? "DRAFT" : parsed.stage;
        setDraftState({ ...parsed, stage } as SendDraft);
      }
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

  const reset = useCallback(() => {
    setMediaSummary(null);
    return sender && persist(emptyDraft(newLetterId()));
  }, [persist, sender]);

  const seal = useCallback(async (files: readonly File[]) => {
    if (!sender || !draft) throw new Error("지갑 연결이 필요합니다.");
    if (!isAddress(draft.recipient) || !draft.message.trim()) throw new Error("받는 주소와 편지 내용을 확인해 주세요.");
    setBusy(true); setError(null);
    try {
      let working = draft;
      if (working.stage === "DRAFT" || working.stage === "PACKING") {
        const recipient = working.recipient.toLowerCase() as `0x${string}`;
        const [keyId, recipientActive] = await Promise.all([
          publicClient.readContract({ address: contractAddress, abi: contractAbi, functionName: "currentKeyId", args: [recipient] }),
          isMailboxActive(recipient),
        ]);
        const recipientKeyId = Number(keyId);
        if (recipientKeyId < 1) throw new Error("받는 분의 메일박스가 아직 없습니다.");
        if (!recipientActive) throw new Error("받는 분의 메일박스가 비활성화되어 있습니다.");
        working = persist({ ...working, stage: "PACKING", recipient, recipientKeyId });
        try {
          const letterKey = secureRandomBytes(32);
          const context = encodeLetterContext({ chainId, contractAddress, letterId: working.letterId, sender, recipient });
          const media = await preprocessMediaFiles(files);
          setMediaSummary(media.summary);
          const archive = await packGbyl(media.items, letterKey, context);
          const encryptedText = await encryptTextGtx1(working.message, letterKey, context);
          working = persist({
            ...working,
            stage: "UPLOADING_PACKAGE",
            recipient: recipient,
            recipientKeyId,
            letterKeyHex: bytesToHex(letterKey),
            encryptedTextHex: toHex(encryptedText),
            archiveHex: bytesToHex(archive),
            archiveSha256: toHex(await sha256(archive)),
          });
        } catch (cause) {
          working = persist({ ...working, stage: "DRAFT" });
          throw cause;
        }
      }
      if (working.stage === "UPLOADING_PACKAGE") {
        const archive = hexToBytes(working.archiveHex!);
        const response = await fetch(`${apiBaseUrl}/packages/${working.archiveSha256!.slice(2)}`, {
          method: "PUT", credentials: "include", headers: { "Content-Type": "application/vnd.gibyeol.package" }, body: asArrayBuffer(archive),
        });
        if (!response.ok && response.status !== 204) throw await apiResponseError(response, "암호화 패키지를 보관하지 못했습니다.");
        working = persist({ ...working, stage: "ENCRYPTING_KEY" });
      }
      if (working.stage === "ENCRYPTING_KEY") {
        const recipient = working.recipient as `0x${string}`;
        const latestKeyId = Number(await publicClient.readContract({ address: contractAddress, abi: contractAbi, functionName: "currentKeyId", args: [recipient] }));
        const latestPublicKey = await publicClient.readContract({ address: contractAddress, abi: contractAbi, functionName: "mailboxPublicKeys", args: [recipient, latestKeyId] });
        working = persist({ ...working, stage: "WAITING_TRANSACTION", recipientKeyId: latestKeyId, sealedKeyHex: toHex(await wrapLetterKeyForRecipient(hexToBytes(working.letterKeyHex!, 32), hexToBytes(latestPublicKey, 32), createQuicknetTlock())) });
      }
      if (working.stage === "WAITING_TRANSACTION") {
        const recipient = working.recipient as `0x${string}`;
        const recoverExisting = async () => {
          const sealed = await publicClient.readContract({ address: contractAddress, abi: contractAbi, functionName: "sealedLetters", args: [working.letterId] });
          if (!sealed) return null;
          const logs = await loadBlockRangePages(deploymentBlock, await publicClient.getBlockNumber(), (range) =>
            publicClient.getLogs({ address: contractAddress, event: letterEvent, args: { letterId: working.letterId }, ...range }));
          return logs.at(-1)?.transactionHash ?? working.transactionHash ?? null;
        };
        const alreadySealed = await recoverExisting();
        if (alreadySealed) {
          working = persist({ ...working, stage: "SEALED", transactionHash: alreadySealed, message: "", letterKeyHex: undefined });
          return working;
        }
        if (working.transactionHash) {
          const pendingHash = working.transactionHash;
          try {
            await publicClient.waitForTransactionReceipt({ hash: pendingHash, timeout: 30_000 });
            working = persist({ ...working, stage: "SEALED", message: "", letterKeyHex: undefined });
            return working;
          } catch {
            if (await recoverExisting()) {
              working = persist({ ...working, stage: "SEALED", message: "", letterKeyHex: undefined });
              return working;
            }
            try {
              await publicClient.getTransaction({ hash: pendingHash });
              throw new Error("기존 거래가 아직 대기 중입니다. 같은 기별 식별번호로 확인을 계속합니다.");
            } catch (cause) {
              if (cause instanceof Error && cause.message.startsWith("기존 거래")) throw cause;
              working = persist({ ...working, transactionHash: undefined });
            }
          }
        }
        const recipientActive = await isMailboxActive(recipient);
        if (!recipientActive) throw new Error("받는 분의 메일박스가 비활성화되어 있습니다.");
        const client = walletClient();
        let hash: `0x${string}` | null = null;
        for (let attempt = 0; attempt < 2; attempt += 1) {
          const latestKeyId = Number(await publicClient.readContract({ address: contractAddress, abi: contractAbi, functionName: "currentKeyId", args: [recipient] }));
          if (latestKeyId !== working.recipientKeyId) {
            const latestPublicKey = await publicClient.readContract({ address: contractAddress, abi: contractAbi, functionName: "mailboxPublicKeys", args: [recipient, latestKeyId] });
            working = persist({ ...working, recipientKeyId: latestKeyId, sealedKeyHex: toHex(await wrapLetterKeyForRecipient(hexToBytes(working.letterKeyHex!, 32), hexToBytes(latestPublicKey, 32), createQuicknetTlock())) });
          }
          try {
            hash = await client.writeContract({ account: sender, address: contractAddress, abi: contractAbi, functionName: "sealLetter", args: [working.letterId, recipient, working.recipientKeyId!, working.encryptedTextHex!, working.sealedKeyHex!, working.archiveSha256!] });
            working = persist({ ...working, transactionHash: hash });
            break;
          } catch (cause) {
            const recovered = await recoverExisting();
            if (recovered) { hash = recovered; break; }
            const rotatedKeyId = Number(await publicClient.readContract({ address: contractAddress, abi: contractAbi, functionName: "currentKeyId", args: [recipient] }));
            if (attempt === 0 && rotatedKeyId !== working.recipientKeyId) continue;
            throw cause;
          }
        }
        if (!hash) throw new Error("편지 거래를 전송하지 못했습니다.");
        try {
          let receipt = await publicClient.waitForTransactionReceipt({ hash, timeout: 60_000 });
          if (receipt.status === "reverted") {
            const recovered = await recoverExisting();
            if (!recovered) {
              const rotatedKeyId = Number(await publicClient.readContract({ address: contractAddress, abi: contractAbi, functionName: "currentKeyId", args: [recipient] }));
              if (rotatedKeyId === working.recipientKeyId) throw new Error("기별 거래가 블록체인에서 실패했습니다.");
              const rotatedPublicKey = await publicClient.readContract({ address: contractAddress, abi: contractAbi, functionName: "mailboxPublicKeys", args: [recipient, rotatedKeyId] });
              working = persist({ ...working, recipientKeyId: rotatedKeyId, sealedKeyHex: toHex(await wrapLetterKeyForRecipient(hexToBytes(working.letterKeyHex!, 32), hexToBytes(rotatedPublicKey, 32), createQuicknetTlock())), transactionHash: undefined });
              hash = await client.writeContract({ account: sender, address: contractAddress, abi: contractAbi, functionName: "sealLetter", args: [working.letterId, recipient, rotatedKeyId, working.encryptedTextHex!, working.sealedKeyHex!, working.archiveSha256!] });
              working = persist({ ...working, transactionHash: hash });
              receipt = await publicClient.waitForTransactionReceipt({ hash, timeout: 60_000 });
              if (receipt.status !== "success") throw new Error("수신 키를 다시 포장한 뒤에도 거래가 실패했습니다.");
            }
          }
        } catch (cause) {
          if (!await recoverExisting()) {
            if (cause instanceof Error && cause.message.includes("블록체인에서 실패")) throw cause;
            throw new Error("거래 확인이 지연되고 있습니다. 같은 기별 식별번호로 다시 확인할 수 있어요.");
          }
        }
        working = persist({ ...working, stage: "SEALED", transactionHash: hash, message: "", letterKeyHex: undefined });
      }
      return working;
    } catch (cause) {
      const message = userFacingErrorMessage(cause, "편지를 봉인하지 못했습니다. 잠시 후 다시 시도해 주세요.");
      setError(message); throw cause;
    } finally { setBusy(false); }
  }, [draft, persist, sender]);

  return { draft, busy, error, mediaSummary, update, seal, reset };
}
