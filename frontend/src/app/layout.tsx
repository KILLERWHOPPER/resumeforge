import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ResumeForge — 智能简历生成工具",
  description: "基于 AI 的结构化简历生成与优化平台",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen bg-gray-50 text-gray-900 antialiased">
        {children}
      </body>
    </html>
  );
}
