"use client";

import { createRecoveryEnvelope, hexToBytes } from "@gibyeol/protocol";
import { useCallback, useEffect, useRef, useState } from "react";
import { toHex } from "viem";
import {
  contractAbi,
  contractAddress,
  publicClient,
  walletClient,
  type BrowserProvider,
} from "@/infrastructure/blockchain/config";
import { createQuicknetTlock } from "@/infrastructure/blockchain/quicknet-tlock";
import {
  connectedWalletAppLink,
  ensureWalletProvider,
  openConnectedWalletApp,
} from "@/infrastructure/blockchain/wallet-provider";
import { userFacingErrorMessage } from "@/infrastructure/errors/user-facing-error";
import { createPasskeyMailbox } from "@features/data/mailbox/passkey";

export type MailboxOperationStage =
  | "creating-passkey"
  | "locking-recovery"
  | "awaiting-wallet"
  | "confirming-registration"
  | "deactivating"
  | "confirming-deactivation"
  | null;

export function mailboxEnvelopeStorageKey(address: string, keyId: number) {
  return `gibyeol:mailbox:${address.toLowerCase()}:${keyId}`;
}

type PreparedMailboxRegistration = {
  address: `0x${string}`;
  publicKey: `0x${string}`;
  passkeyEnvelope: `0x${string}`;
  recoveryEnvelope: `0x${string}`;
};

function observeTransactionRequest(provider: BrowserProvider, onRequest: () => void): BrowserProvider {
  return {
    request(args) {
      const response = provider.request(args);
      if (args.method === "eth_sendTransaction" || args.method === "wallet_sendTransaction") {
        onRequest();
      }
      return response;
    },
  };
}

