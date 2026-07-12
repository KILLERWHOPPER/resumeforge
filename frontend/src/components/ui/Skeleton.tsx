"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "text" | "circular" | "rectangular" | "card";
  width?: string | number;
  height?: string | number;
  animation?: "pulse" | "wave" | "none";
}

const variantStyles = {
  text: "h-4 rounded",
  circular: "rounded-full",
  rectangular: "rounded-lg",
  card: "rounded-xl p-6 space-y-4",
};

const animationStyles = {
  pulse: "animate-pulse",
  wave: "animate-shimmer",
  none: "",
};

export function Skeleton({
  className,
  variant = "text",
  width,
  height,
  animation = "pulse",
  ...props
}: SkeletonProps) {
  return (
    <div
      className={cn(
        "bg-neutral-200 dark:bg-neutral-700",
        variantStyles[variant],
        animationStyles[animation],
        className
      )}
      style={{ width, height }}
      {...props}
      aria-hidden="true"
    />
  );
}

// Pre-built skeleton components for common patterns
export function SkeletonText({
  lines = 3,
  className,
  ...props
}: { lines?: number; className?: string } & Omit<SkeletonProps, "variant">) {
  return (
    <div className={cn("space-y-2", className)} {...props}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          variant="text"
          width={i === lines - 1 ? "60%" : "100%"}
        />
      ))}
    </div>
  );
}

export function SkeletonCard({ className, ...props }: { className?: string } & Omit<SkeletonProps, "variant">) {
  return (
    <div className={cn("space-y-4", className)} {...props}>
      <div className="flex items-center gap-4">
        <Skeleton variant="circular" width={48} height={48} />
        <div className="flex-1 space-y-2">
          <Skeleton variant="text" width="40%" />
          <Skeleton variant="text" width="30%" />
        </div>
      </div>
      <SkeletonText lines={3} />
    </div>
  );
}

export function SkeletonTable({
  rows = 5,
  columns = 4,
  className,
  ...props
}: { rows?: number; columns?: number; className?: string } & Omit<SkeletonProps, "variant">) {
  return (
    <div className={cn("space-y-3", className)} {...props}>
      {/* Header */}
      <div className="flex gap-4 px-4 py-3 font-medium text-text-secondary border-b border-border-light">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} variant="text" width="100%" height={16} className="flex-1" />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex gap-4 px-4 py-3 border-b border-border-light">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton
              key={colIndex}
              variant="text"
              width="100%"
              height={16}
              className="flex-1"
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export function SkeletonList({
  items = 5,
  className,
  ...props
}: { items?: number; className?: string } & Omit<SkeletonProps, "variant">) {
  return (
    <div className={cn("space-y-4", className)} {...props}>
      {Array.from({ length: items }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

export function SkeletonForm({
  fields = 4,
  className,
  ...props
}: { fields?: number; className?: string } & Omit<SkeletonProps, "variant">) {
  return (
    <div className={cn("space-y-6", className)} {...props}>
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton variant="text" width="20%" height={16} />
          <Skeleton variant="rectangular" width="100%" height={44} />
        </div>
      ))}
    </div>
  );
}