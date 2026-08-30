import { describe, expect, it, vi } from "vitest";
import { blockRanges, loadBlockRangePages } from "./log-ranges";

describe("blockRanges", () => {
  it("splits inclusive ranges into RPC-safe 10,000-block pages", () => {
    expect(blockRanges(46_102_067n, 46_127_000n)).toEqual([
      { fromBlock: 46_102_067n, toBlock: 46_112_066n },
      { fromBlock: 46_112_067n, toBlock: 46_122_066n },
      { fromBlock: 46_122_067n, toBlock: 46_127_000n },
    ]);
  });

  it("loads pages sequentially and preserves their order", async () => {
    const load = vi.fn(async ({ fromBlock }) => [fromBlock]);
    await expect(loadBlockRangePages(1n, 10_001n, load)).resolves.toEqual([1n, 10_001n]);
    expect(load).toHaveBeenCalledTimes(2);
  });
});
