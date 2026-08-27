import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./styles.css";

export const metadata: Metadata = {
  title: "기별 · 호스팅 확인",
  description: "기별 닷홈 정적 배포 확인 페이지",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
