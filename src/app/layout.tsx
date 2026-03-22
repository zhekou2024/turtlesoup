import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "海龟汤 | Turtle Soup",
  description: "极简海龟汤情境猜谜游戏",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen bg-zinc-950 text-zinc-100 antialiased">
        {children}
      </body>
    </html>
  );
}