export function useMailboxOnboarding(address?: `0x${string}`) {
  const [busy, setBusy] = useState(false);
  const [keyId, setKeyId] = useState<number | null>(null);
  const [active, setActive] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [stage, setStage] = useState<MailboxOperationStage>(null);
  const [walletAppAvailable, setWalletAppAvailable] = useState(false);
  const preparedRegistration = useRef<PreparedMailboxRegistration | null>(null);

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

  useEffect(() => () => {
    preparedRegistration.current = null;
  }, [address]);

  const register = useCallback(async () => {
    if (!address) throw new Error("먼저 지갑을 연결해 주세요.");
    const prepared = preparedRegistration.current?.address === address
      ? preparedRegistration.current
      : null;
    setBusy(true); setError(null);

    if (prepared) {
      try {
        setStage("awaiting-wallet");
        const provider = await ensureWalletProvider(address);
        const walletAppLinkAvailable = Boolean(connectedWalletAppLink(provider));
        let walletOpenTimer: number | undefined;
        const transactionProvider = observeTransactionRequest(provider, () => {
          setWalletAppAvailable(walletAppLinkAvailable);
          if (walletAppLinkAvailable) {
            walletOpenTimer = window.setTimeout(() => { openConnectedWalletApp(provider); }, 100);
          }
        });
        const client = walletClient(transactionProvider);
        const hashPromise = client.writeContract({
          account: address,
          address: contractAddress,
          abi: contractAbi,
          functionName: "registerMailboxKey",
          args: [prepared.publicKey, prepared.passkeyEnvelope, prepared.recoveryEnvelope],
        });
        const hash = await hashPromise.finally(() => {
          if (walletOpenTimer !== undefined) window.clearTimeout(walletOpenTimer);
        });
        setStage("confirming-registration");
        setWalletAppAvailable(false);
        const receipt = await publicClient.waitForTransactionReceipt({ hash, timeout: 60_000 });
        if (receipt.status !== "success") throw new Error("메일박스 등록 거래가 블록체인에서 실패했습니다.");
        const nextKeyId = Number(await publicClient.readContract({
          address: contractAddress, abi: contractAbi, functionName: "currentKeyId", args: [address],
        }));
        localStorage.setItem(
          mailboxEnvelopeStorageKey(address, nextKeyId),
          prepared.passkeyEnvelope.slice(2),
        );
        preparedRegistration.current = null;
        setKeyId(nextKeyId);
        setActive(true);
        setStage(null);
        return nextKeyId;
      } catch (cause) {
        const message = userFacingErrorMessage(
          cause,
          "메일박스를 등록하지 못했습니다. 준비된 복구 봉투로 다시 승인해 주세요.",
        );
        setError(message.includes("거래 승인을 취소")
          ? "지갑에서 메일박스 등록 승인을 취소했습니다. 준비된 복구 봉투로 다시 승인할 수 있어요."
          : message);
        throw cause;
      } finally {
        setBusy(false);
        setWalletAppAvailable(false);
        if (preparedRegistration.current) setStage("awaiting-wallet");
      }
    }

    try {
      setStage("creating-passkey");
      const mailbox = await createPasskeyMailbox(address);
      try {
        setStage("locking-recovery");
        const recoveryPublicKey = await publicClient.readContract({
          address: contractAddress, abi: contractAbi, functionName: "RECOVERY_PUBLIC_KEY",
        });
        const recoveryEnvelope = await createRecoveryEnvelope(
          mailbox.seed,
          hexToBytes(recoveryPublicKey, 32),
          createQuicknetTlock(),
        );
        preparedRegistration.current = {
          address,
          publicKey: toHex(mailbox.keyPair.publicKey),
          passkeyEnvelope: toHex(mailbox.envelope),
          recoveryEnvelope: toHex(recoveryEnvelope),
        };
        setStage("awaiting-wallet");
        setWalletAppAvailable(Boolean(connectedWalletAppLink()));
        return undefined;
      } finally {
        mailbox.seed.fill(0);
        mailbox.keyPair.privateKey.fill(0);
      }
    } catch (cause) {
      setError(userFacingErrorMessage(cause, "메일박스를 만들지 못했습니다. 잠시 후 다시 시도해 주세요."));
      preparedRegistration.current = null;
      throw cause;
    } finally {
      setBusy(false);
      if (!preparedRegistration.current) {
        setStage(null);
        setWalletAppAvailable(false);
      }
    }
  }, [address]);

  const deactivate = useCallback(async () => {
    if (!address) throw new Error("먼저 지갑을 연결해 주세요.");
    setBusy(true); setError(null);
    try {
      setStage("deactivating");
      const provider = await ensureWalletProvider(address);
      const walletAppLinkAvailable = Boolean(connectedWalletAppLink(provider));
      let walletOpenTimer: number | undefined;
      const transactionProvider = observeTransactionRequest(provider, () => {
        setWalletAppAvailable(walletAppLinkAvailable);
        if (walletAppLinkAvailable) {
          walletOpenTimer = window.setTimeout(() => { openConnectedWalletApp(provider); }, 100);
        }
      });
      const client = walletClient(transactionProvider);
      const hashPromise = client.writeContract({
        account: address,
        address: contractAddress,
        abi: contractAbi,
        functionName: "deactivateMailbox",
      });
      const hash = await hashPromise.finally(() => {
        if (walletOpenTimer !== undefined) window.clearTimeout(walletOpenTimer);
      });
      setStage("confirming-deactivation");
      setWalletAppAvailable(false);
      const receipt = await publicClient.waitForTransactionReceipt({ hash, timeout: 60_000 });
      if (receipt.status !== "success") throw new Error("메일박스 비활성화 거래가 블록체인에서 실패했습니다.");
      setActive(false);
    } catch (cause) {
      setError(userFacingErrorMessage(cause, "메일박스를 비활성화하지 못했습니다. 잠시 후 다시 시도해 주세요."));
      throw cause;
    } finally { setBusy(false); setStage(null); setWalletAppAvailable(false); }
  }, [address]);

  const openWalletApp = useCallback(() => openConnectedWalletApp(), []);

  return { register, deactivate, openWalletApp, walletAppAvailable, busy, stage, keyId, active, error };
}
