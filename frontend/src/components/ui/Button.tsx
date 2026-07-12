"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
  {
    variants: {
      variant: {
        primary:
          "btn-primary bg-interactive-primary-bg text-interactive-primary-text hover:bg-interactive-primary-bg-hover active:bg-interactive-primary-bg-active focus-visible:ring-primary-500 focus-visible:ring-offset-white dark:focus-visible:ring-offset-neutral-950",
        secondary:
          "btn-secondary bg-interactive-secondary-bg text-interactive-secondary-text border border-interactive-secondary-border hover:bg-interactive-secondary-bg-hover active:bg-interactive-secondary-bg-active focus-visible:ring-neutral-500 focus-visible:ring-offset-white dark:focus-visible:ring-offset-neutral-950",
        ghost:
          "btn-ghost text-interactive-ghost-text hover:bg-interactive-ghost-bg-hover active:bg-interactive-ghost-bg-active hover:text-interactive-ghost-text-hover focus-visible:ring-neutral-500 focus-visible:ring-offset-white dark:focus-visible:ring-offset-neutral-950",
        destructive:
          "btn-destructive bg-interactive-destructive-bg text-interactive-destructive-text hover:bg-interactive-destructive-bg-hover active:bg-interactive-destructive-bg-active focus-visible:ring-error-500 focus-visible:ring-offset-white dark:focus-visible:ring-offset-neutral-950",
        outline:
          "border border-interactive-secondary-border bg-transparent hover:bg-interactive-secondary-bg-hover text-interactive-secondary-text focus-visible:ring-neutral-500",
        link: "text-text-link hover:text-text-link-hover underline-offset-2 hover:underline focus-visible:ring-transparent",
      },
      size: {
        sm: "btn-sm h-8 px-3 text-xs",
        md: "btn-md h-10 px-4 text-sm",
        lg: "btn-lg h-12 px-6 text-base",
        xl: "btn-xl h-14 px-8 text-lg",
        icon: "btn-md h-10 w-10 p-0",
      },
      fullWidth: {
        true: "w-full",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
      fullWidth: false,
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: "left" | "right";
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      fullWidth,
      loading,
      disabled,
      icon,
      iconPosition = "left",
      children,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || loading;

    return (
      <button
        ref={ref}
        className={cn(buttonVariants({ variant, size, fullWidth, className }))}
        disabled={isDisabled}
        aria-busy={loading}
        aria-disabled={isDisabled}
        {...props}
      >
        {loading && (
          <svg
            className="animate-spin h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}
        {!loading && icon && iconPosition === "left" && (
          <span className="flex-shrink-0" aria-hidden="true">{icon}</span>
        )}
        <span>{children}</span>
        {!loading && icon && iconPosition === "right" && (
          <span className="flex-shrink-0" aria-hidden="true">{icon}</span>
        )}
      </button>
    );
  }
);

Button.displayName = "Button";

export { Button, buttonVariants };