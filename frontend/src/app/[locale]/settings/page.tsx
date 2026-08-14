'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { usePathname, useRouter } from '@/i18n/routing';
import {
  Plus,
  Briefcase,
  GraduationCap,
  Settings,
  LogOut,
  User,
  Menu,
  X,
  ChevronDown,
  KeyRound,
  Globe,
  Sparkles,
  Check,
  Trash2,
  Loader2,
  Shield,
  Palette,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { SimpleTabs } from '@/components/ui/Tabs';
import { ConfirmModal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import api, { clearTokens } from '@/lib/api';

interface LLMConfig {
  id: number;
  name: string;
  base_url: string;
  model_name: string;
  is_active: boolean;
  api_key_masked: string | null;
}

const PROVIDER_BASE_URLS: Record<string, string> = {
  openai: 'https://api.openai.com/v1',
  deepseek: 'https://api.deepseek.com/v1',
  zhipu: 'https://open.bigmodel.cn/api/paas/v4',
  custom: '',
};

export default function SettingsPage() {
  const pathname = usePathname();
  const locale = useLocale();
  const router = useRouter();
  const t = useTranslations('settings');
  const tCommon = useTranslations('common');
  const tAuth = useTranslations('auth.login');

  const [activeTab, setActiveTab] = useState<string>('llm');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab');
    if (tab) setActiveTab(tab);
  }, []);

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // ignore
    }
    clearTokens();
    window.location.href = `/${locale}/auth/login`;
  };

  const navLinkClass = (prefix: string) =>
    `text-sm font-medium transition-colors ${
      pathname.startsWith(prefix)
        ? 'text-primary-600 dark:text-primary-400'
        : 'text-text-secondary hover:text-text-primary'
    }`;

  return (
    <div className="min-h-screen bg-background-primary">
      <header className="sticky top-0 z-50 border-b border-border-light bg-white/80 backdrop-blur-sm dark:border-border-dark dark:bg-neutral-950/80">
        <nav className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8" aria-label="Main navigation">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-8">
              <Link
                href={`/dashboard`}
                className="text-xl font-bold text-primary-600 dark:text-primary-400"
              >
                ResumeForge
              </Link>
              <div className="hidden md:flex md:items-center md:gap-6">
                <Link href={`/dashboard`} className={navLinkClass(`/dashboard`)}>
                  {tCommon('dashboard')}
                </Link>
                <Link href={`/experiences`} className={navLinkClass(`/experiences`)}>
                  {tCommon('experiences')}
                </Link>
                <Link href={`/settings`} className={navLinkClass(`/settings`)}>
                  {tCommon('settings')}
                </Link>
              </div>
            </div>

            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-2 rounded-lg p-1.5 text-text-secondary transition-colors hover:bg-neutral-100 hover:text-text-primary dark:hover:bg-neutral-800"
                aria-expanded={userMenuOpen}
                aria-haspopup="true"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-100 dark:bg-primary-900/30">
                  <User className="h-5 w-5 text-primary-600 dark:text-primary-400" />
                </div>
                <span className="hidden text-sm font-medium md:block">用户</span>
                <ChevronDown className="h-4 w-4" />
              </button>

              {userMenuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} />
                  <div className="absolute right-0 z-50 mt-2 w-48 origin-top-right animate-scale-in rounded-xl border border-border-light bg-white shadow-lg dark:border-border-dark dark:bg-neutral-900">
                    <div className="border-b border-border-light px-4 py-3 dark:border-border-dark">
                      <p className="text-sm font-medium text-text-primary">用户</p>
                      <p className="truncate text-xs text-text-tertiary">user@example.com</p>
                    </div>
                    <Link
                      href={`/settings?tab=profile`}
                      className="flex items-center gap-3 px-4 py-2 text-sm text-text-secondary hover:bg-neutral-100 hover:text-text-primary dark:hover:bg-neutral-800"
                      onClick={() => setUserMenuOpen(false)}
                    >
                      <User className="h-4 w-4" />
                      {tCommon('profile')}
                    </Link>
                    <Link
                      href={`/settings?tab=llm`}
                      className="flex items-center gap-3 px-4 py-2 text-sm text-text-secondary hover:bg-neutral-100 hover:text-text-primary dark:hover:bg-neutral-800"
                      onClick={() => setUserMenuOpen(false)}
                    >
                      <Settings className="h-4 w-4" />
                      {tCommon('settings')}
                    </Link>
                    <hr className="my-1 border-border-light dark:border-border-dark" />
                    <button
                      onClick={handleLogout}
                      className="flex w-full items-center gap-3 px-4 py-2 text-sm text-error-600 hover:bg-error-50 dark:text-error-400 dark:hover:bg-error-900/20"
                    >
                      <LogOut className="h-4 w-4" />
                      {tAuth('logout')}
                    </button>
                  </div>
                </>
              )}
            </div>

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="rounded-lg p-2 text-text-secondary hover:bg-neutral-100 hover:text-text-primary dark:hover:bg-neutral-800 md:hidden"
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-menu"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>

          {mobileMenuOpen && (
            <div
              id="mobile-menu"
              className="animate-slide-in-from-top border-t border-border-light py-4 dark:border-border-dark md:hidden"
            >
              <div className="flex flex-col gap-2">
                <Link
                  href={`/dashboard`}
                  className="rounded-lg px-3 py-2 text-sm font-medium text-text-secondary hover:bg-neutral-100 hover:text-text-primary dark:hover:bg-neutral-800"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {tCommon('dashboard')}
                </Link>
                <Link
                  href={`/experiences`}
                  className="rounded-lg px-3 py-2 text-sm font-medium text-text-secondary hover:bg-neutral-100 hover:text-text-primary dark:hover:bg-neutral-800"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {tCommon('experiences')}
                </Link>
                <Link
                  href={`/settings`}
                  className="rounded-lg px-3 py-2 text-sm font-medium text-text-secondary hover:bg-neutral-100 hover:text-text-primary dark:hover:bg-neutral-800"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {tCommon('settings')}
                </Link>
                <hr className="my-2 border-border-light dark:border-border-dark" />
                <button
                  onClick={handleLogout}
                  className="rounded-lg px-3 py-2 text-left text-sm font-medium text-error-600 hover:bg-error-50 dark:text-error-400 dark:hover:bg-error-900/20"
                >
                  {tAuth('logout')}
                </button>
              </div>
            </div>
          )}
        </nav>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <h1 className="mb-6 text-2xl font-bold text-text-primary">{t('title')}</h1>

        <SimpleTabs
          tabs={[
            { value: 'profile', label: t('tabs.profile'), icon: <User className="h-4 w-4" /> },
            { value: 'llm', label: t('tabs.llm'), icon: <Sparkles className="h-4 w-4" /> },
            { value: 'security', label: t('tabs.security'), icon: <Shield className="h-4 w-4" /> },
            {
              value: 'appearance',
              label: t('tabs.appearance'),
              icon: <Palette className="h-4 w-4" />,
            },
          ]}
          activeTab={activeTab}
          onChange={setActiveTab}
        >
          {(active) => (
            <>
              {active === 'profile' && <ProfileTab />}
              {active === 'llm' && <LLMConfigTab />}
              {active === 'security' && <SecurityTab />}
              {active === 'appearance' && <AppearanceTab />}
            </>
          )}
        </SimpleTabs>
      </main>
    </div>
  );
}

