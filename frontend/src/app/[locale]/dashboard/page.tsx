"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTranslations, useRouter, usePathname } from "next-intl";
import { Plus, FileText, Briefcase, GraduationCap, FolderKanban, Award, Settings, LogOut, User, Menu, X, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import api from "@/lib/api";

interface Resume {
  id: number;
  company_name: string | null;
  target_language: string;
  status: string;
  created_at: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const pathname = usePathname();
  const locale = pathname.split("/")[1];
  const t = useTranslations("dashboard");
  const tCommon = useTranslations("common");
  const tAuth = useTranslations("auth.login");

  const [resumes, setResumes] = useState<Resume[]>([]);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  useEffect(() => {
    fetchResumes();
  }, []);

  const fetchResumes = async () => {
    try {
      const { data } = await api.get("/resumes/");
      setResumes(data);
    } catch (error) {
      console.error("Failed to fetch resumes:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await api.post("/auth/logout");
      window.location.href = `/${locale}/auth/login`;
    } catch {
      window.location.href = `/${locale}/auth/login`;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(locale === "zh-CN" ? "zh-CN" : "en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const getLanguageLabel = (lang: string) => {
    const labels: Record<string, string> = {
      chinese: locale === "zh-CN" ? "中文" : "Chinese",
      english: locale === "zh-CN" ? "英文" : "English",
      bilingual: locale === "zh-CN" ? "中英双语" : "Bilingual",
    };
    return labels[lang] || lang;
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, { zh: string; en: string }> = {
      draft: { zh: "草稿", en: "Draft" },
      generating: { zh: "生成中", en: "Generating" },
      completed: { zh: "已完成", en: "Completed" },
      failed: { zh: "生成失败", en: "Failed" },
    };
    return labels[status]?.[locale === "zh-CN" ? "zh" : "en"] || status;
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      draft: "bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300",
      generating: "bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400",
      completed: "bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-400",
      failed: "bg-error-100 text-error-700 dark:bg-error-900/30 dark:text-error-400",
    };
    return colors[status] || "bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300";
  };

  return (
    <div className="min-h-screen bg-background-primary">
      {/* Top Navigation */}
      <header className="sticky top-0 z-50 bg-white/80 dark:bg-neutral-950/80 backdrop-blur-sm border-b border-border-light dark:border-border-dark">
        <nav className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8" aria-label="Main navigation">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-8">
              <Link href={`/${locale}/dashboard`} className="text-xl font-bold text-primary-600 dark:text-primary-400">
                ResumeForge
              </Link>

              {/* Desktop Navigation */}
              <div className="hidden md:flex md:items-center md:gap-6">
                <Link
                  href={`/${locale}/dashboard`}
                  className={`text-sm font-medium transition-colors ${
                    pathname === `/${locale}/dashboard`
                      ? "text-primary-600 dark:text-primary-400"
                      : "text-text-secondary hover:text-text-primary"
                  `}
                >
                  {t("title")}
                </Link>
                <Link
                  href={`/${locale}/experiences`}
                  className={`text-sm font-medium transition-colors ${
                    pathname.startsWith(`/${locale}/experiences`)
                      ? "text-primary-600 dark:text-primary-400"
                      : "text-text-secondary hover:text-text-primary"
                  `}
                >
                  {tCommon("experiences") || "经历管理"}
                </Link>
                <Link
                  href={`/${locale}/settings`}
                  className={`text-sm font-medium transition-colors ${
                    pathname.startsWith(`/${locale}/settings`)
                      ? "text-primary-600 dark:text-primary-400"
                      : "text-text-secondary hover:text-text-primary"
                  `}
                >
                  {tCommon("settings")}
                </Link>
              </div>
            </div>

            {/* User Menu */}
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-2 rounded-lg p-1.5 text-text-secondary hover:text-text-primary hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                aria-expanded={userMenuOpen}
                aria-haspopup="true"
              >
                <div className="h-8 w-8 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                  <User className="h-5 w-5 text-primary-600 dark:text-primary-400" />
                </div>
                <span className="hidden md:block text-sm font-medium">用户</span>
                <ChevronDown className="h-4 w-4" />
              </button>

              {userMenuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} />
                  <div className="absolute right-0 mt-2 w-48 origin-top-right rounded-xl bg-white dark:bg-neutral-900 border border-border-light dark:border-border-dark shadow-lg animate-scale-in z-50">
                    <div className="px-4 py-3 border-b border-border-light dark:border-border-dark">
                      <p className="text-sm font-medium text-text-primary">用户</p>
                      <p className="text-xs text-text-tertiary truncate">user@example.com</p>
                    </div>
                    <Link
                      href={`/${locale}/settings?tab=profile`}
                      className="flex items-center gap-3 px-4 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-neutral-100 dark:hover:bg-neutral-800"
                      onClick={() => setUserMenuOpen(false)}
                    >
                      <User className="h-4 w-4" />
                      {tCommon("profile")}
                    </Link>
                    <Link
                      href={`/${locale}/settings?tab=llm`}
                      className="flex items-center gap-3 px-4 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-neutral-100 dark:hover:bg-neutral-800"
                      onClick={() => setUserMenuOpen(false)}
                    >
                      <Settings className="h-4 w-4" />
                      {tCommon("settings")}
                    </Link>
                    <hr className="my-1 border-border-light dark:border-border-dark" />
                    <button
                      onClick={handleLogout}
                      className="flex items-center gap-3 w-full px-4 py-2 text-sm text-error-600 dark:text-error-400 hover:bg-error-50 dark:hover:bg-error-900/20"
                    >
                      <LogOut className="h-4 w-4" />
                      {tAuth("logout") || "退出登录"}
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-neutral-100 dark:hover:bg-neutral-800"
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-menu"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>

          {/* Mobile Navigation */}
          {mobileMenuOpen && (
            <div id="mobile-menu" className="md:hidden py-4 border-t border-border-light dark:border-border-dark animate-slide-in-from-top">
              <div className="flex flex-col gap-2">
                <Link
                  href={`/${locale}/dashboard`}
                  className="px-3 py-2 text-sm font-medium rounded-lg text-text-secondary hover:text-text-primary hover:bg-neutral-100 dark:hover:bg-neutral-800"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {t("title")}
                </Link>
                <Link
                  href={`/${locale}/experiences`}
                  className="px-3 py-2 text-sm font-medium rounded-lg text-text-secondary hover:text-text-primary hover:bg-neutral-100 dark:hover:bg-neutral-800"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {tCommon("experiences") || "经历管理"}
                </Link>
                <Link
                  href={`/${locale}/settings`}
                  className="px-3 py-2 text-sm font-medium rounded-lg text-text-secondary hover:text-text-primary hover:bg-neutral-100 dark:hover:bg-neutral-800"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {tCommon("settings")}
                </Link>
                <hr className="my-2 border-border-light dark:border-border-dark" />
                <button
                  onClick={handleLogout}
                  className="px-3 py-2 text-sm font-medium text-left text-error-600 dark:text-error-400 hover:bg-error-50 dark:hover:bg-error-900/20 rounded-lg"
                >
                  {tAuth("logout") || "退出登录"}
                </button>
              </div>
            </div>
          )}
        </nav>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h1 className="text-2xl font-bold text-text-primary">{t("title")}</h1>
          <Link href={`/${locale}/resumes/new`}>
            <Button icon={<Plus className="h-4 w-4" />}>
              {t("createNew")}
            </Button>
          </Link>
        </div>

        {loading ? (
          // Skeleton loading state
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} variant="card" />
            ))}
          </div>
        ) : resumes.length === 0 ? (
          // Empty state
          <EmptyState
            illustration="document"
            title={t("emptyTitle")}
            description={t("emptyDescription")}
            action={{
              label: t("createFirst"),
              onClick: () => router.push(`/${locale}/resumes/new`),
            }}
          />
        ) : (
          // Resume grid
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {resumes.map((resume) => (
              <Link
                key={resume.id}
                href={`/${locale}/resumes/${resume.id}`}
                className="card-interactive group"
              >
                <div className="p-5">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <h3 className="font-semibold text-text-primary group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors line-clamp-1">
                      {resume.company_name || t("unnamedResume")}
                    </h3>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(resume.status)}`}>
                      {getStatusLabel(resume.status)}
                    </span>
                  </div>
                  <p className="text-sm text-text-secondary mb-2">
                    {t("language")}: {getLanguageLabel(resume.target_language)}
                  </p>
                  <p className="text-xs text-text-tertiary">
                    {t("createdAt")} {formatDate(resume.created_at)}
                  </p>
                  <div className="mt-4 flex gap-2 pt-4 border-t border-border-light dark:border-border-dark">
                    <Button variant="ghost" size="sm" className="flex-1">
                      {t("actions.edit")}
                    </Button>
                    <Button variant="ghost" size="sm" className="flex-1">
                      {t("actions.preview")}
                    </Button>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}