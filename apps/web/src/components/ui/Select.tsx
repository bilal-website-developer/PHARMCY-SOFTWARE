import React, { forwardRef } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: SelectOption[];
  error?: string;
  hint?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, options, error, hint, id, ...props }, ref) => {
    const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={selectId}
            className="text-xs font-semibold text-pharma-text uppercase tracking-wider flex items-center justify-between"
          >
            <span>{label}</span>
            {hint && <span className="text-[11px] text-pharma-muted font-normal">{hint}</span>}
          </label>
        )}

        <div className="relative">
          <select
            id={selectId}
            ref={ref}
            className={twMerge(
              clsx(
                'w-full bg-pharma-white text-pharma-text text-sm rounded-pharma border transition-all duration-150',
                'border-pharma-muted/30 focus:border-pharma-primary focus:outline-none focus:ring-2 focus:ring-pharma-accent/30',
                'py-2.5 pl-3.5 pr-10 appearance-none shadow-sm cursor-pointer',
                'disabled:bg-pharma-surface disabled:text-pharma-muted disabled:cursor-not-allowed',
                error && 'border-pharma-danger focus:border-pharma-danger',
                className
              )
            )}
            {...props}
          >
            {options.map((opt) => (
              <option key={opt.value} value={opt.value} disabled={opt.disabled}>
                {opt.label}
              </option>
            ))}
          </select>

          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-pharma-muted">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
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

Select.displayName = 'Select';
