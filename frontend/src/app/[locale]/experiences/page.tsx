"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { Plus, GraduationCap, Briefcase, FolderKanban, Code, Award, Edit, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Modal } from "@/components/ui/Modal";
import { EmptyState } from "@/components/ui/EmptyState";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/Tabs";
import { Skeleton } from "@/components/ui/Skeleton";
import { ToastProvider, useToast } from "@/components/ui/Toast";
import api from "@/lib/api";

type ExperienceType = "education" | "work" | "project" | "skill" | "certificate";

interface Experience {
  id: number;
  type: ExperienceType;
  sort_order: number;
  created_at: string;
  updated_at: string;
  school?: string;
  degree?: string;
  field_of_study?: string;
  gpa?: string;
  company?: string;
  position?: string;
  start_date?: string;
  end_date?: string;
  description?: string;
  role?: string;
  tech_tags?: string[];
  url?: string;
  name?: string;
  category?: string;
  proficiency?: string;
  issuer?: string;
  credential_url?: string;
}

const typeConfig: Record<ExperienceType, { label: string; icon: React.ReactNode; emptyTitle: string; emptyDesc: string }> = {
  education: { label: "教育经历", icon: <GraduationCap className="h-5 w-5" />, emptyTitle: "暂无教育经历", emptyDesc: "添加您的第一条教育经历，丰富简历内容" },
  work: { label: "工作经历", icon: <Briefcase className="h-5 w-5" />, emptyTitle: "暂无工作经历", emptyDesc: "添加您的第一条工作经历，展示职业历程" },
  project: { label: "项目经历", icon: <FolderKanban className="h-5 w-5" />, emptyTitle: "暂无项目经历", emptyDesc: "添加您的第一个项目经历，突出技术实力" },
  skill: { label: "技能", icon: <Code className="h-5 w-5" />, emptyTitle: "暂无技能", emptyDesc: "添加您的核心技能，让 HR 一眼看到您的优势" },
  certificate: { label: "证书", icon: <Award className="h-5 w-5" />, emptyTitle: "暂无证书", emptyDesc: "添加您的证书资质，增加简历可信度" },
};

const proficiencyOptions = [
  { value: "beginner", label: "入门" },
  { value: "intermediate", label: "熟练" },
  { value: "advanced", label: "精通" },
  { value: "expert", label: "专家" },
];

const skillCategories = [
  { value: "language", label: "编程语言" },
  { value: "framework", label: "框架/库" },
  { value: "tool", label: "工具/平台" },
  { value: "database", label: "数据库" },
  { value: "cloud", label: "云服务" },
  { value: "other", label: "其他" },
];

