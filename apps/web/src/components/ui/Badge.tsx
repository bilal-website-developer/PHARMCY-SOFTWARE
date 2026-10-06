import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export type BadgeVariant =
  | 'active'
  | 'near-expiry'
  | 'expired'
  | 'quarantine'
  | 'primary'
  | 'role';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  dot?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
  variant = 'active',
  dot = true,
  className,
  children,
  ...props
}) => {
  // Never put white text on #22C55E accent per Global Rules
  const variantStyles: Record<BadgeVariant, { container: string; dot: string }> = {
    active: {
      container:
        'bg-[#ECFDF5] text-pharma-text border border-pharma-accent/40 font-medium',
      dot: 'bg-pharma-accent',
    },
    'near-expiry': {
      container:
        'bg-[#FFFBEB] text-[#92400E] border border-pharma-warning/50 font-medium',
      dot: 'bg-pharma-warning',
    },
    expired: {
      container:
        'bg-[#FEF2F2] text-[#991B1B] border border-pharma-danger/40 font-medium',
      dot: 'bg-pharma-danger',
    },
    quarantine: {
      container:
        'bg-[#FAF5FF] text-[#6B21A8] border border-[#D8B4FE] font-medium',
      dot: 'bg-[#9333EA]',
    },
    primary: {
      container:
        'bg-pharma-primary/10 text-pharma-primary border border-pharma-primary/30 font-semibold',
      dot: 'bg-pharma-primary',
    },
    role: {
      container:
        'bg-pharma-surface text-pharma-text border border-pharma-muted/40 font-medium tracking-wide uppercase text-[10px]',
      dot: 'bg-pharma-primary',
    },
  };

  const current = variantStyles[variant];

  return (
    <span
      className={twMerge(
        clsx(
          'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs transition-colors',
          current.container,
          className
        )
      )}
      {...props}
    >
      {dot && <span className={clsx('w-1.5 h-1.5 rounded-full shrink-0', current.dot)} />}
      <span>{children}</span>
    </span>
  );
};
