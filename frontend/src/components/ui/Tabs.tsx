"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface TabsProps {
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  children: React.ReactNode;
  className?: string;
  orientation?: "horizontal" | "vertical";
  variant?: "line" | "enclosed" | "soft";
}

const TabsContext = React.createContext<{
  value: string;
  onValueChange: (value: string) => void;
  orientation: "horizontal" | "vertical";
  variant: "line" | "enclosed" | "soft";
} | null>(null);

function useTabsContext() {
  const context = React.useContext(TabsContext);
  if (!context) {
    throw new Error("Tabs components must be used within Tabs");
  }
  return context;
}

export function Tabs({
  defaultValue,
  value,
  onValueChange,
  children,
  className,
  orientation = "horizontal",
  variant = "line",
}: TabsProps) {
  const [controlledValue, setControlledValue] = React.useState(defaultValue || "");
  const isControlled = value !== undefined;
  const currentValue = isControlled ? value : controlledValue;

  const handleValueChange = React.useCallback(
    (newValue: string) => {
      if (!isControlled) {
        setControlledValue(newValue);
      }
      onValueChange?.(newValue);
    },
    [isControlled, onValueChange]
  );

  return (
    <TabsContext.Provider value={{ value: currentValue, onValueChange: handleValueChange, orientation, variant }}>
      <div
        className={cn(
          "tabs-root",
          orientation === "vertical" && "flex flex-col",
          orientation === "horizontal" && "flex flex-col",
          className
        )}
      >
        {children}
      </div>
    </TabsContext.Provider>
  );
}

interface TabsListProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  "aria-label"?: string;
}

export function TabsList({ children, className, "aria-label": ariaLabel, ...props }: TabsListProps) {
  const { orientation, variant } = useTabsContext();

  const baseStyles = cn(
    "inline-flex items-center gap-1 p-1 rounded-lg",
    variant === "line" && "bg-transparent",
    variant === "enclosed" && "bg-neutral-100 dark:bg-neutral-800",
    variant === "soft" && "bg-neutral-100 dark:bg-neutral-800",
    orientation === "horizontal" && "w-fit",
    orientation === "vertical" && "h-fit flex-col",
    className
  );

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={baseStyles}
      {...props}
    >
      {children}
    </div>
  );
}

interface TabsTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  value: string;
  disabled?: boolean;
  icon?: React.ReactNode;
}

export function TabsTrigger({
  value,
  disabled = false,
  icon,
  children,
  className,
  ...props
}: TabsTriggerProps) {
  const { value: currentValue, onValueChange, orientation, variant } = useTabsContext();
  const isActive = currentValue === value;

  const baseStyles = cn(
    "relative inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-md",
    "transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2",
    "disabled:opacity-50 disabled:cursor-not-allowed",
    "data-[state=active]:text-text-primary",
    variant === "line" && [
      "bg-transparent text-text-secondary hover:text-text-primary",
      "data-[state=active]:text-text-primary",
      "data-[state=active]:bg-transparent",
      "before:content-[''] before:absolute before:bottom-0 before:left-0 before:right-0 before:h-0.5 before:bg-primary-600 before:dark:bg-primary-400 before:scale-x-0 before:origin-center before:transition-transform before:duration-150",
      "data-[state=active]:before:scale-x-100",
    ],
    variant === "enclosed" && [
      "bg-transparent text-text-secondary hover:bg-neutral-200 dark:hover:bg-neutral-700 hover:text-text-primary",
      "data-[state=active]:bg-white data-[state=active]:dark:bg-neutral-900 data-[state=active]:shadow-sm data-[state=active]:text-text-primary",
    ],
    variant === "soft" && [
      "bg-transparent text-text-secondary hover:bg-neutral-200 dark:hover:bg-neutral-700 hover:text-text-primary",
      "data-[state=active]:bg-primary-100 data-[state=active]:dark:bg-primary-900/30 data-[state=active]:text-primary-700 data-[state=active]:dark:text-primary-300",
    ],
    orientation === "horizontal" && "w-auto",
    orientation === "vertical" && "w-full justify-start",
    className
  );

  return (
    <button
      role="tab"
      aria-selected={isActive}
      aria-controls={`tabs-panel-${value}`}
      id={`tabs-trigger-${value}`}
      data-state={isActive ? "active" : "inactive"}
      data-disabled={disabled}
      onClick={() => !disabled && onValueChange(value)}
      disabled={disabled}
      className={baseStyles}
      {...props}
    >
      {icon && <span className="flex-shrink-0" aria-hidden="true">{icon}</span>}
      {children}
    </button>
  );
}

interface TabsContentProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string;
  forceMount?: boolean;
}

export function TabsContent({
  value,
  forceMount = false,
  children,
  className,
  ...props
}: TabsContentProps) {
  const { value: currentValue } = useTabsContext();
  const isActive = currentValue === value;

  if (!forceMount && !isActive) {
    return null;
  }

  return (
    <div
      role="tabpanel"
      id={`tabs-panel-${value}`}
      aria-labelledby={`tabs-trigger-${value}`}
      data-state={isActive ? "active" : "inactive"}
      hidden={!isActive}
      className={cn(
        "mt-4",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2",
        "data-[state=active]:animate-fade-in",
        "data-[state=inactive]:hidden",
        className
      )}
      {...props}
    >
      {isActive && children}
    </div>
  );
}

// Export all components as a compound component
Tabs.List = TabsList;
Tabs.Trigger = TabsTrigger;
Tabs.Content = TabsContent;

// Alternative: simpler Tabs API for common use cases
export interface SimpleTabsProps {
  tabs: Array<{
    value: string;
    label: string;
    icon?: React.ReactNode;
    disabled?: boolean;
  }>;
  activeTab: string;
  onChange: (value: string) => void;
  children: (activeTab: string) => React.ReactNode;
  className?: string;
  variant?: "line" | "enclosed" | "soft";
  orientation?: "horizontal" | "vertical";
}

export function SimpleTabs({
  tabs,
  activeTab,
  onChange,
  children,
  className,
  variant = "line",
  orientation = "horizontal",
}: SimpleTabsProps) {
  return (
    <Tabs value={activeTab} onValueChange={onChange} variant={variant} orientation={orientation} className={className}>
      <TabsList aria-label="Tabs">
        {tabs.map((tab) => (
          <TabsTrigger key={tab.value} value={tab.value} disabled={tab.disabled}>
            {tab.icon && <span className="flex-shrink-0" aria-hidden="true">{tab.icon}</span>}
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>
      <TabsContent value={activeTab} forceMount>
        {children(activeTab)}
      </TabsContent>
    </Tabs>
  );
}