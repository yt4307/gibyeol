export const theme = {
  colors: {
    background: "#10100f",
    foreground: "#f7f2e8",
    accent: "#d1a75d",
  },
} as const;

export type AppTheme = typeof theme;
