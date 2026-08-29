"use client";

import { bytesToHex, createRecoveryEnvelope, hexToBytes } from "@gibyeol/protocol";
import { useCallback, useEffect, useState } from "react";
import { toHex } from "viem";
import { contractAbi, contractAddress, publicClient, walletClient } from "@/infrastructure/blockchain/config";
import { createQuicknetTlock } from "@/infrastructure/blockchain/quicknet-tlock";
import { createPasskeyMailbox } from "@features/data/mailbox/passkey";

export function mailboxEnvelopeStorageKey(address: string, keyId: number) {
  return `gibyeol:mailbox:${address.toLowerCase()}:${keyId}`;
}

export function useMailboxOnboarding(address?: `0x${string}`) {
  const [busy, setBusy] = useState(false);
  const [keyId, setKeyId] = useState<number | null>(null);
  const [active, setActive] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!address) return;
    let cancelled = false;
    publicClient.readContract({
      address: contractAddress,
      abi: contractAbi,
      functionName: "currentKeyId",
      args: [address],
    })
      .then(async (nextKeyId) => {
        if (cancelled) return;
        const numericKeyId = Number(nextKeyId);
        const nextActive = await publicClient.readContract({
          address: contractAddress,
          abi: contractAbi,
          functionName: "mailboxActive",
          args: [address],
        });
        if (cancelled) return;
        setKeyId(numericKeyId);
        setActive(nextActive);
      })
      .catch(() => {
        if (cancelled) return;
        setKeyId(null);
        setActive(null);
      });
    return () => { cancelled = true; };
  }, [address]);

  const register = useCallback(async () => {
    if (!address) throw new Error("먼저 지갑을 연결해 주세요.");
    setBusy(true); setError(null);
    try {
      const mailbox = await createPasskeyMailbox(address);
      try {
        const recoveryPublicKey = await publicClient.readContract({
          address: contractAddress, abi: contractAbi, functionName: "RECOVERY_PUBLIC_KEY",
        });
        const recoveryEnvelope = await createRecoveryEnvelope(
          mailbox.seed,
          hexToBytes(recoveryPublicKey, 32),
          createQuicknetTlock(),
        );
        const client = walletClient();
        const hash = await client.writeContract({
          account: address,
          address: contractAddress,
          abi: contractAbi,
          functionName: "registerMailboxKey",
          args: [toHex(mailbox.keyPair.publicKey), toHex(mailbox.envelope), toHex(recoveryEnvelope)],
        });
        await publicClient.waitForTransactionReceipt({ hash });
        const nextKeyId = Number(await publicClient.readContract({
          address: contractAddress, abi: contractAbi, functionName: "currentKeyId", args: [address],
        }));
        localStorage.setItem(mailboxEnvelopeStorageKey(address, nextKeyId), bytesToHex(mailbox.envelope));
        setKeyId(nextKeyId);
        setActive(true);
        return nextKeyId;
      } finally {
        mailbox.seed.fill(0);
        mailbox.keyPair.privateKey.fill(0);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "메일박스를 만들지 못했습니다.");
      throw cause;
    } finally { setBusy(false); }
  }, [address]);

  const deactivate = useCallback(async () => {
    if (!address) throw new Error("먼저 지갑을 연결해 주세요.");
    setBusy(true); setError(null);
    try {
      const client = walletClient();
      const hash = await client.writeContract({
        account: address,
        address: contractAddress,
        abi: contractAbi,
        functionName: "deactivateMailbox",
      });
      await publicClient.waitForTransactionReceipt({ hash });
      setActive(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "메일박스를 비활성화하지 못했습니다.");
      throw cause;
    } finally { setBusy(false); }
  }, [address]);

  return { register, deactivate, busy, keyId, active, error };
}
