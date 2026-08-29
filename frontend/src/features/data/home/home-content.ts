export type HomeContent = {
  wordmark: string;
  statusFallback: string;
  eyebrow: string;
  title: readonly [string, string];
  description: string;
  actionLabel: string;
  letterLabel: string;
  letterMessage: string;
  unlockAt: string;
};

export const homeContent: HomeContent = {
  wordmark: "기별",
  statusFallback: "2026년 크리스마스 준비 중",
  eyebrow: "미래로 보내는 암호 편지",
  title: ["시간을 건너,", "기별이 닿습니다."],
  description:
    "지금의 마음을 별빛 아래 안전하게 봉인해 두었다가, 2026년 크리스마스에 전해드려요.",
  actionLabel: "기별 보내기",
  letterLabel: "2026 · CHRISTMAS POST",
  letterMessage: "그날의 당신에게,\n잊지 않고 전할게요.",
  unlockAt: "2026-12-25T00:00:00+09:00",
};
