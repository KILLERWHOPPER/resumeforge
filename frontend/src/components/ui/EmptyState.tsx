"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "./Button";

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
    variant?: "primary" | "secondary" | "ghost";
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
  illustration?: "default" | "search" | "folder" | "document" | "user" | "settings";
}

const illustrations = {
  default: (
    <svg className="h-12 w-12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <line x1="9" y1="9" x2="15" y2="15" />
      <line x1="15" y1="9" x2="9" y2="15" />
    </svg>
  ),
  search: (
    <svg className="h-12 w-12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
      <line x1="8" y1="11" x2="14" y2="11" />
    </svg>
  ),
  folder: (
    <svg className="h-12 w-12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z" />
    </svg>
  ),
  document: (
    <svg className="h-12 w-12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <line x1="10" y1="9" x2="8" y2="9" />
    </svg>
  ),
  user: (
    <svg className="h-12 w-12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  ),
  settings: (
    <svg className="h-12 w-12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  ),
};

export function EmptyState({
  icon,
  title,
  description,
  action,
  secondaryAction,
  className,
  illustration = "default",
}: EmptyStateProps) {
  const defaultIcon = illustrations[illustration];

  return (
    <div
      className={cn(
        "empty-state flex flex-col items-center justify-center py-12 px-4 text-center",
        "border-2 border-dashed border-border-light dark:border-border-dark rounded-xl",
        "bg-background-secondary dark:bg-background-tertiary",
        className
      )}
    >
      {icon || defaultIcon && (
        <div className="empty-state-icon text-text-tertiary dark:text-text-tertiary mb-4">
          {icon || defaultIcon}
        </div>
      )}
      <h3 className="empty-state-title text-lg font-semibold text-text-primary dark:text-text-inverse mb-2">
        {title}
      </h3>
      {description && (
        <p className="empty-state-description text-sm text-text-secondary dark:text-text-secondary mb-6 max-w-sm">
          {description}
        </p>
      )}
      {(action || secondaryAction) && (
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 w-full max-w-xs">
          {action && (
            <Button
              variant={action.variant || "primary"}
              onClick={action.onClick}
              className="w-full sm:w-auto"
            >
              {action.label}
            </Button>
          )}
          {secondaryAction && (
            <Button variant="ghost" onClick={secondaryAction.onClick} className="w-full sm:w-auto">
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

// Specialized empty states for common use cases
export function EmptyExperiences({
  type,
  onAdd,
}: {
  type: "education" | "work" | "project" | "skill" | "certificate";
  onAdd: () => void;
}) {
  const configs = {
    education: {
      title: "暂无教育经历",
      description: "添加您的第一条教育经历，丰富简历内容",
      actionLabel: "添加教育经历",
      illustration: "document" as const,
    },
    work: {
      title: "暂无工作经历",
      description: "添加您的第一条工作经历，展示职业历程",
      actionLabel: "添加工作经历",
      illustration: "folder" as const,
    },
    project: {
      title: "暂无项目经历",
      description: "添加您的第一个项目经历，突出技术实力",
      actionLabel: "添加项目经历",
      illustration: "document" as const,
    },
    skill: {
      title: "暂无技能",
      description: "添加您的核心技能，让 HR 一眼看到您的优势",
      actionLabel: "添加技能",
      illustration: "search" as const,
    },
    certificate: {
      title: "暂无证书",
      description: "添加您的证书资质，增加简历可信度",
      actionLabel: "添加证书",
      illustration: "document" as const,
    },
  };

  const config = configs[type];

  return (
    <EmptyState
      illustration={config.illustration}
      title={config.title}
      description={config.description}
      action={{
        label: config.actionLabel,
        onClick: onAdd,
        variant: "primary",
      }}
    />
  );
}

export function EmptyResumes({ onCreate }: { onCreate: () => void }) {
  return (
    <EmptyState
      illustration="document"
      title="还没有简历"
      description="粘贴一个职位描述，AI 会帮你生成一份针对性的简历"
      action={{
        label: "创建第一份简历",
        onClick: onCreate,
        variant: "primary",
      }}
    />
  );
}

export function EmptyResumesGenerated({ onCreate }: { onCreate: () => void }) {
  return (
    <EmptyState
      illustration="search"
      title="暂无生成的简历"
      description="输入 JD 并配置 LLM 后，即可生成针对性简历"
      action={{
        label: "开始生成",
        onClick: onCreate,
        variant: "primary",
      }}
    />
  );
}

export function EmptyVersions({ onCreateFirst }: { onCreateFirst?: () => void }) {
  return (
    <EmptyState
      illustration="folder"
      title="暂无历史版本"
      description="每次生成或编辑简历后，会自动保存版本历史"
      action={onCreateFirst ? {
        label: "创建第一份简历",
        onClick: onCreateFirst,
        variant: "primary",
      } : undefined}
    />
  );
}

export function EmptySearch({ onClear }: { onClear?: () => void }) {
  return (
    <EmptyState
      illustration="search"
      title="未找到匹配结果"
      description="尝试调整搜索关键词或筛选条件"
      action={onClear ? {
        label: "清除筛选",
        onClick: onClear,
        variant: "ghost",
      } : undefined}
    />
  );
}

export function EmptyError({
  title = "出错了",
  description = "发生了一些意外错误，请稍后重试",
  onRetry,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
}) {
  return (
    <EmptyState
      illustration="default"
      title={title}
      description={description}
      action={onRetry ? {
        label: "重试",
        onClick: onRetry,
        variant: "primary",
      } : undefined}
    />
  );
}

export function EmptyNoPermission({
  title = "无权限访问",
  description = "您没有权限查看此内容，请联系管理员",
  onGoBack,
}: {
  title?: string;
  description?: string;
  onGoBack?: () => void;
}) {
  return (
    <EmptyState
      illustration="settings"
      title={title}
      description={description}
      action={onGoBack ? {
        label: "返回",
        onClick: onGoBack,
        variant: "primary",
      } : undefined}
    />
  );
}

export function EmptyOffline({ onRetry }: { onRetry?: () => void }) {
  return (
    <EmptyState
      illustration="settings"
      title="网络连接已断开"
      description="请检查网络连接后重试"
      action={onRetry ? {
        label: "重新连接",
        onClick: onRetry,
        variant: "primary",
      } : undefined}
    />
  );
}