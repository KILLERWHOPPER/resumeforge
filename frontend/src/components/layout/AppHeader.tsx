"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { usePathname } from "@/i18n/routing";
import {
  ChevronDown,
  LogOut,
  Menu,
  Settings,
  User,
  X,
} from "lucide-react";
import api, { clearTokens } from "@/lib/api";

interface AppHeaderProps {
  activePrefix: string;
}

export function AppHeader({ activePrefix }: AppHeaderProps) {
  const pathname = usePathname();
  const locale = pathname.split("/")[1];
  const tCommon = useTranslations("common");
  const tAuth = useTranslations("auth.login");
  const tDashboard = useTranslations("dashboard");

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await api.post("/auth/logout");
    } catch {
      // ignore
    }
    clearTokens();
    window.location.href = `/${locale}/auth/login`;
  };

  const navLinkClass = (prefix: string) =>
    `text-sm font-medium transition-colors ${
      pathname.startsWith(prefix)
        ? "text-primary-600 dark:text-primary-400"
        : "text-text-secondary hover:text-text-primary"
    }`;

  return (
    <header className="sticky top-0 z-50 bg-white/80 dark:bg-neutral-950/80 backdrop-blur-sm border-b border-border-light dark:border-border-dark">
      <nav className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8" aria-label="Main navigation">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-8">
            <Link
              href={`/${locale}/dashboard`}
              className="text-xl font-bold text-primary-600 dark:text-primary-400"
            >
              ResumeForge
            </Link>

            <div className="hidden md:flex md:items-center md:gap-6">
              <Link href={`/${locale}/dashboard`} className={navLinkClass(`/${locale}/dashboard`)}>
                {tDashboard("title")}
              </Link>
              <Link href={`/${locale}/experiences`} className={navLinkClass(`/${locale}/experiences`)}>
                {tCommon("experiences")}
              </Link>
              <Link href={`/${locale}/settings`} className={navLinkClass(`/${locale}/settings`)}>
                {tCommon("settings")}
              </Link>
            </div>
          </div>

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
                    {tAuth("logout")}
                  </button>
                </div>
              </>
            )}
          </div>

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

        {mobileMenuOpen && (
          <div id="mobile-menu" className="md:hidden py-4 border-t border-border-light dark:border-border-dark animate-slide-in-from-top">
            <div className="flex flex-col gap-2">
              <Link
                href={`/${locale}/dashboard`}
                className="px-3 py-2 text-sm font-medium rounded-lg text-text-secondary hover:text-text-primary hover:bg-neutral-100 dark:hover:bg-neutral-800"
                onClick={() => setMobileMenuOpen(false)}
              >
                {tDashboard("title")}
              </Link>
              <Link
                href={`/${locale}/experiences`}
                className="px-3 py-2 text-sm font-medium rounded-lg text-text-secondary hover:text-text-primary hover:bg-neutral-100 dark:hover:bg-neutral-800"
                onClick={() => setMobileMenuOpen(false)}
              >
                {tCommon("experiences")}
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
                {tAuth("logout")}
              </button>
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}