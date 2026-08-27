import { ascii, ByteWriter, concatBytes, hexToBytes } from "./bytes";

export interface LetterContextInput {
  chainId: bigint | number;
  contractAddress: string | Uint8Array;
  letterId: string | Uint8Array;
  sender: string | Uint8Array;
  recipient: string | Uint8Array;
}

function fixedBytes(value: string | Uint8Array, length: number): Uint8Array {
  const bytes = typeof value === "string" ? hexToBytes(value, length) : new Uint8Array(value);
  if (bytes.byteLength !== length) {
    throw new RangeError(`값은 정확히 ${length}바이트여야 합니다.`);
  }
  return bytes;
}

export function encodeLetterContext(input: LetterContextInput): Uint8Array {
  return new ByteWriter()
    .writeBytes(ascii("GIBYEOL:LETTER:V1"))
    .writeUint256(BigInt(input.chainId))
    .writeBytes(fixedBytes(input.contractAddress, 20))
    .writeBytes(fixedBytes(input.letterId, 32))
    .writeBytes(fixedBytes(input.sender, 20))
    .writeBytes(fixedBytes(input.recipient, 20))
    .toBytes();
}

export function encodeTextAad(context: Uint8Array): Uint8Array {
  return concatBytes(context, ascii("TEXT"));
}

export function encodeMediaAad(context: Uint8Array, index: number): Uint8Array {
  return concatBytes(context, ascii("MEDIA"), new ByteWriter().writeUint16(index).toBytes());
}
