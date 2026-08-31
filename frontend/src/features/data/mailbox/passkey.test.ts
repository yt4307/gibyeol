import { describe, expect, it } from "vitest";
import { isUnsupportedPasskeyBrowser } from "./passkey";

describe("isUnsupportedPasskeyBrowser", () => {
  it("detects KakaoTalk's in-app browser", () => {
    expect(isUnsupportedPasskeyBrowser(
      "Mozilla/5.0 (Linux; Android 15) AppleWebKit/537.36 KAKAOTALK 26.7.0",
      false,
    )).toBe(true);
  });

  it("detects MetaMask's mobile in-app browser through its injected provider", () => {
    expect(isUnsupportedPasskeyBrowser(
      "Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) Mobile/15E148",
      true,
    )).toBe(true);
  });

  it("allows regular mobile and desktop browsers", () => {
    expect(isUnsupportedPasskeyBrowser(
      "Mozilla/5.0 (Linux; Android 15) Chrome/152 Mobile",
      false,
    )).toBe(false);
    expect(isUnsupportedPasskeyBrowser(
      "Mozilla/5.0 (Macintosh; Intel Mac OS X) Chrome/152",
      true,
    )).toBe(false);
  });
});
