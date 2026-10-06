import React, { forwardRef } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  prefixElement?: React.ReactNode;
  suffixElement?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      label,
      error,
      hint,
      id,
      prefixElement,
      suffixElement,
      disabled,
      ...props
    },
    ref
  ) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="text-xs font-semibold text-pharma-text uppercase tracking-wider flex items-center justify-between"
          >
            <span>{label}</span>
            {hint && <span className="text-[11px] text-pharma-muted font-normal">{hint}</span>}
          </label>
        )}

        <div className="relative flex items-center">
          {prefixElement && (
            <div className="absolute left-3.5 flex items-center pointer-events-none text-pharma-muted text-sm">
              {prefixElement}
            </div>
          )}

          <input
            id={inputId}
            ref={ref}
            disabled={disabled}
            className={twMerge(
              clsx(
                'w-full bg-pharma-white text-pharma-text placeholder:text-pharma-muted/60 text-sm rounded-pharma border transition-all duration-150',
                'border-pharma-muted/30 focus:border-pharma-primary focus:outline-none focus:ring-2 focus:ring-pharma-accent/30',
                'disabled:bg-pharma-surface disabled:text-pharma-muted disabled:cursor-not-allowed',
                prefixElement ? 'pl-10' : 'pl-3.5',
                suffixElement ? 'pr-10' : 'pr-3.5',
                'py-2.5 shadow-sm',
                error && 'border-pharma-danger focus:border-pharma-danger focus:ring-pharma-danger/20',
                className
              )
            )}
            {...props}
          />

          {suffixElement && (
            <div className="absolute right-3.5 flex items-center text-pharma-muted text-sm">
              {suffixElement}
            </div>
          )}
        </div>

        {error && (
          <p className="text-xs text-pharma-danger font-medium flex items-center gap-1 mt-0.5">
            <span>•</span> {error}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
