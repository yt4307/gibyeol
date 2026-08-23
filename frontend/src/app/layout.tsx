import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Providers } from "./providers";
import "./styles.css";

export const metadata: Metadata = {
  title: "기별",
  description: "2026년 크리스마스에 도착하는 암호 편지",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="ko">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
