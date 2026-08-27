export const PROTOCOL_VERSION = 1 as const;

export const NETWORKS = {
  local: 31_337,
  staging: 84_532,
  production: 8_453,
} as const;

export const UNLOCK_AT_UNIX = 1_798_124_400 as const;
export const UNLOCK_ROUND = 35_107_012 as const;
export const QUICKNET_GENESIS_UNIX = 1_692_803_367 as const;
export const QUICKNET_PERIOD_SECONDS = 3 as const;
export const MAX_ARCHIVE_BYTES = 10 * 1024 * 1024;
