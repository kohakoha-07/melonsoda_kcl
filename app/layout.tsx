import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Meloop — 好きな音で、つながろう。",
  description:
    "今日の気持ちに、一曲を。好きな音楽を分かち合う小さなコミュニティ。",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
