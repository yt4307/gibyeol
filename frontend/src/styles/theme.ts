import { palette } from "./tokens";

export const theme = {
  colors: {
    background: palette.neutral[200],
    foreground: palette.neutral[1300],
    accent: palette.brand[500],
  },
} as const;

export type AppTheme = typeof theme;