function ProfileTab() {
  const t = useTranslations('settings.profile');

  return (
    <div className="max-w-2xl">
      <h2 className="mb-4 text-lg font-semibold text-text-primary">{t('title')}</h2>
      <div className="card rounded-xl border border-border-light bg-white p-6 dark:border-border-dark dark:bg-neutral-900">
        <Input label={t('email')} value="user@example.com" disabled hint={t('emailHint')} />
      </div>
    </div>
  );
}

function LLMConfigTab() {
  const t = useTranslations('settings.llm');
  const tCommon = useTranslations('common');
  const toast = useToast();

  const [configs, setConfigs] = useState<LLMConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const [name, setName] = useState('');
  const [provider, setProvider] = useState('deepseek');
  const [baseUrl, setBaseUrl] = useState(PROVIDER_BASE_URLS.deepseek);
  const [apiKey, setApiKey] = useState('');
  const [modelName, setModelName] = useState('');
  const [isActive, setIsActive] = useState(false);

  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<LLMConfig | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchConfigs = async () => {
    try {
      const { data } = await api.get('/llm-configs/');
      setConfigs(data);
    } catch {
      // global handler shows toast
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfigs();
  }, []);

  const handleProviderChange = (value: string) => {
    setProvider(value);
    if (value !== 'custom') {
      setBaseUrl(PROVIDER_BASE_URLS[value]);
    }
  };

  const resetForm = () => {
    setName('');
    setProvider('deepseek');
    setBaseUrl(PROVIDER_BASE_URLS.deepseek);
    setApiKey('');
    setModelName('');
    setIsActive(false);
    setTestResult(null);
    setShowForm(false);
  };

  const handleTestConnection = async () => {
    if (!baseUrl || !apiKey || !modelName) {
      toast.error(t('errors.baseUrlRequired'));
      return;
    }
    setTesting(true);
    setTestResult(null);
    try {
      await api.post('/llm-configs/test', {
        base_url: baseUrl,
        api_key: apiKey,
        model_name: modelName,
      });
      setTestResult('success');
      toast.success(t('testSuccess'));
    } catch {
      setTestResult('error');
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    if (!name) return toast.error(t('errors.nameRequired'));
    if (!baseUrl) return toast.error(t('errors.baseUrlRequired'));
    if (!apiKey) return toast.error(t('errors.apiKeyRequired'));
    if (!modelName) return toast.error(t('errors.modelNameRequired'));

    setSaving(true);
    try {
      await api.post('/llm-configs/', {
        name,
        base_url: baseUrl,
        api_key: apiKey,
        model_name: modelName,
        is_active: isActive,
      });
      toast.success(tCommon('success'));
      resetForm();
      await fetchConfigs();
    } catch {
      // global handler shows toast
    } finally {
      setSaving(false);
    }
  };

  const handleActivate = async (config: LLMConfig) => {
    try {
      await api.put(`/llm-configs/${config.id}/activate`);
      await fetchConfigs();
    } catch {
      // global handler shows toast
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/llm-configs/${deleteTarget.id}/`);
      toast.success(tCommon('success'));
      setDeleteTarget(null);
      await fetchConfigs();
    } catch {
      // global handler shows toast
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="max-w-3xl">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-text-primary">{t('title')}</h2>
          <p className="mt-1 text-sm text-text-secondary">{t('description')}</p>
        </div>
        {!showForm && (
          <Button onClick={() => setShowForm(true)} icon={<Plus className="h-4 w-4" />}>
            {t('addConfig')}
          </Button>
        )}
      </div>

      {showForm && (
        <div className="card mb-8 animate-fade-in rounded-xl border border-border-light bg-white p-6 dark:border-border-dark dark:bg-neutral-900">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label={t('name')}
              placeholder={t('namePlaceholder')}
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            <div>
              <Select
                label={t('provider')}
                value={provider}
                onChange={handleProviderChange}
                options={[
                  { value: 'openai', label: t('providers.openai') },
                  { value: 'deepseek', label: t('providers.deepseek') },
                  { value: 'zhipu', label: t('providers.zhipu') },
                  { value: 'custom', label: t('providers.custom') },
                ]}
              />
            </div>
            <Input
              label={t('baseUrl')}
              placeholder={t('baseUrlPlaceholder')}
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              required
              className="sm:col-span-2"
            />
            <Input
              label={t('apiKey')}
              placeholder={t('apiKeyPlaceholder')}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              type="password"
              required
            />
            <Input
              label={t('modelName')}
              placeholder={t('modelNamePlaceholder')}
              value={modelName}
              onChange={(e) => setModelName(e.target.value)}
              required
            />
          </div>

          <div className="mt-4 flex items-center gap-2">
            <label className="flex cursor-pointer items-center gap-2 text-sm text-text-secondary">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="h-4 w-4 rounded border-input-border text-primary-600 focus:ring-primary-500"
              />
              {t('isActive')}
            </label>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Button
              variant="secondary"
              onClick={handleTestConnection}
              loading={testing}
              icon={<Globe className="h-4 w-4" />}
            >
              {testing ? t('testing') : t('testConnection')}
            </Button>
            {testResult === 'success' && (
              <span className="inline-flex items-center gap-1 text-sm text-success-600 dark:text-success-400">
                <Check className="h-4 w-4" /> {t('testSuccess')}
              </span>
            )}
            {testResult === 'error' && (
              <span className="inline-flex items-center gap-1 text-sm text-error-600 dark:text-error-400">
                <X className="h-4 w-4" /> {t('testFailed', { error: '' })}
              </span>
            )}
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <Button variant="ghost" onClick={resetForm}>
              {tCommon('cancel')}
            </Button>
            <Button onClick={handleSave} loading={saving}>
              {saving ? t('saving') : t('save')}
            </Button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} variant="card" />
          ))}
        </div>
      ) : configs.length === 0 ? (
        <EmptyState
          illustration="document"
          title={t('addConfig')}
          description={t('description')}
          action={{
            label: t('addConfig'),
            onClick: () => setShowForm(true),
          }}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {configs.map((config) => (
            <div
              key={config.id}
              className="rounded-xl border border-border-light bg-white p-5 dark:border-border-dark dark:bg-neutral-900"
            >
              <div className="mb-2 flex items-start justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  <h3 className="truncate font-semibold text-text-primary">{config.name}</h3>
                  {config.is_active && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-primary-100 px-2 py-0.5 text-xs font-medium text-primary-700 dark:bg-primary-900/30 dark:text-primary-400">
                      <Sparkles className="h-3 w-3" /> {t('isActive')}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => setDeleteTarget(config)}
                  className="rounded-lg p-1.5 text-text-tertiary transition-colors hover:bg-error-50 hover:text-error-600 dark:hover:bg-error-900/20"
                  aria-label={tCommon('delete')}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <p className="mb-1 truncate text-sm text-text-secondary">{config.model_name}</p>
              <p className="mb-3 truncate text-xs text-text-tertiary">{config.base_url}</p>
              <div className="flex items-center justify-between border-t border-border-light pt-3 dark:border-border-dark">
                <span className="font-mono text-xs text-text-tertiary">
                  {config.api_key_masked}
                </span>
                {!config.is_active && (
                  <Button variant="outline" size="sm" onClick={() => handleActivate(config)}>
                    {t('isActive')}
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title={tCommon('confirmDelete')}
        message={`${t('title')}: ${deleteTarget?.name ?? ''}`}
        loading={deleting}
      />
    </div>
  );
}

function SecurityTab() {
  const t = useTranslations('settings.security');
  const tAuth = useTranslations('auth.changePassword');
  const tCommon = useTranslations('common');
  const toast = useToast();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!currentPassword || !newPassword) return;
    if (newPassword !== confirmPassword) {
      toast.error(tAuth('errors.passwordMismatch'));
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/auth/change-password', {
        current_password: currentPassword,
        new_password: newPassword,
      });
      toast.success(tAuth('success'));
      window.location.href = `/${window.location.pathname.split('/')[1]}/auth/login`;
    } catch {
      // global handler shows toast
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl">
      <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-text-primary">
        <KeyRound className="h-5 w-5 text-text-secondary" /> {t('changePassword')}
      </h2>
      <div className="rounded-xl border border-border-light bg-white p-6 dark:border-border-dark dark:bg-neutral-900">
        <div className="grid gap-4">
          <Input
            label={t('currentPassword')}
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            type="password"
            required
          />
          <Input
            label={t('newPassword')}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            type="password"
            required
          />
          <Input
            label={t('confirmPassword')}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            type="password"
            required
          />
        </div>
        <div className="mt-6 flex justify-end">
          <Button onClick={handleSubmit} loading={submitting}>
            {t('update')}
          </Button>
        </div>
      </div>
    </div>
  );
}

function AppearanceTab() {
  const t = useTranslations('settings.appearance');
  const tCommon = useTranslations('common');
  const pathname = usePathname();
  const router = useRouter();
  const locale = useLocale();

  const switchLocale = (nextLocale: string) => {
    router.replace(pathname, { locale: nextLocale });
  };

  return (
    <div className="max-w-2xl">
      <h2 className="mb-4 text-lg font-semibold text-text-primary">{t('title')}</h2>
      <div className="rounded-xl border border-border-light bg-white p-6 dark:border-border-dark dark:bg-neutral-900">
        <p className="text-text-label mb-3 text-sm font-medium">{t('language')}</p>
        <div className="flex gap-3">
          <Button
            variant={locale === 'zh-CN' ? 'primary' : 'outline'}
            onClick={() => switchLocale('zh-CN')}
          >
            中文
          </Button>
          <Button
            variant={locale === 'en-US' ? 'primary' : 'outline'}
            onClick={() => switchLocale('en-US')}
          >
            English
          </Button>
        </div>
      </div>
    </div>
  );
}
