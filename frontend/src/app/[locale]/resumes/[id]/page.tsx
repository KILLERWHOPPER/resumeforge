'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/routing';
import { ChevronLeft, Download, FileText, RotateCcw, Sparkles, Trash2 } from 'lucide-react';
import { AppHeader } from '@/components/layout/AppHeader';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { ConfirmModal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { VersionHistory, type ResumeVersion } from '@/components/resume/VersionHistory';
import api, { getApiErrorMessage, streamSSE } from '@/lib/api';

interface Resume {
  id: number;
  company_name: string | null;
  target_language: string;
  status: string;
  created_at: string;
}

interface ResumeContent {
  content: Record<string, unknown> | null;
  version: number | null;
}

interface PMNode {
  type: string;
  text?: string;
  attrs?: { level?: number };
  content?: PMNode[];
}

function renderInline(node: PMNode): React.ReactNode {
  if (node.type === 'text') return node.text || '';
  return '';
}

function renderNode(node: PMNode, key: number): React.ReactNode {
  switch (node.type) {
    case 'paragraph':
      return (
        <p key={key} className="text-sm leading-relaxed text-text-secondary">
          {node.content?.map((c, i) => renderInline(c))}
        </p>
      );
    case 'heading': {
      const level = node.attrs?.level || 2;
      const cls =
        level === 1
          ? 'text-xl font-bold text-text-primary'
          : level === 2
            ? 'text-lg font-semibold text-text-primary mt-6 mb-3'
            : 'text-base font-semibold text-text-primary mt-4 mb-2';
      return (
        <div key={key} className={cls}>
          {node.content?.map((c, i) => renderInline(c))}
        </div>
      );
    }
    case 'bulletList':
      return (
        <ul key={key} className="mb-4 space-y-1.5">
          {node.content?.map((li, i) => (
            <li key={i} className="flex gap-2 text-sm leading-relaxed text-text-secondary">
              <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-primary-500" />
              <span>
                {li.content?.map((child, j) =>
                  child.type === 'paragraph'
                    ? child.content?.map((c, k) => renderInline(c))
                    : renderInline(child)
                )}
              </span>
            </li>
          ))}
        </ul>
      );
    default:
      return null;
  }
}

export default function ResumeResultPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const t = useTranslations('resume');
  const tCommon = useTranslations('common');
  const toast = useToast();

  const resumeId = params.id;
  const [resume, setResume] = useState<Resume | null>(null);
  const [content, setContent] = useState<ResumeContent | null>(null);
  const [versions, setVersions] = useState<ResumeVersion[]>([]);
  const [viewingVersion, setViewingVersion] = useState<number | null>(null);
  const [previewContent, setPreviewContent] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [resumeRes, contentRes, versionsRes] = await Promise.all([
        api.get(`/resumes/${resumeId}`),
        api.get(`/resumes/${resumeId}/content`),
        api.get(`/resumes/${resumeId}/versions`),
      ]);
      setResume(resumeRes.data);
      setContent(contentRes.data);
      setVersions(versionsRes.data);
      setViewingVersion(null);
      setPreviewContent(null);
    } catch {
      toast.error(tCommon('error'), tCommon('networkError'));
    } finally {
      setLoading(false);
    }
  }, [resumeId, tCommon, toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRegenerate = async () => {
    setGenerating(true);
    try {
      await streamSSE(`/api/v1/resumes/${resumeId}/generate`, {
        onEvent: (event, data) => {
          if (event === 'complete') {
            toast.success(t('generation.complete'), t('generation.viewResult'));
            fetchData();
          } else if (event === 'error') {
            toast.error(tCommon('error'), String(data.message || ''));
          }
        },
        onError: (err) => {
          toast.error(tCommon('error'), String(err.message));
        },
      });
    } catch {
      toast.error(tCommon('error'), tCommon('networkError'));
    } finally {
      setGenerating(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await api.delete(`/resumes/${resumeId}`);
      toast.success(tCommon('success'), t('result.deleted'));
      router.push('/dashboard');
    } catch (error) {
      toast.error(tCommon('error'), getApiErrorMessage(error, tCommon('networkError')));
      setDeleteModalOpen(false);
    } finally {
      setDeleting(false);
    }
  };

  const handleExport = async () => {
    if (!content?.content) return;
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

  const handlePreviewVersion = async (versionNumber: number) => {
    if (versionNumber === viewingVersion) return;
    try {
      const { data } = await api.get(`/resumes/${resumeId}/versions/${versionNumber}/content`);
      setPreviewContent(data.content as Record<string, unknown> | null);
      setViewingVersion(versionNumber);
    } catch (error) {
      toast.error(tCommon('error'), getApiErrorMessage(error, tCommon('networkError')));
    }
  };

  const handleRestoreVersion = async (versionNumber: number) => {
    try {
      const { data } = await api.post(`/resumes/${resumeId}/versions/${versionNumber}/restore`);
      toast.success(t('versions.title'), t('versions.restored', { version: data.version }));
      await fetchData();
    } catch (error) {
      toast.error(tCommon('error'), getApiErrorMessage(error, tCommon('networkError')));
    }
  };

  const handleBranchVersion = async (versionNumber: number) => {
    try {
      const { data } = await api.post(`/resumes/${resumeId}/versions/${versionNumber}/branch`);
      toast.success(t('versions.title'), t('versions.branched'));
      router.push(`/resumes/${data.id}`);
    } catch (error) {
      toast.error(tCommon('error'), getApiErrorMessage(error, tCommon('networkError')));
    }
  };

  const doc = content?.content as PMNode | null;
  const displayedDoc = (
    viewingVersion !== null ? previewContent : content?.content
  ) as PMNode | null;

  return (
    <div className="min-h-screen bg-background-primary">
      <AppHeader activePrefix="/resumes" />

      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-center gap-3">
          <Link
            href={`/dashboard`}
            className="inline-flex items-center gap-1 text-sm text-text-secondary transition-colors hover:text-text-primary"
          >
            <ChevronLeft className="h-4 w-4" />
            {tCommon('back')}
          </Link>
        </div>

        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-text-primary">
              {resume?.company_name || t('jdInput.title')}
            </h1>
            {content?.version && (
              <p className="mt-1 text-sm text-text-secondary">
                {t('result.version')} v{content.version}
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              loading={generating}
              onClick={handleRegenerate}
              icon={<RotateCcw className="h-4 w-4" />}
            >
              {t('result.regenerate')}
            </Button>
            <Button
              variant="destructive"
              onClick={() => setDeleteModalOpen(true)}
              icon={<Trash2 className="h-4 w-4" />}
            >
              {tCommon('delete')}
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="space-y-4">
            <Skeleton variant="card" height={120} />
            <Skeleton variant="card" height={200} />
          </div>
        ) : !doc ? (
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
          <div className="grid gap-6 lg:grid-cols-[1fr_260px]">
            <div className="rounded-xl border border-border-light bg-white p-8 shadow-sm dark:border-border-dark dark:bg-neutral-900">
              {viewingVersion !== null && (
                <div className="mb-4 flex items-center justify-between gap-2 rounded-lg border border-primary-200 bg-primary-50 px-4 py-2.5 dark:border-primary-900/40 dark:bg-primary-900/10">
                  <p className="text-sm font-medium text-primary-700 dark:text-primary-300">
                    {t('versions.viewingBanner', { version: viewingVersion })}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setViewingVersion(null);
                      setPreviewContent(null);
                    }}
                    className="text-sm font-medium text-primary-600 transition-colors hover:text-primary-500 dark:text-primary-400"
                  >
                    {t('versions.viewCurrent')}
                  </button>
                </div>
              )}
              <div className="mx-auto max-w-[700px]">
                {displayedDoc?.content?.map((node, i) => renderNode(node, i))}
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-xl border border-border-light bg-white p-5 dark:border-border-dark dark:bg-neutral-900">
                <p className="mb-3 text-sm font-medium text-text-primary">{t('result.actions')}</p>
                <div className="flex flex-col gap-2">
                  <Button
                    variant="secondary"
                    fullWidth
                    onClick={() => router.push(`/resumes/${resumeId}/edit`)}
                    icon={<FileText className="h-4 w-4" />}
                  >
                    {t('editor.title')}
                  </Button>
                  <Button
                    variant="secondary"
                    fullWidth
                    loading={exporting}
                    onClick={handleExport}
                    icon={<Download className="h-4 w-4" />}
                  >
                    {t('editor.export')}
                  </Button>
                  <Button
                    fullWidth
                    onClick={() => router.push(`/resumes/new`)}
                    icon={<Sparkles className="h-4 w-4" />}
                  >
                    {t('generation.title')}
                  </Button>
                </div>
              </div>

              <VersionHistory
                versions={versions}
                viewingVersion={viewingVersion}
                onPreview={handlePreviewVersion}
                onRestore={handleRestoreVersion}
                onBranch={handleBranchVersion}
              />
            </div>
          </div>
        )}
      </main>

      <ConfirmModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleDelete}
        title={tCommon('confirmDelete')}
        message={t('result.deleteConfirm', { name: resume?.company_name || t('jdInput.title') })}
        confirmText={tCommon('delete')}
        loading={deleting}
      />
    </div>
  );
}
