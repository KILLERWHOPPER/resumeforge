import type { Metadata } from "next";
import { Providers } from "@/components/providers/Providers";

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
    <html lang="zh-CN" suppressHydrationWarning>
      <body className="min-h-screen bg-background-primary text-text-primary antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}