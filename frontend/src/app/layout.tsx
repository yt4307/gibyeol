import type { Metadata } from "next";
import type { ReactNode } from "react";
import EmotionRegistry from "./EmotionRegistry";
import GlobalStyles from "./GlobalStyles";
import { pretendard } from "./fonts";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "기별",
  description: "",
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
