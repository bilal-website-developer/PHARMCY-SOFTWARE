import React, { forwardRef } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'danger' | 'ghost' | 'outline' | 'save' | 'cancel';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  isLoading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      fullWidth = false,
      isLoading = false,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      'inline-flex items-center justify-center font-medium rounded-pharma transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed select-none active:scale-[0.99]';

    const sizeStyles = {
      sm: 'px-3 py-1.5 text-xs gap-1.5',
      md: 'px-4 py-2 text-sm gap-2',
      lg: 'px-5 py-2.5 text-base gap-2.5 font-semibold',
    };

    // Strict Pharma Green Palette tokens:
    // Primary #15803D (white text allowed), Danger #DC2626 (white text allowed).
    // Accent #22C55E has dark text or ring, never white text.
    const variantStyles = {
      primary:
        'bg-pharma-primary text-pharma-white hover:brightness-110 shadow-sm focus:ring-pharma-accent border border-pharma-primary',
      save:
        'bg-pharma-primary text-pharma-white hover:brightness-110 shadow-sm focus:ring-pharma-accent font-semibold border border-pharma-primary',
      danger:
        'bg-pharma-danger text-pharma-white hover:brightness-110 shadow-sm focus:ring-pharma-danger border border-pharma-danger',
      cancel:
        'bg-pharma-danger text-pharma-white hover:brightness-110 shadow-sm focus:ring-pharma-danger font-semibold border border-pharma-danger',
      ghost:
        'bg-transparent text-pharma-text hover:bg-pharma-surface border border-pharma-muted/20 focus:ring-pharma-primary',
      outline:
        'bg-pharma-white text-pharma-primary border border-pharma-primary/40 hover:bg-pharma-surface focus:ring-pharma-accent',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={twMerge(
          clsx(
            baseStyles,
            sizeStyles[size],
            variantStyles[variant],
            fullWidth && 'w-full',
            className
          )
        )}
        {...props}
      >
        {isLoading && (
          <svg
            className="animate-spin -ml-1 mr-2 h-4 w-4 text-current"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
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
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
