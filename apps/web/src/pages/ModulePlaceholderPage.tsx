import React from 'react';
import { Link } from 'react-router-dom';
import { EmptyState } from '../components/ui/EmptyState';
import { Button } from '../components/ui/Button';
import { Layers, ArrowLeft } from 'lucide-react';

interface ModulePlaceholderPageProps {
  title: string;
  phase: string;
  description: string;
}

export const ModulePlaceholderPage: React.FC<ModulePlaceholderPageProps> = ({
  title,
  phase,
  description,
}) => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between bg-pharma-white p-4 rounded-pharma border border-pharma-muted/20">
        <div>
          <span className="text-xs font-bold text-pharma-primary bg-pharma-primary/10 px-2 py-0.5 rounded-full uppercase">
            {phase}
          </span>
          <h2 className="text-lg font-bold text-pharma-text mt-1">{title}</h2>
        </div>
        <Link to="/dashboard">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4 mr-1.5" />
            Back to Dashboard
          </Button>
        </Link>
      </div>

      <div className="pharma-panel">
        <EmptyState
          icon={<Layers className="w-8 h-8 text-pharma-primary" />}
          title={`${title} Module`}
          description={`${description} This module is specified for ${phase} according to the master build plan. Phase 0 foundation, design tokens, auth, and role guards are fully operational.`}
          actionLabel="View Style Guide"
          onAction={() => (window.location.href = '/style-guide')}
        />
      </div>
    </div>
  );
};
