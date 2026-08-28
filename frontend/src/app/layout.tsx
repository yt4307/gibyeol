import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import EmotionRegistry from "./EmotionRegistry";
import GlobalStyles from "./GlobalStyles";
import { pretendard } from "./fonts";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "기별",
  description: "오늘의 마음을 약속한 날까지 안전하게 봉인하는 암호 편지 서비스",
  applicationName: "기별",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "기별",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: "#f7f3ea",
};

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="ko-KR" className={pretendard.variable}>
      <body>
        <EmotionRegistry>
          <Providers>
            <GlobalStyles />
            {children}
          </Providers>
        </EmotionRegistry>
      </body>
    </html>
  );
}
