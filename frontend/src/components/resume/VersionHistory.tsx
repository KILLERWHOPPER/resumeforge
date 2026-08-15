'use client';

import { useLocale, useTranslations } from 'next-intl';
import { Clock, Copy, Eye, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export interface ResumeVersion {
  version_number: number;
  created_at: string;
  is_current: boolean;
}

interface VersionHistoryProps {
  versions: ResumeVersion[];
  viewingVersion: number | null;
  onPreview: (versionNumber: number) => void;
  onRestore: (versionNumber: number) => void;
  onBranch: (versionNumber: number) => void;
}

function formatDate(iso: string, locale: string): string {
  try {
    return new Date(iso).toLocaleDateString(locale === 'zh-CN' ? 'zh-CN' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export function VersionHistory({
  versions,
  viewingVersion,
  onPreview,
  onRestore,
  onBranch,
}: VersionHistoryProps) {
  const t = useTranslations('resume.versions');
  const locale = useLocale();

  if (versions.length === 0) {
    return (
      <div className="rounded-xl border border-border-light bg-white p-5 dark:border-border-dark dark:bg-neutral-900">
        <p className="mb-3 flex items-center gap-2 text-sm font-medium text-text-primary">
          <Clock className="h-4 w-4" />
          {t('title')}
        </p>
        <p className="text-sm text-text-tertiary">{t('empty')}</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border-light bg-white p-5 dark:border-border-dark dark:bg-neutral-900">
      <p className="mb-3 flex items-center gap-2 text-sm font-medium text-text-primary">
        <Clock className="h-4 w-4" />
        {t('title')}
      </p>
      <ul className="space-y-2">
        {versions.map((v) => {
          const isViewing = viewingVersion === v.version_number;
          return (
            <li
              key={v.version_number}
              className={`rounded-lg border p-3 transition-colors ${
                v.is_current
                  ? 'border-primary-200 bg-primary-50/50 dark:border-primary-900/40 dark:bg-primary-900/10'
                  : isViewing
                    ? 'border-primary-300 bg-primary-50 dark:border-primary-800/60 dark:bg-primary-900/20'
                    : 'border-border-light dark:border-border-dark'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold text-text-primary">v{v.version_number}</span>
                {v.is_current ? (
                  <span className="badge-primary text-xs">{t('current')}</span>
                ) : isViewing ? (
                  <span className="badge-info text-xs">{t('actions.preview')}</span>
                ) : null}
              </div>
              <p className="mt-1 text-xs text-text-tertiary">{formatDate(v.created_at, locale)}</p>
              <div className="mt-2 flex gap-1.5">
                {!v.is_current && (
                  <>
                    <Button variant="ghost" size="sm" onClick={() => onPreview(v.version_number)}>
                      <Eye className="mr-1 h-3.5 w-3.5" />
                      {t('actions.preview')}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-primary-600 hover:bg-primary-50 dark:text-primary-400 dark:hover:bg-primary-900/20"
                      onClick={() => onRestore(v.version_number)}
                    >
                      <RotateCcw className="mr-1 h-3.5 w-3.5" />
                      {t('actions.restore')}
                    </Button>
                  </>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onBranch(v.version_number)}
                  title={t('actions.branch')}
                >
                  <Copy className="mr-1 h-3.5 w-3.5" />
                  {t('actions.branch')}
                </Button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
