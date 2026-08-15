'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useRouter } from '@/i18n/routing';
import { ChevronLeft, Download, FileText, Save } from 'lucide-react';
import { AppHeader } from '@/components/layout/AppHeader';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { useToast } from '@/components/ui/Toast';
import { ResumeEditor } from '@/components/resume/ResumeEditor';
import api, { getApiErrorMessage } from '@/lib/api';

interface Resume {
  id: number;
  company_name: string | null;
  target_language: string;
  status: string;
  created_at: string;
}

export default function ResumeEditPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const t = useTranslations('resume');
  const tCommon = useTranslations('common');
  const toast = useToast();

  const resumeId = params.id;
  const [resume, setResume] = useState<Resume | null>(null);
  const [content, setContent] = useState<Record<string, unknown> | null>(null);
  const [draft, setDraft] = useState<Record<string, unknown> | null>(null);
  const [version, setVersion] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [resumeRes, contentRes] = await Promise.all([
        api.get(`/resumes/${resumeId}`),
        api.get(`/resumes/${resumeId}/content`),
      ]);
      setResume(resumeRes.data);
      setContent(contentRes.data.content as Record<string, unknown> | null);
      setDraft(contentRes.data.content as Record<string, unknown> | null);
      setVersion(contentRes.data.version as number | null);
    } catch {
      toast.error(tCommon('error'), tCommon('networkError'));
    } finally {
      setLoading(false);
    }
  }, [resumeId, tCommon, toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSave = async () => {
    if (!draft || version === null) {
      toast.error(tCommon('error'), tCommon('networkError'));
      return;
    }
    setSaving(true);
    try {
      const { data } = await api.put(
        `/resumes/${resumeId}/content`,
        { content: draft },
        { headers: { 'If-Match': String(version) } }
      );
      setVersion(data.version as number);
      toast.success(t('editor.save'), t('editor.saved'));
    } catch (error) {
      toast.error(tCommon('error'), getApiErrorMessage(error, t('editor.saveFailed')));
    } finally {
      setSaving(false);
    }
  };

  const handleExport = async () => {
    if (version === null) return;
    setExporting(true);
    try {
      const { data } = await api.get(`/resumes/${resumeId}/export-pdf`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(data as Blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${resume?.company_name || 'resume'}-${resumeId}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success(t('editor.export'), t('editor.exported'));
    } catch (error) {
      toast.error(tCommon('error'), getApiErrorMessage(error, t('editor.exportFailed')));
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background-primary">
      <AppHeader activePrefix="/resumes" />

      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Link
              href={`/resumes/${resumeId}`}
              className="inline-flex items-center gap-1 text-sm text-text-secondary transition-colors hover:text-text-primary"
            >
              <ChevronLeft className="h-4 w-4" />
              {t('editor.backToResult')}
            </Link>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              loading={exporting}
              onClick={handleExport}
              disabled={version === null}
              icon={<Download className="h-4 w-4" />}
            >
              {t('editor.export')}
            </Button>
            <Button
              variant="primary"
              loading={saving}
              onClick={handleSave}
              disabled={version === null}
              icon={<Save className="h-4 w-4" />}
            >
              {t('editor.save')}
            </Button>
          </div>
        </div>

        <div className="mb-6">
          <h1 className="text-2xl font-bold text-text-primary">
            {resume?.company_name || t('jdInput.title')}
          </h1>
          <p className="mt-1 flex items-center gap-2 text-sm text-text-secondary">
            <FileText className="h-4 w-4" />
            {t('editor.title')}
            {version !== null && (
              <span>
                {t('result.version')} v{version}
              </span>
            )}
          </p>
        </div>

        {loading ? (
          <div className="space-y-4">
            <Skeleton variant="card" height={120} />
            <Skeleton variant="card" height={320} />
          </div>
        ) : !content ? (
          <EmptyState
            illustration="document"
            title={t('result.notGenerated')}
            description={t('result.notGeneratedDesc')}
            action={{
              label: t('generation.title'),
              onClick: () => router.push(`/resumes/new`),
            }}
          />
        ) : (
          <ResumeEditor key={version ?? 'empty'} content={content} onChange={setDraft} />
        )}
      </main>
    </div>
  );
}
