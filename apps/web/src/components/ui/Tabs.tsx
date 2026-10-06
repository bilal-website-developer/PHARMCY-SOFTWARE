import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface TabItem {
  id: string;
  label: string;
  badge?: string | number;
}

export interface TabsProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (tabId: string) => void;
  className?: string;
}

export const Tabs: React.FC<TabsProps> = ({ tabs, activeTab, onChange, className }) => {
  return (
    <div
      className={twMerge(
        clsx(
          'inline-flex p-1 bg-pharma-surface border border-pharma-muted/20 rounded-pharma select-none',
          className
        )
      )}
    >
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={twMerge(
              clsx(
                'px-4 py-2 text-xs font-semibold rounded-pharma transition-all duration-150 flex items-center gap-1.5',
                isActive
                  ? 'bg-pharma-primary text-pharma-white shadow-sm'
                  : 'text-pharma-text/80 hover:text-pharma-primary hover:bg-pharma-white/60'
              )
            )}
          >
            <span>{tab.label}</span>
            {tab.badge !== undefined && (
              <span
                className={clsx(
                  'px-1.5 py-0.2 rounded-full text-[10px] font-bold',
                  isActive ? 'bg-pharma-white/20 text-pharma-white' : 'bg-pharma-muted/20 text-pharma-muted'
                )}
              >
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};
