"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { Mail, Lock, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import api from "@/lib/api";

export default function RegisterPage() {
  const router = useRouter();
  const pathname = usePathname();
  const locale = pathname.split("/")[1];
  const t = useTranslations("auth.register");
  const tCommon = useTranslations("common");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError(t("errors.passwordMismatch"));
      return;
    }
    if (password.length < 8) {
      setError(t("errors.passwordTooShort"));
      return;
    }

    setLoading(true);
    try {
      await api.post("/auth/register", {
        email,
        password,
        confirm_password: confirmPassword,
      });
      router.push(`/${locale}/auth/login`);
    } catch (err: any) {
      setError(err.response?.data?.detail || t("errors.serverError"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background-primary px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href={`/${locale}`} className="inline-flex items-center gap-2 text-2xl font-bold text-primary-600 dark:text-primary-400 mb-6">
            ResumeForge
          </Link>
          <h1 className="text-2xl font-bold text-text-primary">{t("title")}</h1>
          <p className="mt-2 text-text-secondary">{t("subtitle")}</p>
        </div>

        <div className="bg-white dark:bg-neutral-900 rounded-xl border border-border-light dark:border-border-dark p-8 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-5">
            <Input
              label={t("emailLabel")}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t("emailPlaceholder")}
              required
              autoComplete="email"
              icon={<Mail className="h-5 w-5" />}
            />

            <Input
              label={t("passwordLabel")}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t("passwordPlaceholder")}
              required
              minLength={8}
              autoComplete="new-password"
              icon={<Lock className="h-5 w-5" />}
            />

            <Input
              label={t("confirmPasswordLabel")}
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder={t("confirmPasswordPlaceholder")}
              required
              autoComplete="new-password"
              icon={<Lock className="h-5 w-5" />}
            />

            {error && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-error-50 dark:bg-error-900/20 border border-error-200 dark:border-error-800">
                <AlertCircle className="h-5 w-5 text-error-600 dark:text-error-400 flex-shrink-0" />
                <p className="text-sm text-error-600 dark:text-error-400">{error}</p>
              </div>
            )}

            <Button type="submit" className="w-full" loading={loading}>
              {loading ? t("loading") : t("submit")}
            </Button>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border-light dark:border-border-dark" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white dark:bg-neutral-900 text-text-tertiary">{tCommon("or")}</span>
              </div>
            </div>

            <div className="mt-6 text-center">
              <p className="text-sm text-text-secondary">
                {t("hasAccount")}{" "}
                <Link
                  href={`/${locale}/auth/login`}
                  className="text-primary-600 hover:text-primary-500 font-medium"
                >
                  {t("loginLink")}
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}