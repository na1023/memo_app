import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "スマートメモ & ToDo 管理",
  description: "フォルダ分け、AI要約・添削機能付きの高機能メモ＆ToDoアプリ",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
