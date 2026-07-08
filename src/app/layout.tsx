import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TikTok Shop 매출 대시보드 | 성분에디터 북미2팀",
  description: "TikTok Shop 성분에디터 북미2팀 2026 매출 대시보드",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
