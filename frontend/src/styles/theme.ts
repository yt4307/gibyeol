import { palette } from "./tokens";

export const theme = {
  colors: {
    background: palette.identity.midnightNavy,
    foreground: palette.identity.starlightWhite,
    accent: palette.brand[500],
  },
} as const;

export type AppTheme = typeof theme;
