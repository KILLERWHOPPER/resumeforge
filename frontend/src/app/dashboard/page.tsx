"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import api from "@/lib/api";

interface Resume {
  id: number;
  company_name: string | null;
  target_language: string;
  status: string;
  created_at: string;
}

export default function DashboardPage() {
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get("/resumes/")
      .then((res) => setResumes(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 顶部导航 */}
      <nav className="border-b bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <h1 className="text-xl font-bold text-blue-600">ResumeForge</h1>
          <div className="flex gap-4 text-sm">
            <Link href="/dashboard" className="text-gray-700 hover:text-blue-600">
              Dashboard
            </Link>
            <Link href="/experiences" className="text-gray-700 hover:text-blue-600">
              经历管理
            </Link>
            <Link href="/settings" className="text-gray-700 hover:text-blue-600">
              设置
            </Link>
          </div>
        </div>
      </nav>

      {/* 主体内容 */}
      <main className="mx-auto max-w-6xl px-6 py-8">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold">我的简历</h2>
          <Link
            href="/resumes/new"
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white font-medium hover:bg-blue-700"
          >
            + 新建简历
          </Link>
        </div>

        {loading ? (
          <div className="text-center text-gray-500 py-12">加载中...</div>
        ) : resumes.length === 0 ? (
          /* 空状态引导 */
          <div className="rounded-xl border-2 border-dashed border-gray-300 p-12 text-center">
            <p className="mb-4 text-lg text-gray-500">还没有简历</p>
            <p className="mb-6 text-sm text-gray-400">
              粘贴一个职位描述，AI 会帮你生成一份针对性的简历
            </p>
            <Link
              href="/resumes/new"
              className="rounded-lg bg-blue-600 px-6 py-3 text-white font-medium hover:bg-blue-700"
            >
              创建第一份简历
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {resumes.map((resume) => (
              <div
                key={resume.id}
                className="rounded-xl border bg-white p-5 shadow-sm hover:shadow-md transition"
              >
                <h3 className="font-semibold text-gray-900">
                  {resume.company_name || "未命名简历"}
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  {resume.target_language === "english"
                    ? "英文"
                    : resume.target_language === "chinese"
                    ? "中文"
                    : "中英双语"}
                </p>
                <p className="mt-2 text-xs text-gray-400">
                  {new Date(resume.created_at).toLocaleDateString("zh-CN")}
                </p>
                <div className="mt-4 flex gap-2">
                  <Link
                    href={`/resumes/${resume.id}/edit`}
                    className="rounded-lg border px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
                  >
                    编辑
                  </Link>
                  <Link
                    href={`/resumes/${resume.id}`}
                    className="rounded-lg border px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
                  >
                    预览
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
