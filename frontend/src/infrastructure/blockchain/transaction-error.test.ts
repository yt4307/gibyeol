import { describe, expect, it } from "vitest";
import { walletTransactionErrorMessage } from "./transaction-error";

describe("walletTransactionErrorMessage", () => {
  it("turns a nested wallet rejection into a concise retryable message", () => {
    const error = Object.assign(new Error("Request Arguments:\nsecret calldata"), {
      name: "ContractFunctionExecutionError",
      cause: Object.assign(new Error("MetaMask Tx Signature: User denied transaction signature."), { code: 4001 }),
    });

    expect(walletTransactionErrorMessage(error)).toBe(
      "지갑에서 거래 승인을 취소했습니다. 준비된 편지는 유지되므로 다시 시도할 수 있어요.",
    );
  });

  it("handles WalletConnect's user rejection code", () => {
    expect(walletTransactionErrorMessage({ code: 5000, message: "Request rejected" })).toContain("거래 승인을 취소");
  });

  it("does not replace unrelated application errors", () => {
    expect(walletTransactionErrorMessage(new RangeError("소포가 너무 큽니다."))).toBeNull();
  });
});
