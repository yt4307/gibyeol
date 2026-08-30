type ErrorRecord = {
  cause?: unknown;
  code?: unknown;
  details?: unknown;
  error?: unknown;
  message?: unknown;
  name?: unknown;
  shortMessage?: unknown;
};

function errorRecords(cause: unknown): ErrorRecord[] {
  const records: ErrorRecord[] = [];
  const seen = new Set<object>();
  let current = cause;

  while (typeof current === "object" && current !== null && records.length < 8 && !seen.has(current)) {
    seen.add(current);
    const record = current as ErrorRecord;
    records.push(record);
    current = record.cause ?? record.error;
  }

  return records;
}

function textValues(records: readonly ErrorRecord[]) {
  return records.flatMap((record) => [record.name, record.shortMessage, record.details, record.message])
    .filter((value): value is string => typeof value === "string")
    .join("\n")
    .toLowerCase();
}

export function walletTransactionErrorMessage(cause: unknown): string | null {
  const records = errorRecords(cause);
  const codes = records.map((record) => record.code);
  const text = textValues(records);

  if (codes.some((code) => Number(code) === 4001 || Number(code) === 5000)
    || /userrejectedrequest|user rejected|user denied|denied transaction signature/.test(text)) {
    return "지갑에서 거래 승인을 취소했습니다. 준비된 편지는 유지되므로 다시 시도할 수 있어요.";
  }
  if (/insufficient funds|funds for gas/.test(text)) {
    return "거래 수수료로 사용할 Base Sepolia ETH가 부족합니다.";
  }
  if (/timed out|timeout/.test(text)) {
    return "지갑 거래 확인이 지연되고 있습니다. 잠시 후 다시 시도해 주세요.";
  }
  if (/chain.*mismatch|wrong network|chain not configured/.test(text)) {
    return "지갑 네트워크를 Base Sepolia Testnet으로 변경한 뒤 다시 시도해 주세요.";
  }
  if (/execution reverted|contractfunctionreverted|transaction reverted/.test(text)) {
    return "스마트 컨트랙트가 거래를 거절했습니다. 메일박스 상태를 확인한 뒤 다시 시도해 주세요.";
  }
  if (/contractfunctionexecutionerror|transactionexecutionerror/.test(text)) {
    return "지갑에서 거래를 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.";
  }

  return null;
}
