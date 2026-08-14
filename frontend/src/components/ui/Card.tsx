"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "interactive" | "outlined" | "elevated";
  padding?: "none" | "sm" | "md" | "lg";
  hoverable?: boolean;
}

const paddingStyles = {
  none: "",
  sm: "p-4",
  md: "p-6",
  lg: "p-8",
};

const variantStyles = {
  default: "bg-card-bg border border-card-border rounded-xl shadow-sm",
  interactive: "bg-card-bg border border-card-border rounded-xl shadow-sm cursor-pointer transition-shadow duration-150 hover:shadow-lg",
  outlined: "bg-transparent border-2 border-border-medium rounded-xl",
  elevated: "bg-card-bg border border-card-border rounded-xl shadow-lg",
};

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  (
    {
      className,
      variant = "default",
      padding = "md",
      hoverable = false,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <div
        ref={ref}
        className={cn(
          variantStyles[variant],
          paddingStyles[padding],
          hoverable && variant === "default" && "hover:shadow-md transition-shadow duration-150 cursor-pointer",
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = "Card";

export const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, children, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("mb-4", className)}
    {...props}
  >
    {children}
  </div>
));

CardHeader.displayName = "CardHeader";

export const CardTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, children, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn("text-lg font-semibold text-text-primary", className)}
    {...props}
  >
    {children}
  </h3>
));

CardTitle.displayName = "CardTitle";

export const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, children, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("mt-1 text-sm text-text-secondary", className)}
    {...props}
  >
    {children}
  </p>
));

CardDescription.displayName = "CardDescription";

export const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, children, ...props }, ref) => (
  <div ref={ref} className={cn("", className)} {...props}>
    {children}
  </div>
));

CardContent.displayName = "CardContent";

export const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, children, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("mt-4 flex items-center gap-3", className)}
    {...props}
  >
    {children}
  </div>
));

CardFooter.displayName = "CardFooter";