import React from 'react';
import { PackageOpen } from 'lucide-react';
import { Button } from './Button';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionLabel,
  onAction,
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-10 text-center bg-pharma-surface border border-pharma-muted/20 rounded-pharma">
      <div className="w-14 h-14 rounded-full bg-pharma-white flex items-center justify-center text-pharma-muted shadow-sm mb-4 border border-pharma-muted/20">
        {icon || <PackageOpen className="w-7 h-7 text-pharma-primary" />}
      </div>
      <h3 className="text-base font-bold text-pharma-text">{title}</h3>
      <p className="text-xs text-pharma-muted max-w-sm mt-1 mb-5 leading-relaxed">{description}</p>
      {actionLabel && onAction && (
        <Button variant="primary" size="sm" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
};
