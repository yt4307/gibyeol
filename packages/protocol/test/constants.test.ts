import { describe, expect, it } from "vitest";
import {
  MAX_ARCHIVE_BYTES,
  NETWORKS,
  PROTOCOL_VERSION,
  QUICKNET_GENESIS_UNIX,
  QUICKNET_PERIOD_SECONDS,
  UNLOCK_AT_UNIX,
  UNLOCK_ROUND,
} from "../src/index";

describe("protocol constants", () => {
  it("matches the v1 freeze candidate", () => {
    expect(PROTOCOL_VERSION).toBe(1);
    expect(NETWORKS.production).toBe(8453);
    expect(NETWORKS.staging).toBe(84532);
    expect(UNLOCK_AT_UNIX).toBe(1798124400);
    expect(UNLOCK_ROUND).toBe(35107012);
    expect(QUICKNET_GENESIS_UNIX + (UNLOCK_ROUND - 1) * QUICKNET_PERIOD_SECONDS).toBe(
      UNLOCK_AT_UNIX,
    );
    expect(QUICKNET_GENESIS_UNIX + (UNLOCK_ROUND - 2) * QUICKNET_PERIOD_SECONDS).toBeLessThan(
      UNLOCK_AT_UNIX,
    );
    expect(MAX_ARCHIVE_BYTES).toBe(10_485_760);
  });
});
