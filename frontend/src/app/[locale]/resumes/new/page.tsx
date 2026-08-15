'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/routing';
import {
  ArrowRight,
  Loader2,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  ChevronLeft,
  Wand2,
  FileText,
} from 'lucide-react';
import { AppHeader } from '@/components/layout/AppHeader';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import api, { streamSSE } from '@/lib/api';

interface JDAnalysis {
  resume_id: number;
  core_responsibilities: string[];
  required_skills: string[];
  preferred_skills: string[];
  experience_level: string;
  soft_skills: string[];
  keywords: string[];
  created_at: string;
}

interface EffectiveProvider {
  source: 'custom' | 'opencode_free';
  name: string;
  model_name: string;
  base_url: string;
}

type Step = 'form' | 'analyzing' | 'analysis' | 'generating';

const GENERATION_STAGES = [
  { stage: 'preparing', labelKey: 'preparing' },
  { stage: 'analyzing', labelKey: 'analyzing' },
  { stage: 'matching', labelKey: 'matching' },
  { stage: 'writing', labelKey: 'writing' },
] as const;

export default function NewResumePage() {
  const router = useRouter();
  const t = useTranslations('resume');
  const tCommon = useTranslations('common');
  const toast = useToast();

  const [step, setStep] = useState<Step>('form');
  const [company, setCompany] = useState('');
  const [jdText, setJdText] = useState('');
  const [language, setLanguage] = useState('english');
  const [formErrors, setFormErrors] = useState<{ jd?: string }>({});

  const [resumeId, setResumeId] = useState<number | null>(null);
  const [analysis, setAnalysis] = useState<JDAnalysis | null>(null);
  const [provider, setProvider] = useState<EffectiveProvider | null>(null);
  const [experienceCounts, setExperienceCounts] = useState<Record<string, number> | null>(null);
  const [progressStage, setProgressStage] = useState<string>('preparing');
  const [progressText, setProgressText] = useState('');
  const [livePreview, setLivePreview] = useState('');

  const livePreviewRef = useRef('');
  const generationStartedRef = useRef(false);

  useEffect(() => {
    fetchProvider();
    fetchExperiences();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchProvider = async () => {
    try {
      const { data } = await api.get<EffectiveProvider>('/llm-configs/effective');
      setProvider(data);
    } catch {
      // global handler shows toast
    }
  };

  const fetchExperiences = async () => {
    try {
      const { data } = await api.get('/experiences/aggregate');
      const counts: Record<string, number> = {};
      for (const key of ['education', 'work', 'project', 'skill', 'certificate']) {
        counts[key] = (data[key] || []).length;
      }
      setExperienceCounts(counts);
    } catch {
      // ignore
    }
  };

  const handleSubmit = async () => {
    if (!jdText.trim()) {
      setFormErrors({ jd: t('jdInput.requirements.jdRequired') });
      return;
    }
    if (jdText.trim().length < 50) {
      setFormErrors({ jd: t('jdInput.requirements.jdMinLength') });
      return;
    }
    setFormErrors({});
    setStep('analyzing');

    try {
      const { data } = await api.post('/resumes/', {
        company_name: company.trim() || undefined,
        jd_text: jdText.trim(),
        target_language: language,
      });
      setResumeId(data.id);

      const { data: analysisData } = await api.post<JDAnalysis>(`/resumes/${data.id}/analyze-jd`);
      setAnalysis(analysisData);
      setStep('analysis');
    } catch {
      toast.error(tCommon('error'), tCommon('networkError'));
      setStep('form');
    }
  };

  const handleRegenerate = async () => {
    if (!resumeId) return;
    setStep('analyzing');
    try {
      const { data } = await api.post<JDAnalysis>(`/resumes/${resumeId}/analyze-jd`);
      setAnalysis(data);
      setStep('analysis');
    } catch {
      toast.error(tCommon('error'), tCommon('networkError'));
      setStep('analysis');
    }
  };

  const handleGenerate = async () => {
    if (!resumeId || generationStartedRef.current) return;
    generationStartedRef.current = true;
    setStep('generating');
    setProgressStage('preparing');
    setProgressText('');
    setLivePreview('');
    livePreviewRef.current = '';

    try {
      await streamSSE(`/api/v1/resumes/${resumeId}/generate`, {
        onEvent: (event, data) => {
          if (event === 'status') {
            const stage = String(data.stage || '');
            setProgressStage(stage);
            setProgressText(String(data.message || ''));
          } else if (event === 'chunk') {
            livePreviewRef.current += String(data.delta || '');
            setLivePreview(livePreviewRef.current);
          } else if (event === 'complete') {
            const version = data.version;
            toast.success(t('generation.complete'), t('generation.viewResult'));
            router.push(`/resumes/${resumeId}`);
          } else if (event === 'error') {
            toast.error(tCommon('error'), String(data.message || ''));
            setStep('analysis');
          }
        },
        onError: (err) => {
          toast.error(tCommon('error'), String(err.message));
          setStep('analysis');
        },
      });
    } catch {
      setStep('analysis');
    } finally {
      generationStartedRef.current = false;
    }
  };

  const progressPercent = () => {
    const idx = GENERATION_STAGES.findIndex((s) => s.stage === progressStage);
    if (idx < 0) return 20;
    return ((idx + 1) / GENERATION_STAGES.length) * 100;
  };

  const completenessWarning = () => {
    if (!experienceCounts) return null;
    const warnings: string[] = [];
    if ((experienceCounts.work || 0) === 0 && (experienceCounts.project || 0) === 0) {
      warnings.push(t('completeness.workMissing'));
    }
    if ((experienceCounts.education || 0) === 0) {
      warnings.push(t('completeness.educationMissing'));
    }
    if ((experienceCounts.skill || 0) === 0) {
      warnings.push(t('completeness.skillMissing'));
    }
    return warnings;
  };

  const renderAnalysisTag = (items: string[]) =>
    items.length > 0 ? (
      <div className="flex flex-wrap gap-2">
        {items.map((item, i) => (
          <span
            key={`${item}-${i}`}
            className="inline-flex items-center rounded-full bg-primary-50 px-2.5 py-1 text-xs font-medium text-primary-700 dark:bg-primary-900/30 dark:text-primary-400"
          >
            {item}
          </span>
        ))}
      </div>
    ) : (
      <p className="text-sm text-text-tertiary">—</p>
    );

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

        <div className="mb-6">
          <h1 className="text-2xl font-bold text-text-primary">{t('jdInput.title')}</h1>
          <p className="mt-1 text-sm text-text-secondary">{t('jdInput.subtitle')}</p>
        </div>

        {provider && (
          <div
            className={`mb-6 flex items-start gap-3 rounded-xl border p-4 text-sm ${
              provider.source === 'opencode_free'
                ? 'border-primary-200 bg-primary-50/50 dark:border-primary-800 dark:bg-primary-900/10'
                : 'border-border-light bg-background-secondary dark:border-border-dark'
            }`}
          >
            <Sparkles className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary-600 dark:text-primary-400" />
            <div>
              {provider.source === 'opencode_free' ? (
                <p className="text-text-secondary">{t('provider.defaultInfo')}</p>
              ) : (
                <p className="text-text-secondary">
                  {t('provider.customInfo', { name: provider.name })}
                </p>
              )}
              <Link
                href={`/settings?tab=llm`}
                className="mt-1 inline-block text-xs text-primary-600 hover:underline dark:text-primary-400"
              >
                {tCommon('settings')}
              </Link>
            </div>
          </div>
        )}

        {step === 'form' && (
          <div className="rounded-xl border border-border-light bg-white p-6 dark:border-border-dark dark:bg-neutral-900">
            <div className="grid gap-5">
              <div>
                <label className="text-text-label mb-1.5 block text-sm font-medium">
                  {t('jdInput.jdLabel')}
                  <span className="ml-1 text-error-500" aria-hidden="true">
                    *
                  </span>
                </label>
                <textarea
                  value={jdText}
                  onChange={(e) => setJdText(e.target.value)}
                  placeholder={t('jdInput.jdPlaceholder')}
                  rows={9}
                  aria-invalid={!!formErrors.jd}
                  className="hover:border-input-border-hover w-full rounded-lg border border-input-border bg-input-bg p-3 text-text-primary placeholder:text-input-placeholder focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-neutral-950"
                />
                {formErrors.jd && (
                  <p className="mt-1.5 text-sm text-error-600 dark:text-error-400" role="alert">
                    {formErrors.jd}
                  </p>
                )}
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <Input
                  label={t('jdInput.companyLabel')}
                  placeholder={t('jdInput.companyPlaceholder')}
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                />
                <Select
                  label={t('jdInput.languageLabel')}
                  value={language}
                  onChange={setLanguage}
                  options={[
                    { value: 'english', label: tCommon('english') },
                    { value: 'chinese', label: tCommon('chinese') },
                    { value: 'bilingual', label: tCommon('bilingual') },
                  ]}
                />
              </div>

              {experienceCounts && (
                <div className="flex items-start gap-3 rounded-lg border border-border-light bg-background-secondary p-4 dark:border-border-dark dark:bg-background-tertiary">
                  <FileText className="mt-0.5 h-4 w-4 flex-shrink-0 text-text-secondary" />
                  <div className="text-sm">
                    <p className="font-medium text-text-primary">{t('completeness.title')}</p>
                    <p className="mt-1 text-text-secondary">
                      {t('completeness.workCount', {
                        count: experienceCounts.work + experienceCounts.project,
                      })}{' '}
                      · {t('completeness.educationCount', { count: experienceCounts.education })} ·{' '}
                      {t('completeness.skillCount', { count: experienceCounts.skill })}
                    </p>
                    {completenessWarning()?.map((warn) => (
                      <p
                        key={warn}
                        className="mt-1 flex items-center gap-1.5 text-warning-600 dark:text-warning-400"
                      >
                        <AlertTriangle className="h-3.5 w-3.5" /> {warn}
                      </p>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end">
                <Button onClick={handleSubmit} size="lg" icon={<Wand2 className="h-4 w-4" />}>
                  {t('jdInput.generate')}
                </Button>
              </div>
            </div>
          </div>
        )}

        {step === 'analyzing' && (
          <div className="rounded-xl border border-border-light bg-white p-10 text-center dark:border-border-dark dark:bg-neutral-900">
            <Loader2 className="mx-auto mb-4 h-8 w-8 animate-spin text-primary-600 dark:text-primary-400" />
            <p className="font-medium text-text-primary">{t('jdInput.analyzing')}</p>
            <p className="mt-2 text-sm text-text-secondary">{t('generation.waiting')}</p>
            <div className="mx-auto mt-6 h-1.5 w-full max-w-md overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
              <div
                className="h-full animate-pulse rounded-full bg-primary-500"
                style={{ width: '60%' }}
              />
            </div>
          </div>
        )}

        {step === 'analysis' && analysis && (
          <div className="space-y-5">
            <div className="rounded-xl border border-border-light bg-white p-6 dark:border-border-dark dark:bg-neutral-900">
              <div className="mb-5 flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold text-text-primary">{t('jdAnalysis.title')}</h2>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={handleRegenerate}>
                    {t('jdAnalysis.regenerate')}
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleGenerate}
                    icon={<ArrowRight className="h-4 w-4" />}
                  >
                    {t('jdAnalysis.proceed')}
                  </Button>
                </div>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <p className="text-text-label mb-2 text-sm font-medium">
                    {t('jdAnalysis.coreResponsibilities')}
                  </p>
                  {renderAnalysisTag(analysis.core_responsibilities)}
                </div>
                <div>
                  <p className="text-text-label mb-2 text-sm font-medium">
                    {t('jdAnalysis.requiredSkills')}
                  </p>
                  {renderAnalysisTag(analysis.required_skills)}
                </div>
                <div>
                  <p className="text-text-label mb-2 text-sm font-medium">
                    {t('jdAnalysis.preferredSkills')}
                  </p>
                  {renderAnalysisTag(analysis.preferred_skills)}
                </div>
                <div>
                  <p className="text-text-label mb-2 text-sm font-medium">
                    {t('jdAnalysis.softSkills')}
                  </p>
                  {renderAnalysisTag(analysis.soft_skills)}
                </div>
                <div>
                  <p className="text-text-label mb-2 text-sm font-medium">
                    {t('jdAnalysis.experienceLevel')}
                  </p>
                  {analysis.experience_level ? (
                    <span className="inline-flex items-center rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-medium text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
                      {analysis.experience_level}
                    </span>
                  ) : (
                    <p className="text-sm text-text-tertiary">—</p>
                  )}
                </div>
                <div>
                  <p className="text-text-label mb-2 text-sm font-medium">
                    {t('jdAnalysis.keywords')}
                  </p>
                  {renderAnalysisTag(analysis.keywords)}
                </div>
              </div>
            </div>

            <div className="flex justify-center">
              <Button size="lg" onClick={handleGenerate} icon={<Sparkles className="h-4 w-4" />}>
                {t('generation.title')}
              </Button>
            </div>
          </div>
        )}

        {step === 'generating' && (
          <div className="rounded-xl border border-border-light bg-white p-8 dark:border-border-dark dark:bg-neutral-900">
            <div className="mb-6 flex items-center gap-3">
              <Loader2 className="h-6 w-6 animate-spin text-primary-600 dark:text-primary-400" />
              <div>
                <h2 className="text-lg font-semibold text-text-primary">{t('generation.title')}</h2>
                <p className="text-sm text-text-secondary">
                  {progressText || t('generation.waiting')}
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {GENERATION_STAGES.map(({ stage, labelKey }) => {
                const idx = GENERATION_STAGES.findIndex((s) => s.stage === stage);
                const curIdx = GENERATION_STAGES.findIndex((s) => s.stage === progressStage);
                const done = idx < curIdx || (stage === progressStage && stage !== 'preparing');
                const active = stage === progressStage;
                return (
                  <div
                    key={stage}
                    className={`flex items-center gap-3 text-sm ${
                      active
                        ? 'font-medium text-text-primary'
                        : done
                          ? 'text-text-secondary'
                          : 'text-text-tertiary'
                    }`}
                  >
                    {done ? (
                      <CheckCircle2 className="h-5 w-5 text-success-500" />
                    ) : active ? (
                      <Loader2 className="h-5 w-5 animate-spin text-primary-600" />
                    ) : (
                      <div className="h-5 w-5 rounded-full border-2 border-text-tertiary/30" />
                    )}
                    {t(`generation.steps.${labelKey}`)}
                  </div>
                );
              })}
            </div>

            <div className="mt-6 h-2 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
              <div
                className="h-full rounded-full bg-primary-500 transition-all duration-500"
                style={{ width: `${progressPercent()}%` }}
              />
            </div>

            {livePreview && (
              <div className="mt-6 max-h-48 overflow-auto rounded-lg border border-border-light bg-background-secondary p-4 dark:border-border-dark dark:bg-background-tertiary">
                <p className="mb-2 text-xs text-text-tertiary">{t('generation.livePreview')}</p>
                <p className="whitespace-pre-wrap text-sm text-text-secondary">
                  {livePreview.slice(0, 600)}
                  {livePreview.length > 600 ? '...' : ''}
                </p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
