'use client';

import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { Mail, Lock, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import api from '@/lib/api';

export default function RegisterPage() {
  const router = useRouter();
  const pathname = usePathname();
  const locale = pathname.split('/')[1];
  const t = useTranslations('auth.register');
  const tCommon = useTranslations('common');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError(t('errors.passwordMismatch'));
      return;
    }
    if (password.length < 8) {
      setError(t('errors.passwordTooShort'));
      return;
    }

    setLoading(true);
    try {
      await api.post('/auth/register', {
        email,
        password,
        confirm_password: confirmPassword,
      });
      router.push(`/${locale}/auth/login`);
    } catch (err: any) {
      setError(err.response?.data?.detail || t('errors.serverError'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background-primary px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Link
            href={`/${locale}`}
            className="mb-6 inline-flex items-center gap-2 text-2xl font-bold text-primary-600 dark:text-primary-400"
          >
            ResumeForge
          </Link>
          <h1 className="text-2xl font-bold text-text-primary">{t('title')}</h1>
          <p className="mt-2 text-text-secondary">{t('subtitle')}</p>
        </div>

        <div className="rounded-xl border border-border-light bg-white p-8 shadow-sm dark:border-border-dark dark:bg-neutral-900">
          <form onSubmit={handleSubmit} className="space-y-5">
            <Input
              label={t('emailLabel')}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t('emailPlaceholder')}
              required
              autoComplete="email"
              icon={<Mail className="h-5 w-5" />}
            />

            <Input
              label={t('passwordLabel')}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t('passwordPlaceholder')}
              required
              minLength={8}
              autoComplete="new-password"
              icon={<Lock className="h-5 w-5" />}
            />

            <Input
              label={t('confirmPasswordLabel')}
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder={t('confirmPasswordPlaceholder')}
              required
              autoComplete="new-password"
              icon={<Lock className="h-5 w-5" />}
            />

            {error && (
              <div className="flex items-center gap-2 rounded-lg border border-error-200 bg-error-50 p-3 dark:border-error-800 dark:bg-error-900/20">
                <AlertCircle className="h-5 w-5 flex-shrink-0 text-error-600 dark:text-error-400" />
                <p className="text-sm text-error-600 dark:text-error-400">{error}</p>
              </div>
            )}

            <Button type="submit" className="w-full" loading={loading}>
              {loading ? t('loading') : t('submit')}
            </Button>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border-light dark:border-border-dark" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="bg-white px-4 text-text-tertiary dark:bg-neutral-900">
                  {tCommon('or')}
                </span>
              </div>
            </div>

            <div className="mt-6 text-center">
              <p className="text-sm text-text-secondary">
                {t('hasAccount')}{' '}
                <Link
                  href={`/${locale}/auth/login`}
                  className="font-medium text-primary-600 hover:text-primary-500"
                >
                  {t('loginLink')}
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
