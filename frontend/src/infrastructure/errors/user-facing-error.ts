import { walletTransactionErrorMessage } from "@/infrastructure/blockchain/transaction-error";

type ErrorPayload = { error?: { code?: unknown; message?: unknown } };
type ErrorRecord = { cause?: unknown; code?: unknown; error?: unknown; message?: unknown; name?: unknown };

const apiMessages: Record<string, string> = {
  AUTH_REQUIRED: "로그인 세션이 만료되었습니다. 지갑으로 다시 로그인해 주세요.",
  UNAUTHORIZED: "로그인 세션이 만료되었습니다. 지갑으로 다시 로그인해 주세요.",
  AUTH_RATE_LIMITED: "로그인 요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.",
  CHAIN_NOT_ALLOWED: "Base Sepolia Testnet에서 다시 시도해 주세요.",
  SIWE_INVALID: "지갑 서명을 확인하지 못했습니다. 다시 서명해 주세요.",
  SIWE_NONCE_INVALID: "로그인 요청이 만료되었습니다. 처음부터 다시 시도해 주세요.",
  WALLET_ADDRESS_INVALID: "지갑 주소를 확인해 주세요.",
  EMAIL_RATE_LIMITED: "인증 메일 요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.",
  EMAIL_CODE_INVALID: "인증번호가 올바르지 않습니다.",
  EMAIL_CODE_EXPIRED: "인증번호가 만료되었습니다. 새 인증번호를 요청해 주세요.",
  EMAIL_DELIVERY_FAILED: "인증 메일을 보내지 못했습니다. 잠시 후 다시 시도해 주세요.",
  PACKAGE_TOO_LARGE: "사진·영상 소포가 10MB를 초과했습니다.",
  PACKAGE_FORMAT_INVALID: "암호화 소포 형식을 확인하지 못했습니다. 다시 꾸려 주세요.",
  PACKAGE_HASH_MISMATCH: "암호화 소포가 전송 중 변경되었습니다. 다시 시도해 주세요.",
  PACKAGE_LENGTH_MISMATCH: "암호화 소포가 완전히 전송되지 않았습니다. 다시 시도해 주세요.",
  PACKAGE_NOT_FOUND: "편지에 첨부된 사진·영상 소포를 찾지 못했습니다.",
  PACKAGE_STORAGE_FAILURE: "소포 보관소에 문제가 생겼습니다. 잠시 후 다시 시도해 주세요.",
  RECOVERY_LOCKED: "아직 메일박스를 복구할 수 있는 날짜가 아닙니다.",
  EMAIL_PROOF_REQUIRED: "메일박스 복구를 위해 이메일 인증을 다시 완료해 주세요.",
  MAILBOX_KEY_MISMATCH: "복구한 메일박스 키가 온체인 기록과 일치하지 않습니다.",
  RECOVERY_UNAVAILABLE: "메일박스 복구 서비스를 잠시 사용할 수 없습니다.",
  RECOVERY_REQUEST_INVALID: "메일박스 복구 요청을 확인하지 못했습니다. 다시 시도해 주세요.",
  RECOVERY_CIPHERTEXT_INVALID: "복구 봉투를 열지 못했습니다.",
};

export class UserFacingError extends Error {
  constructor(message: string, readonly code?: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "UserFacingError";
  }
}

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

export function userFacingErrorMessage(cause: unknown, fallback: string): string {
  if (cause instanceof UserFacingError) return cause.message;

  const records = errorRecords(cause);
  const code = records.map((record) => record.code).find((value) => value !== undefined);
  const name = records.map((record) => record.name).find((value): value is string => typeof value === "string");
  const raw = records.map((record) => record.message).filter((value): value is string => typeof value === "string").join("\n");
  const text = raw.toLowerCase();

  // 일부 인앱 WebView는 WebAuthn 거절에도 지갑과 같은 4001 코드를 사용한다.
  // 오류 이름을 먼저 확인해야 Passkey 실패를 거래 취소로 잘못 안내하지 않는다.
  if (name === "NotAllowedError") return "패스키 요청이 취소되었거나 시간이 초과되었습니다. 다시 시도해 주세요.";
  if (name === "InvalidStateError") return "이 기기에 이미 등록된 패스키가 있습니다. 기존 패스키를 사용해 주세요.";
  if (name === "NotSupportedError") return "이 브라우저나 기기는 필요한 패스키 기능을 지원하지 않습니다.";
  if (name === "SecurityError") return "현재 주소에서는 패스키를 사용할 수 없습니다. 공식 기별 주소로 접속해 주세요.";
  if (name === "AbortError") return "요청이 중단되었습니다. 다시 시도해 주세요.";

  const transactionMessage = walletTransactionErrorMessage(cause);
  if (transactionMessage) return transactionMessage;

  if (Number(code) === 4001 || Number(code) === 5000) return "지갑에서 요청을 취소했습니다. 필요할 때 다시 시도할 수 있어요.";
  if (Number(code) === -32002) return "지갑에 이미 처리 중인 요청이 있습니다. 지갑 창을 확인해 주세요.";
  if (Number(code) === 4100) return "지갑 계정 접근 권한이 없습니다. 지갑을 다시 연결해 주세요.";
  if (Number(code) === 4900 || Number(code) === 4901) return "지갑 네트워크 연결이 끊어졌습니다. 연결을 확인해 주세요.";
  if (/failed to fetch|networkerror|network request failed|load failed/.test(text)) return "서버에 연결하지 못했습니다. 네트워크를 확인한 뒤 다시 시도해 주세요.";
  if (/internal json-rpc|rpc request|http request failed/.test(text)) return "블록체인 네트워크 응답이 원활하지 않습니다. 잠시 후 다시 시도해 주세요.";
  if (/compressionstream|decompressionstream/.test(text)) return "이 브라우저는 편지 압축 기능을 지원하지 않습니다. 최신 브라우저에서 다시 시도해 주세요.";
  if (/operation either timed out or was not allowed/.test(text)) return "패스키 요청이 취소되었거나 시간이 초과되었습니다. 다시 시도해 주세요.";

  const safeKorean = records
    .map((record) => record.message)
    .find((message): message is string => typeof message === "string"
      && message.length <= 300
      && /[가-힣]/.test(message)
      && !/request arguments:|contract call:|docs:|details:/i.test(message));
  return safeKorean ?? fallback;
}

export async function apiResponseError(response: Response, fallback: string): Promise<UserFacingError> {
  let payload: ErrorPayload | undefined;
  try { payload = await response.json() as ErrorPayload; }
  catch { /* JSON 오류 본문이 없으면 상태 코드로 안내한다. */ }
  const code = typeof payload?.error?.code === "string" ? payload.error.code : undefined;
  const message = code ? apiMessages[code] : undefined;
  const statusMessage = response.status === 401 ? apiMessages.AUTH_REQUIRED
    : response.status === 413 ? apiMessages.PACKAGE_TOO_LARGE
      : response.status === 429 ? "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요."
        : response.status >= 500 ? "서버에서 요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요."
          : undefined;
  return new UserFacingError(message ?? statusMessage ?? fallback, code);
}