export default function ExperiencesPage() {
  const router = useRouter();
  const pathname = usePathname();
  const locale = pathname.split("/")[1];
  const t = useTranslations("experiences");
  const tCommon = useTranslations("common");
  const toast = useToast();

  const [activeTab, setActiveTab] = useState<ExperienceType>("education");
  const [experiences, setExperiences] = useState<Record<ExperienceType, Experience[]>>({
    education: [],
    work: [],
    project: [],
    skill: [],
    certificate: [],
  });
  const [loading, setLoading] = useState<Record<ExperienceType, boolean>>({
    education: true,
    work: true,
    project: true,
    skill: true,
    certificate: true,
  });
  const [modalOpen, setModalOpen] = useState(false);
  const [editingExperience, setEditingExperience] = useState<Experience | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<Partial<Experience>>({});
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Fetch experiences for a type
  const fetchExperiences = async (type: ExperienceType) => {
    setLoading(prev => ({ ...prev, [type]: true }));
    try {
      const { data } = await api.get(`/experiences/`, { params: { type } });
      setExperiences(prev => ({ ...prev, [type]: data }));
    } catch (error) {
      console.error(`Failed to fetch ${type}:`, error);
      toast.error(tCommon("error"), tCommon("networkError"));
    } finally {
      setLoading(prev => ({ ...prev, [type]: false }));
    }
  };

  useEffect(() => {
    fetchExperiences(activeTab);
  }, [activeTab]);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormErrors({});

    // Validation
    const errors: Record<string, string> = {};
    if (activeTab === "education" && !formData.school) errors.school = t("education.school") + " " + tCommon("required");
    if (activeTab === "work" && !formData.company) errors.company = t("work.company") + " " + tCommon("required");
    if (activeTab === "project" && !formData.name) errors.name = t("project.name") + " " + tCommon("required");
    if (activeTab === "skill" && !formData.name) errors.name = t("skill.name") + " " + tCommon("required");
    if (activeTab === "certificate" && !formData.name) errors.name = t("certificate.name") + " " + tCommon("required");

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    try {
      const endpoint = editingExperience ? `/experiences/${editingExperience.id}` : `/experiences/`;
      const method = editingExperience ? "put" : "post";
      await api[method](endpoint, { ...formData, type: activeTab });

      toast.success(tCommon("success"), t(`toast.${editingExperience ? "updated" : "created"}`));
      setModalOpen(false);
      fetchExperiences(activeTab);
    } catch (error: any) {
      toast.error(tCommon("error"), error.response?.data?.detail || tCommon("networkError"));
    }
  };

  const handleEdit = (exp: Experience) => {
    setEditingExperience(exp);
    setFormData(exp);
    setModalOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    try {
      await api.delete(`/experiences/${deletingId}`);
      toast.success(tCommon("success"), t("toast.deleted"));
      fetchExperiences(activeTab);
    } catch (error) {
      toast.error(tCommon("error"), tCommon("networkError"));
    } finally {
      setDeletingId(null);
    }
  };

  const openCreateModal = () => {
    setEditingExperience(null);
    setFormData({ type: activeTab });
    setFormErrors({});
    setModalOpen(true);
  };

  const renderFormFields = () => {
    const config = typeConfig[activeTab];
    const commonFields = (
      <>
        <Input
          label={t(`${activeTab}.startDate`)}
          type="date"
          value={formData.start_date || ""}
          onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
        />
        <Input
          label={t(`${activeTab}.endDate`)}
          type="date"
          value={formData.end_date || ""}
          onChange={(e) => setFormData(prev => ({ ...prev, end_date: e.target.value }))}
        />
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="current"
            checked={formData.end_date === "present" || formData.end_date === "current"}
            onChange={(e) => setFormData(prev => ({ ...prev, end_date: e.target.checked ? "present" : "" }))}
            className="h-4 w-4 rounded border-border-medium"
          />
          <label htmlFor="current" className="text-sm text-text-secondary">{t(`${activeTab}.current`)}</label>
        </div>
      </>
    );

    switch (activeTab) {
      case "education":
        return (
          <>
            <Input
              label={t("education.school")}
              value={formData.school || ""}
              onChange={(e) => setFormData(prev => ({ ...prev, school: e.target.value }))}
              placeholder={t("education.schoolPlaceholder")}
              required
              error={formErrors.school}
            />
            <Input
              label={t("education.degree")}
              value={formData.degree || ""}
              onChange={(e) => setFormData(prev => ({ ...prev, degree: e.target.value }))}
              placeholder={t("education.degreePlaceholder")}
            />
            <Input
              label={t("education.fieldOfStudy")}
              value={formData.field_of_study || ""}
              onChange={(e) => setFormData(prev => ({ ...prev, field_of_study: e.target.value }))}
              placeholder={t("education.fieldOfStudyPlaceholder")}
            />
            <Input
              label={t("education.gpa")}
              value={formData.gpa || ""}
              onChange={(e) => setFormData(prev => ({ ...prev, gpa: e.target.value }))}
              placeholder={t("education.gpaPlaceholder")}
            />
            {commonFields}
            <div className="space-y-2">
              <label className="label-base">{t("education.description")} <span className="text-text-tertiary">({tCommon("optional")})</span></label>
              <textarea
                value={formData.description || ""}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                rows={4}
                className="input-base min-h-[100px]"
                placeholder={t("education.descriptionPlaceholder")}
              />
            </div>
          </>
        );

      case "work":
        return (
          <>
            <Input
              label={t("work.company")}
              value={formData.company || ""}
              onChange={(e) => setFormData(prev => ({ ...prev, company: e.target.value }))}
              placeholder={t("work.companyPlaceholder")}
              required
              error={formErrors.company}
            />
            <Input
              label={t("work.position")}
              value={formData.position || ""}
              onChange={(e) => setFormData(prev => ({ ...prev, position: e.target.value }))}
              placeholder={t("work.positionPlaceholder")}
            />
            {commonFields}
            <div className="space-y-2">
              <label className="label-base">{t("work.description")} <span className="text-text-tertiary">({tCommon("optional")})</span></label>
              <textarea
                value={formData.description || ""}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                rows={5}
                className="input-base min-h-[120px]"
                placeholder={t("work.descriptionPlaceholder")}
              />
            </div>
          </>
        );

      case "project":
        return (
          <>
            <Input
              label={t("project.name")}
              value={formData.name || ""}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder={t("project.namePlaceholder")}
              required
              error={formErrors.name}
            />
            <Input
              label={t("project.role")}
              value={formData.role || ""}
              onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value }))}
              placeholder={t("project.rolePlaceholder")}
            />
            {commonFields}
            <div className="space-y-2">
              <label className="label-base">{t("project.description")} <span className="text-text-tertiary">({tCommon("optional")})</span></label>
              <textarea
                value={formData.description || ""}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                rows={5}
                className="input-base min-h-[120px]"
                placeholder={t("project.descriptionPlaceholder")}
              />
            </div>
            <div className="space-y-2">
              <label className="label-base">{t("project.techTags")} <span className="text-text-tertiary">({tCommon("optional")})</span></label>
              <TechTagsInput
                value={formData.tech_tags || []}
                onChange={(tags) => setFormData(prev => ({ ...prev, tech_tags: tags }))}
              />
            </div>
            <Input
              label={t("project.url")}
              type="url"
              value={formData.url || ""}
              onChange={(e) => setFormData(prev => ({ ...prev, url: e.target.value }))}
              placeholder={t("project.urlPlaceholder")}
            />
          </>
        );

      case "skill":
        return (
          <>
            <Input
              label={t("skill.name")}
              value={formData.name || ""}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder={t("skill.namePlaceholder")}
              required
              error={formErrors.name}
            />
            <Select
              label={t("skill.category")}
              value={formData.category || ""}
              onChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
              options={skillCategories.map(c => ({ value: c.value, label: c.label }))}
              placeholder={t("skill.category")}
            />
            <Select
              label={t("skill.proficiency")}
              value={formData.proficiency || ""}
              onChange={(value) => setFormData(prev => ({ ...prev, proficiency: value }))}
              options={proficiencyOptions.map(p => ({ value: p.value, label: p.label }))}
              placeholder={t("skill.proficiency")}
            />
          </>
        );

      case "certificate":
        return (
          <>
            <Input
              label={t("certificate.name")}
              value={formData.name || ""}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder={t("certificate.namePlaceholder")}
              required
              error={formErrors.name}
            />
            <Input
              label={t("certificate.issuer")}
              value={formData.issuer || ""}
              onChange={(e) => setFormData(prev => ({ ...prev, issuer: e.target.value }))}
              placeholder={t("certificate.issuerPlaceholder")}
            />
            <Input
              label={t("certificate.date")}
              type="date"
              value={formData.start_date || ""}
              onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
            />
            <Input
              label={t("certificate.credentialUrl")}
              type="url"
              value={formData.credential_url || ""}
              onChange={(e) => setFormData(prev => ({ ...prev, credential_url: e.target.value }))}
              placeholder={t("certificate.credentialUrlPlaceholder")}
            />
          </>
        );

      default:
        return null;
    }
  };

  const renderExperienceCard = (exp: Experience) => {
    const config = typeConfig[activeTab];

    return (
      <div key={exp.id} className="card-base p-5 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400">
                {config.icon}
              </span>
              <h4 className="font-semibold text-text-primary truncate">
                {activeTab === "education" ? exp.school : activeTab === "work" ? exp.company : activeTab === "project" ? exp.name : activeTab === "skill" ? exp.name : exp.name}
              </h4>
            </div>

            {activeTab === "education" && exp.degree && (
              <p className="text-sm text-text-secondary">{exp.degree}{exp.field_of_study ? ` · ${exp.field_of_study}` : ""}</p>
            )}
            {activeTab === "work" && exp.position && (
              <p className="text-sm text-text-secondary">{exp.position}</p>
            )}
            {activeTab === "project" && exp.role && (
              <p className="text-sm text-text-secondary">{t("project.role")}: {exp.role}</p>
            )}
            {activeTab === "skill" && (
              <div className="flex flex-wrap gap-1.5 mt-1">
                {exp.category && <span className="badge-primary text-xs">{exp.category}</span>}
                {exp.proficiency && <span className="badge-info text-xs">{proficiencyOptions.find(p => p.value === exp.proficiency)?.label}</span>}
              </div>
            )}
            {activeTab === "certificate" && exp.issuer && (
              <p className="text-sm text-text-secondary">{t("certificate.issuer")}: {exp.issuer}</p>
            )}

            <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-text-tertiary">
              {exp.start_date && (
                <span>
                  {new Date(exp.start_date).toLocaleDateString(locale === "zh-CN" ? "zh-CN" : "en-US", { year: "numeric", month: "short" })}
                  {exp.end_date ? ` - ${exp.end_date === "present" || exp.end_date === "current" ? t(`${activeTab}.current`) : new Date(exp.end_date).toLocaleDateString(locale === "zh-CN" ? "zh-CN" : "en-US", { year: "numeric", month: "short" })}` : ""}
                </span>
              )}
            </div>

            {exp.description && (
              <p className="mt-3 text-sm text-text-secondary line-clamp-3">{exp.description}</p>
            )}

            {activeTab === "project" && exp.tech_tags && exp.tech_tags.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1">
                {exp.tech_tags.slice(0, 5).map((tag, i) => (
                  <span key={i} className="badge-default text-xs">{tag}</span>
                ))}
                {exp.tech_tags.length > 5 && <span className="badge-default text-xs">+{exp.tech_tags.length - 5}</span>}
              </div>
            )}

            {activeTab === "certificate" && exp.credential_url && (
              <a href={exp.credential_url} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs text-primary-600 hover:text-primary-500">
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                {t("certificate.viewCredential")}
              </a>
            )}
          </div>
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-border-light dark:border-border-dark">
            <Button variant="ghost" size="sm" onClick={() => handleEdit(exp)}>
              <Edit className="h-4 w-4 mr-1" /> {tCommon("edit")}
            </Button>
            <Button variant="ghost" size="sm" className="text-error-600 hover:text-error-700 hover:bg-error-50" onClick={() => setDeletingId(exp.id)}>
              <Trash2 className="h-4 w-4 mr-1" /> {tCommon("delete")}
            </Button>
          </div>
        )
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background-primary">
      <header className="sticky top-0 z-50 bg-white/80 dark:bg-neutral-950/80 backdrop-blur-sm border-b border-border-light dark:border-border-dark">
        <nav className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8" aria-label="Main navigation">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-8">
              <a href={`/${locale}/dashboard`} className="text-xl font-bold text-primary-600 dark:text-primary-400">
                ResumeForge
              </a>
              <div className="hidden md:flex md:items-center md:gap-6">
                <a href={`/${locale}/dashboard`} className="text-sm font-medium text-text-secondary hover:text-text-primary">
                  {tCommon("dashboard") || "Dashboard"}
                </a>
                <a href={`/${locale}/experiences`} className="text-sm font-medium text-primary-600 dark:text-primary-400">
                  {t("title")}
                </a>
                <a href={`/${locale}/settings`} className="text-sm font-medium text-text-secondary hover:text-text-primary">
                  {tCommon("settings")}
                </a>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <a href={`/${locale}/dashboard`} className="hidden sm:block">
                <Button variant="ghost" size="sm">
                  ← {tCommon("back") || "返回"}
                </Button>
              </a>
              <Button variant="primary" onClick={openCreateModal}>
                <Plus className="h-4 w-4 mr-1" /> {tCommon("add")} {typeConfig[activeTab].label}
              </Button>
            </div>
          </div>
        </nav>
      </header>

      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
          <TabsList aria-label="Experience types">
            {(["education", "work", "project", "skill", "certificate"] as ExperienceType[]).map((type) => (
              <TabsTrigger key={type} value={type}>
                {typeConfig[type].icon}
                <span className="hidden sm:inline">{typeConfig[type].label}</span>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {/* Content */}
        <TabsContent value={activeTab} forceMount>
          {loading[activeTab] ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} variant="card" />
              ))}
            </div>
          ) : experiences[activeTab].length === 0 ? (
            <EmptyState
              illustration={["education", "work", "project", "certificate"].includes(activeTab) ? "document" : "search"}
              title={typeConfig[activeTab].emptyTitle}
              description={typeConfig[activeTab].emptyDesc}
              action={{
                label: tCommon("add") + typeConfig[activeTab].label,
                onClick: openCreateModal,
              }}
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {experiences[activeTab].map(renderExperienceCard)}
            </div>
          )}
        </TabsContent>
      </main>

      {/* Create/Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingExperience ? t("form.editTitle", { type: typeConfig[activeTab].label }) : t("form.createTitle", { type: typeConfig[activeTab].label })}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          {renderFormFields()}
          <div className="flex justify-end gap-3 pt-4 border-t border-border-light dark:border-border-dark">
            <Button variant="ghost" onClick={() => setModalOpen(false)}>
              {tCommon("cancel")}
            </Button>
            <Button type="submit" variant="primary">
              {editingExperience ? tCommon("update") : tCommon("create")}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deletingId}
        onClose={() => setDeletingId(null)}
        title={tCommon("confirmDelete") || "确认删除"}
        size="sm"
      >
        <p className="text-text-secondary mb-6">{t("actions.confirmDelete", { type: typeConfig[activeTab].label })}</p>
        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={() => setDeletingId(null)}>
            {tCommon("cancel")}
          </Button>
          <Button variant="destructive" onClick={handleDelete} loading={!!deletingId}>
            {tCommon("delete")}
          </Button>
        </div>
      </Modal>

      <ToastProvider />
    </div>
  );
}

// TechTagsInput component
function TechTagsInput({ value, onChange }: { value: string[]; onChange: (tags: string[]) => void }) {
  const [inputValue, setInputValue] = useState("");
  const [tags, setTags] = useState<string[]>(value);

  useEffect(() => {
    setTags(value);
  }, [value]);

  const addTag = () => {
    const tag = inputValue.trim();
    if (tag && !tags.includes(tag)) {
      const newTags = [...tags, tag];
      setTags(newTags);
      onChange(newTags);
      setInputValue("");
    }
  };

  const removeTag = (tag: string) => {
    const newTags = tags.filter(t => t !== tag);
    setTags(newTags);
    onChange(newTags);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag();
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      <div className="flex flex-wrap gap-1.5">
        {tags.map((tag) => (
          <span key={tag} className="inline-flex items-center gap-1 badge-default">
            {tag}
            <button
              type="button"
              onClick={() => removeTag(tag)}
              className="ml-1 p-0.5 hover:text-text-primary transition-colors"
              aria-label={`Remove ${tag}`}
            >
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </span>
        ))}
      </div>
      <input
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={addTag}
        placeholder="输入技术栈，按回车确认"
        className="flex-1 min-w-[150px] input-base py-2"
      />
    </div>
  );
}