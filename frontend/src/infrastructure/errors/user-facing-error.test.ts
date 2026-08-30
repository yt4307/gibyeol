import { describe, expect, it } from "vitest";
import { apiResponseError, userFacingErrorMessage } from "./user-facing-error";

describe("userFacingErrorMessage", () => {
  it("translates raw browser and provider errors", () => {
    expect(userFacingErrorMessage(new TypeError("Failed to fetch"), "실패")).toContain("서버에 연결");
    expect(userFacingErrorMessage(new DOMException("raw privacy warning", "NotAllowedError"), "실패")).toContain("패스키 요청");
    expect(userFacingErrorMessage({ code: -32002, message: "Request already pending" }, "실패")).toContain("처리 중인 요청");
  });

  it("preserves concise Korean application guidance and hides unknown raw details", () => {
    expect(userFacingErrorMessage(new Error("받는 분의 메일박스가 없습니다."), "실패")).toBe("받는 분의 메일박스가 없습니다.");
    expect(userFacingErrorMessage(new Error("Request Arguments:\n0xsecret"), "다시 시도해 주세요.")).toBe("다시 시도해 주세요.");
  });
});

describe("apiResponseError", () => {
  it("translates backend codes without exposing backend messages", async () => {
    const response = new Response(JSON.stringify({ error: { code: "EMAIL_CODE_EXPIRED", message: "The code expired." } }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
    await expect(apiResponseError(response, "인증 실패")).resolves.toMatchObject({
      message: "인증번호가 만료되었습니다. 새 인증번호를 요청해 주세요.",
      code: "EMAIL_CODE_EXPIRED",
    });
  });
});
