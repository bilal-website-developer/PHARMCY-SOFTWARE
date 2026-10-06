import React, { forwardRef } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Calendar } from 'lucide-react';

export interface DatePickerProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  error?: string;
  hint?: string;
}

export const DatePicker = forwardRef<HTMLInputElement, DatePickerProps>(
  ({ className, label, error, hint, id, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="text-xs font-semibold text-pharma-text uppercase tracking-wider flex items-center justify-between"
          >
            <span>{label}</span>
            <span className="text-[11px] text-pharma-muted font-normal">{hint || 'DD/MM/YYYY'}</span>
          </label>
        )}

        <div className="relative flex items-center">
          <div className="absolute left-3.5 flex items-center pointer-events-none text-pharma-muted">
            <Calendar className="w-4 h-4 text-pharma-muted" />
          </div>

          <input
            id={inputId}
            ref={ref}
            type="date"
            className={twMerge(
              clsx(
                'w-full bg-pharma-white text-pharma-text text-sm rounded-pharma border transition-all duration-150',
                'border-pharma-muted/30 focus:border-pharma-primary focus:outline-none focus:ring-2 focus:ring-pharma-accent/30',
                'py-2.5 pl-10 pr-3.5 shadow-sm cursor-pointer',
                'disabled:bg-pharma-surface disabled:text-pharma-muted disabled:cursor-not-allowed',
                error && 'border-pharma-danger focus:border-pharma-danger',
                className
              )
            )}
            {...props}
          />
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

DatePicker.displayName = 'DatePicker';
