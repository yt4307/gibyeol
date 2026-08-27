export type SendStage =
  | "DRAFT"
  | "PACKING"
  | "UPLOADING_PACKAGE"
  | "ENCRYPTING_KEY"
  | "WAITING_TRANSACTION"
  | "SEALED"
  | "IN_TRANSIT"
  | "ARRIVED"
  | "OPENED";

export const sendStageLabel: Record<SendStage, string> = {
  DRAFT: "작성 중",
  PACKING: "소포 꾸리는 중",
  UPLOADING_PACKAGE: "소포 맡기는 중",
  ENCRYPTING_KEY: "편지 봉인 중",
  WAITING_TRANSACTION: "우표 붙이는 중",
  SEALED: "접수 완료",
  IN_TRANSIT: "배송 중",
  ARRIVED: "도착",
  OPENED: "개봉",
};

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
