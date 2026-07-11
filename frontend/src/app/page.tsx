import Link from "next/link";

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center">
      <div className="text-center">
        <h1 className="mb-4 text-5xl font-bold text-gray-900">ResumeForge</h1>
        <p className="mb-8 text-lg text-gray-600">
          基于 AI 的结构化简历生成与优化平台
        </p>
        <div className="flex gap-4 justify-center">
          <Link
            href="/auth/login"
            className="rounded-lg bg-blue-600 px-6 py-3 text-white font-medium hover:bg-blue-700 transition"
          >
            登录
          </Link>
          <Link
            href="/auth/register"
            className="rounded-lg border border-gray-300 px-6 py-3 text-gray-700 font-medium hover:bg-gray-100 transition"
          >
            注册
          </Link>
        </div>
      </div>
    </div>
  );
}
