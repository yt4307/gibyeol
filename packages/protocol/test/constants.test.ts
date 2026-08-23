import { describe, expect, it } from "vitest";
import {
  MAX_ARCHIVE_BYTES,
  NETWORKS,
  PROTOCOL_VERSION,
  UNLOCK_AT_UNIX,
} from "../src/index";

describe("protocol constants", () => {
  it("matches the v1 freeze candidate", () => {
    expect(PROTOCOL_VERSION).toBe(1);
    expect(NETWORKS.production).toBe(8453);
    expect(NETWORKS.staging).toBe(84532);
    expect(UNLOCK_AT_UNIX).toBe(1798124400);
    expect(MAX_ARCHIVE_BYTES).toBe(10_485_760);
  });
});
