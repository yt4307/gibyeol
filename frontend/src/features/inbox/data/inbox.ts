export type InboxLetter = {
  letterId: `0x${string}`;
  sender: `0x${string}`;
  recipient: `0x${string}`;
  recipientKeyId: number;
  archiveSha256: `0x${string}`;
  transactionHash: `0x${string}`;
  blockNumber: bigint;
};

export type OpenedMedia = { url: string; kind: "image" | "video" };
export type OpenedLetter = { message: string; media: OpenedMedia[] };
