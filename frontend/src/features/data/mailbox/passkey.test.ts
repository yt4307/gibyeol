import { describe, expect, it } from "vitest";
import { isUnsupportedPasskeyBrowser, passkeyBrowserGuidance } from "./passkey";

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

describe("passkeyBrowserGuidance", () => {
  it("guides iPhone and iPad users to Safari", () => {
    expect(passkeyBrowserGuidance(
      "Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) Mobile/15E148",
    )).toBe("주소를 복사해 Safari에서 기별을 열어 주세요.");
    expect(passkeyBrowserGuidance(
      "Mozilla/5.0 (Macintosh; Intel Mac OS X) Mobile/15E148",
      "MacIntel",
      5,
    )).toBe("주소를 복사해 Safari에서 기별을 열어 주세요.");
  });

  it("guides Android users to Chrome", () => {
    expect(passkeyBrowserGuidance(
      "Mozilla/5.0 (Linux; Android 15) AppleWebKit/537.36 KAKAOTALK 26.7.0",
    )).toBe("주소를 복사해 Chrome에서 기별을 열어 주세요.");
  });

  it("uses neutral guidance when the operating system is unknown", () => {
    expect(passkeyBrowserGuidance("Unknown Browser", "Unknown", 0))
      .toBe("주소를 복사해 기기의 기본 브라우저에서 기별을 열어 주세요.");
  });
});
