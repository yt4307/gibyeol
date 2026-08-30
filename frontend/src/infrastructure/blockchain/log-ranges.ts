const MAX_LOG_BLOCKS = 10_000n;

export type BlockRange = {
  fromBlock: bigint;
  toBlock: bigint;
};

export function blockRanges(fromBlock: bigint, toBlock: bigint): BlockRange[] {
  if (toBlock < fromBlock) return [];
  const ranges: BlockRange[] = [];
  for (let start = fromBlock; start <= toBlock; start += MAX_LOG_BLOCKS) {
    ranges.push({
      fromBlock: start,
      toBlock: start + MAX_LOG_BLOCKS - 1n < toBlock ? start + MAX_LOG_BLOCKS - 1n : toBlock,
    });
  }
  return ranges;
}

export async function loadBlockRangePages<T>(
  fromBlock: bigint,
  toBlock: bigint,
  load: (range: BlockRange) => Promise<readonly T[]>,
): Promise<T[]> {
  const result: T[] = [];
  for (const range of blockRanges(fromBlock, toBlock)) result.push(...await load(range));
  return result;
}
