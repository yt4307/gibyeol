"use client";

import { bytesToHex, createRecoveryEnvelope, hexToBytes } from "@gibyeol/protocol";
import { useCallback, useEffect, useState } from "react";
import { toHex } from "viem";
import { contractAbi, contractAddress, publicClient, walletClient } from "@features/data/blockchain/config";
import { createQuicknetTlock } from "@features/data/blockchain/quicknet-tlock";
import { createPasskeyMailbox } from "@features/data/mailbox/passkey";

export function mailboxEnvelopeStorageKey(address: string, keyId: number) {
  return `gibyeol:mailbox:${address.toLowerCase()}:${keyId}`;
}

export function useMailboxOnboarding(address?: `0x${string}`) {
  const [busy, setBusy] = useState(false);
  const [keyId, setKeyId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!address) return;
    publicClient.readContract({ address: contractAddress, abi: contractAbi, functionName: "currentKeyId", args: [address] })
      .then((value) => setKeyId(Number(value)))
      .catch(() => setKeyId(null));
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

  return { register, busy, keyId, error };
}
