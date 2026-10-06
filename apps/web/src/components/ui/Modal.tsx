import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  maxWidth = 'md',
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const maxWidthStyles = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog Card */}
      <div
        className={twMerge(
          clsx(
            'relative w-full bg-pharma-white rounded-pharma shadow-2xl border border-pharma-muted/20 overflow-hidden z-10 transition-all transform scale-100',
            maxWidthStyles[maxWidth]
          )
        )}
      >
        {/* Header Strip with Pharma Green title */}
        <div className="bg-pharma-surface px-6 py-4 border-b border-pharma-muted/20 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-pharma-text">{title}</h3>
            {description && <p className="text-xs text-pharma-muted mt-0.5">{description}</p>}
          </div>
          <button
            onClick={onClose}
            className="text-pharma-muted hover:text-pharma-danger p-1 rounded-md transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 max-h-[75vh] overflow-y-auto">{children}</div>

        {/* Footer (if provided) */}
        {footer && (
          <div className="bg-pharma-surface px-6 py-3 border-t border-pharma-muted/20">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
