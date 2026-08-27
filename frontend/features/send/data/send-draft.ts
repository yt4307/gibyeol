export type SendStage = "DRAFT" | "PACKED" | "UPLOADED" | "SEALED";

export type SendDraft = {
  letterId: `0x${string}`;
  recipient: string;
  message: string;
  stage: SendStage;
  recipientKeyId?: number;
  letterKeyHex?: string;
  encryptedTextHex?: `0x${string}`;
  sealedKeyHex?: `0x${string}`;
  archiveHex?: string;
  archiveSha256?: `0x${string}`;
  transactionHash?: `0x${string}`;
};

export const emptyDraft = (letterId: `0x${string}`): SendDraft => ({
  letterId, recipient: "", message: "", stage: "DRAFT",
});

export function draftStorageKey(address: string) {
  return `gibyeol:send-draft:${address.toLowerCase()}`;
}
