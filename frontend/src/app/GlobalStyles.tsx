"use client";

import { Global, css } from "@emotion/react";
import { breakpoints, palette } from "@/styles/tokens";

const horizontalOverscrollBehavior =
  process.env.NEXT_PUBLIC_TUTI_TARGET === "app" ? "none" : "auto";

const globalStyles = css`
  :root {
    color-scheme: dark;

    /* Gibyeol identity */
    --color-identity-midnight-navy: ${palette.identity.midnightNavy};
    --color-identity-deep-blue: ${palette.identity.deepBlue};
    --color-identity-starlight-white: ${palette.identity.starlightWhite};
    --color-identity-sealing-red: ${palette.identity.sealingRed};
    --color-identity-stardust-gold: ${palette.identity.stardustGold};

    /* Neutral */
    --color-neutral-100: ${palette.neutral[100]};
    --color-neutral-200: ${palette.neutral[200]};
    --color-neutral-300: ${palette.neutral[300]};
    --color-neutral-400: ${palette.neutral[400]};
    --color-neutral-500: ${palette.neutral[500]};
    --color-neutral-600: ${palette.neutral[600]};
    --color-neutral-700: ${palette.neutral[700]};
    --color-neutral-800: ${palette.neutral[800]};
    --color-neutral-900: ${palette.neutral[900]};
    --color-neutral-1000: ${palette.neutral[1000]};
    --color-neutral-1100: ${palette.neutral[1100]};
    --color-neutral-1200: ${palette.neutral[1200]};
    --color-neutral-1300: ${palette.neutral[1300]};

    /* Stardust gold */
    --color-brand-100: ${palette.brand[100]};
    --color-brand-200: ${palette.brand[200]};
    --color-brand-300: ${palette.brand[300]};
    --color-brand-400: ${palette.brand[400]};
    --color-brand-500: ${palette.brand[500]};
    --color-brand-600: ${palette.brand[600]};
    --color-brand-700: ${palette.brand[700]};
    --color-brand-800: ${palette.brand[800]};
    --color-brand-900: ${palette.brand[900]};
    --color-brand-1000: ${palette.brand[1000]};

    /* Sealing red */
    --color-secondary-100: ${palette.secondary[100]};
    --color-secondary-200: ${palette.secondary[200]};
    --color-secondary-300: ${palette.secondary[300]};
    --color-secondary-400: ${palette.secondary[400]};
    --color-secondary-500: ${palette.secondary[500]};
    --color-secondary-600: ${palette.secondary[600]};
    --color-secondary-700: ${palette.secondary[700]};
    --color-secondary-800: ${palette.secondary[800]};
    --color-secondary-900: ${palette.secondary[900]};
    --color-secondary-1000: ${palette.secondary[1000]};

    /* Status */
    --color-warning: ${palette.status.warning};
    --color-error: ${palette.status.error};
    --color-success: ${palette.status.success};
    --color-info: var(--color-brand-800);
    --color-status-warning: var(--color-warning);
    --color-status-error: var(--color-error);
    --color-status-success: var(--color-success);

    /* Semantic */
    --color-app-background: var(--color-identity-midnight-navy);
    --color-surface: var(--color-identity-deep-blue);
    --color-surface-raised: #182338;
    --color-surface-soft: rgb(245 246 250 / 4%);
    --color-text: var(--color-identity-starlight-white);
    --color-text-muted: #a7adba;
    --color-border: rgb(217 199 163 / 22%);
    --color-border-strong: rgb(217 199 163 / 48%);
    --color-accent-primary: var(--color-identity-stardust-gold);
    --color-accent-secondary: var(--color-identity-sealing-red);
    --color-accent-bridge: ${palette.accent.bridge};
    --color-accent-soft: rgb(217 199 163 / 12%);
    --shadow-surface: 0 24px 80px rgb(0 0 0 / 28%);

    /* Compatibility aliases */
    --color-black: var(--color-identity-midnight-navy);
    --color-white: var(--color-identity-starlight-white);
    --color-gray-50: var(--color-surface);
    --color-gray-300: var(--color-neutral-700);
    --color-gray-700: var(--color-neutral-300);
    --color-green-soft: rgb(158 191 173 / 12%);
    --color-blue: var(--color-brand-500);
    --color-green: var(--color-secondary-500);
    --color-black-rgb: 0 0 0;
    --color-white-rgb: 255 255 255;

    /* Typography: base 14px, 2px minor scale */
    --font-family-body:
      var(--font-pretendard), Pretendard, -apple-system, BlinkMacSystemFont,
      "Apple SD Gothic Neo", "Noto Sans KR", "Segoe UI", sans-serif;
    --font-family-display:
      var(--font-maru-buri), "Maru Buri", "Noto Serif KR", "Nanum Myeongjo",
      "AppleMyungjo", "Batang", serif;
    --font-family-letter: var(--font-family-display);
    --font-family-utility: var(--font-family-body);

    /* Compatibility aliases */
    --font-sans: var(--font-family-body);
    --font-serif: var(--font-family-display);
    --font-size-fluid-offset: 0rem;
    --font-size-fluid-offset: clamp(
      0rem,
      min(calc(1dvh - 0.45rem), calc(4vw - 0.9375rem)),
      0.125rem
    );
    --font-size-100: calc(0.75rem + var(--font-size-fluid-offset)); /* 12–14px */
    --font-size-200: calc(0.875rem + var(--font-size-fluid-offset)); /* 14–16px, base */
    --font-size-300: calc(1rem + var(--font-size-fluid-offset)); /* 16–18px */
    --font-size-400: calc(1.125rem + var(--font-size-fluid-offset)); /* 18–20px */
    --font-size-500: calc(1.25rem + var(--font-size-fluid-offset)); /* 20–22px */
    --font-size-600: calc(1.375rem + var(--font-size-fluid-offset)); /* 22–24px */
    --font-size-700: calc(1.5rem + var(--font-size-fluid-offset)); /* 24–26px */
    --line-height-heading: 1.2;
    --line-height-subtitle: 1.4;
    --line-height-body: 1.5;
    --letter-spacing-heading: 0.005em;
    --letter-spacing-subtitle: -0.005em;
    --letter-spacing-body: -0.015em;

    /* 4px spacing grid */
    --space-0: 0;
    --space-1: 4px;
    --space-2: 8px;
    --space-3: 12px;
    --space-4: 16px;
    --space-5: 20px;
    --space-6: 24px;
    --space-7: 28px;
    --space-8: 32px;
    --space-9: 36px;
    --space-10: 40px;
    --space-11: 44px;
    --space-12: 48px;
    --space-14: 56px;
    --space-16: 64px;

    /* Reference values; use src/styles/tokens.ts in media queries. */
    --breakpoint-mobile: 480px;
    --breakpoint-tablet: 768px;
    --breakpoint-laptop: 1024px;
    --breakpoint-desktop: 1280px;
    --breakpoint-wide: 1536px;
  }

  *,
  *::before,
  *::after {
    box-sizing: border-box;
  }

  html {
    min-width: 280px;
    min-height: 100%;
    background: var(--color-app-background);
    overflow-x: clip;
    -webkit-text-size-adjust: 100%;
    text-size-adjust: 100%;
    scroll-behavior: smooth;
  }

  body {
    width: 100%;
    min-height: 100vh;
    min-height: 100dvh;
    margin: 0;
    padding: 0;
    overflow-x: clip;
  }

  body {
    display: flex;
    flex-direction: column;
    color: var(--color-text);
    background: var(--color-app-background);
    font-family: var(--font-sans);
    font-size: var(--font-size-200);
    font-stretch: 100%;
    font-synthesis: none;
    line-height: var(--line-height-body);
    letter-spacing: var(--letter-spacing-body);
    text-rendering: optimizeLegibility;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    overscroll-behavior-x: ${horizontalOverscrollBehavior};
    overscroll-behavior-y: auto;
  }

  @media (max-width: ${breakpoints.mobile}px) {
    html,
    body {
      background: var(--color-app-background);
    }
  }

  h1,
  h2,
  h3,
  h4,
  h5,
  h6,
  p {
    margin: 0;
  }

  h1,
  h2,
  h3,
  h4,
  h5,
  h6 {
    line-height: var(--line-height-heading);
    letter-spacing: var(--letter-spacing-heading);
  }

  small {
    font-size: var(--font-size-100);
  }

  ul,
  ol {
    margin: 0;
    padding: 0;
    list-style: none;
  }

  a {
    color: inherit;
    text-decoration: none;
  }

  button,
  input,
  textarea,
  select {
    margin: 0;
    color: inherit;
    font: inherit;
  }

  a,
  button {
    -webkit-tap-highlight-color: transparent;
    touch-action: manipulation;
  }

  button {
    -webkit-appearance: none;
    appearance: none;
  }

  button:disabled {
    cursor: default;
  }

  input,
  textarea,
  select {
    color: var(--color-text);
    background: rgb(13 19 33 / 56%);
    border-color: var(--color-border);
  }

  input::placeholder,
  textarea::placeholder {
    color: rgb(167 173 186 / 66%);
  }

  /* iOS Safari와 WKWebView는 16px 미만 입력에 포커스하면 화면을 확대한다. */
  @supports (-webkit-touch-callout: none) {
    input:not([type]),
    input[type="date"],
    input[type="datetime-local"],
    input[type="email"],
    input[type="month"],
    input[type="number"],
    input[type="password"],
    input[type="search"],
    input[type="tel"],
    input[type="text"],
    input[type="time"],
    input[type="url"],
    input[type="week"],
    select,
    textarea {
      font-size: max(16px, 1em) !important;
    }
  }

  img,
  picture,
  svg,
  canvas,
  video {
    display: block;
    max-width: 100%;
  }

  :focus-visible {
    outline: 2px solid var(--color-accent-primary);
    outline-offset: 3px;
  }

  .skip-link {
    position: fixed;
    z-index: 9999;
    top: var(--space-3);
    left: var(--space-3);
    padding: var(--space-3) var(--space-4);
    color: var(--color-identity-midnight-navy);
    background: var(--color-accent-primary);
    border-radius: 3px;
    font-weight: 700;
    transform: translateY(calc(-100% - var(--space-6)));
    transition: transform 140ms ease;
  }

  .skip-link:focus-visible {
    transform: translateY(0);
  }

  ::selection {
    color: var(--color-text);
    background: var(--color-accent-soft);
  }

  @media (prefers-reduced-motion: reduce) {
    *,
    *::before,
    *::after {
      scroll-behavior: auto !important;
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
    }
  }
`;

export default function GlobalStyles() {
  return <Global styles={globalStyles} />;
}
