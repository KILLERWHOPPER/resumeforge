"use client";

import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Modal } from "./Modal";

interface ToastProps {
  title: string;
  description?: string;
  variant?: "default" | "success" | "error" | "warning" | "info";
  action?: {
    label: string;
    onClick: () => void;
  };
  duration?: number;
  onClose?: () => void;
}

const toastVariants = {
  default: "bg-toast-info:bg border-toast-info:border text-toast-info:text",
  success: "bg-toast-success:bg border-toast-success:border text-toast-success:text",
  error: "bg-toast-error:bg border-toast-error:border text-toast-error:text",
  warning: "bg-toast-warning:bg border-toast-warning:border text-toast-warning:text",
  info: "bg-toast-info:bg border-toast-info:border text-toast-info:text",
};

const iconVariants = {
  default: "text-toast-info:icon",
  success: "text-toast-success:icon",
  error: "text-toast-error:icon",
  warning: "text-toast-warning:icon",
  info: "text-toast-info:icon",
};

const icons = {
  default: (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4" />
      <path d="M12 8h.01" />
    </svg>
  ),
  success: (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  ),
  error: (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <circle cx="12" cy="12" r="10" />
      <line x1="15" y1="9" x2="9" y2="15" />
      <line x1="9" y1="9" x2="15" y2="15" />
    </svg>
  ),
  warning: (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  ),
  info: (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  ),
};

export function Toast({
  title,
  description,
  variant = "default",
  action,
  duration = 5000,
  onClose,
}: ToastProps) {
  const [isVisible, setIsVisible] = React.useState(true);
  const [isExiting, setIsExiting] = React.useState(false);

  React.useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        setIsExiting(true);
        setTimeout(() => {
          setIsVisible(false);
          onClose?.();
        }, 200);
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  if (!isVisible) return null;

  return (
    <div
      className={cn(
        "toast-base flex items-start gap-3 min-w-[280px] max-w-[480px] rounded-lg border p-4 shadow-lg",
        toastVariants[variant],
        isExiting && "animate-scale-out"
      )}
      role="alert"
      aria-live="polite"
    >
      <div className={cn("flex-shrink-0 mt-0.5", iconVariants[variant])} aria-hidden="true">
        {icons[variant]}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{title}</p>
        {description && (
          <p className="mt-1 text-sm opacity-90">{description}</p>
        )}
      </div>
      <div className="flex flex-col items-end gap-2">
        {action && (
          <button
            onClick={action.onClick}
            className="text-sm font-medium underline hover:no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
          >
            {action.label}
          </button>
        )}
        <button
          onClick={() => {
            setIsExiting(true);
            setTimeout(() => {
              setIsVisible(false);
              onClose?.();
            }, 200);
          }}
          className="flex-shrink-0 p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
          aria-label="关闭"
        >
          <X className="h-4 w-4 opacity-50 hover:opacity-100" />
        </button>
      </div>
    </div>
  );
}

// Toast container for managing multiple toasts
interface ToastContainerProps {
  toasts: ToastProps[];
  onRemove: (index: number) => void;
  position?: "top-right" | "top-left" | "bottom-right" | "bottom-left" | "top-center" | "bottom-center";
}

const positionStyles = {
  "top-right": "top-4 right-4",
  "top-left": "top-4 left-4",
  "bottom-right": "bottom-4 right-4",
  "bottom-left": "bottom-4 left-4",
  "top-center": "top-4 left-1/2 -translate-x-1/2",
  "bottom-center": "bottom-4 left-1/2 -translate-x-1/2",
};

export function ToastContainer({
  toasts,
  onRemove,
  position = "top-right",
}: ToastContainerProps) {
  return (
    <div
      className={cn(
        "fixed z-[1700] flex flex-col gap-2 pointer-events-none",
        positionStyles[position]
      )}
      aria-live="polite"
      aria-atomic="true"
    >
      {toasts.map((toast, index) => (
        <div key={index} className="pointer-events-auto w-full max-w-sm">
          <Toast {...toast} onClose={() => onRemove(index)} />
        </div>
      ))}
    </div>
  );
}

// Hook for using toasts
interface ToastContextValue {
  toasts: ToastProps[];
  addToast: (toast: ToastProps) => void;
  removeToast: (index: number) => void;
  clearToasts: () => void;
  success: (title: string, description?: string, options?: Partial<ToastProps>) => void;
  error: (title: string, description?: string, options?: Partial<ToastProps>) => void;
  warning: (title: string, description?: string, options?: Partial<ToastProps>) => void;
  info: (title: string, description?: string, options?: Partial<ToastProps>) => void;
}

const ToastContext = React.createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToastProps[]>([]);

  const addToast = React.useCallback((toast: ToastProps) => {
    setToasts((prev) => [...prev, toast]);
  }, []);

  const removeToast = React.useCallback((index: number) => {
    setToasts((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const clearToasts = React.useCallback(() => {
    setToasts([]);
  }, []);

  const success = React.useCallback((title: string, description?: string, options?: Partial<ToastProps>) => {
    addToast({ title, description, variant: "success", ...options });
  }, []);

  const error = React.useCallback((title: string, description?: string, options?: Partial<ToastProps>) => {
    addToast({ title, description, variant: "error", ...options });
  }, []);

  const warning = React.useCallback((title: string, description?: string, options?: Partial<ToastProps>) => {
    addToast({ title, description, variant: "warning", ...options });
  }, []);

  const info = React.useCallback((title: string, description?: string, options?: Partial<ToastProps>) => {
    addToast({ title, description, variant: "info", ...options });
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast, clearToasts, success, error, warning, info }}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = React.useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}

// Convenience functions
export const toast = {
  success: (title: string, description?: string, options?: Partial<ToastProps>) =>
    ({ title, description, variant: "success", ...options } as ToastProps),
  error: (title: string, description?: string, options?: Partial<ToastProps>) =>
    ({ title, description, variant: "error", ...options } as ToastProps),
  warning: (title: string, description?: string, options?: Partial<ToastProps>) =>
    ({ title, description, variant: "warning", ...options } as ToastProps),
  info: (title: string, description?: string, options?: Partial<ToastProps>) =>
    ({ title, description, variant: "info", ...options } as ToastProps),
  default: (title: string, description?: string, options?: Partial<ToastProps>) =>
    ({ title, description, variant: "default", ...options } as ToastProps),
};