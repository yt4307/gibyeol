import { afterEach, describe, expect, it, vi } from "vitest";

describe("wallet chain metadata", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("uses MetaMask's canonical display name for Base Sepolia", async () => {
    vi.stubEnv("NEXT_PUBLIC_CHAIN_ID", "84532");
    vi.resetModules();

    const { walletChainName } = await import("./config");

    expect(walletChainName).toBe("Base Sepolia Testnet");
  });
});
