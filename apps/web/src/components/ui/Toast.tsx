import React from 'react';
import { CheckCircle2, AlertCircle, Info, XCircle, X } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastMessage {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
}

export interface ToastProps {
  toast: ToastMessage;
  onDismiss: (id: string) => void;
}

export const ToastItem: React.FC<ToastProps> = ({ toast, onDismiss }) => {
  const iconMap = {
    success: <CheckCircle2 className="w-5 h-5 text-pharma-primary" />,
    error: <XCircle className="w-5 h-5 text-pharma-danger" />,
    warning: <AlertCircle className="w-5 h-5 text-pharma-warning" />,
    info: <Info className="w-5 h-5 text-pharma-text" />,
  };

  const borderMap = {
    success: 'border-l-4 border-l-pharma-primary',
    error: 'border-l-4 border-l-pharma-danger',
    warning: 'border-l-4 border-l-pharma-warning',
    info: 'border-l-4 border-l-pharma-muted',
  };

  return (
    <div
      className={twMerge(
        clsx(
          'w-full max-w-sm bg-pharma-white rounded-pharma shadow-pharma-lg p-3.5 border border-pharma-muted/20 flex items-start gap-3 transition-all',
          borderMap[toast.type]
        )
      )}
    >
      <div className="shrink-0 mt-0.5">{iconMap[toast.type]}</div>
      <div className="flex-1 min-w-0">
        <h4 className="text-xs font-semibold text-pharma-text">{toast.title}</h4>
        {toast.message && (
          <p className="text-xs text-pharma-muted mt-0.5 leading-relaxed">{toast.message}</p>
        )}
      </div>
      <button
        onClick={() => onDismiss(toast.id)}
        className="text-pharma-muted hover:text-pharma-text p-0.5 shrink-0"
        aria-label="Dismiss toast"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};
