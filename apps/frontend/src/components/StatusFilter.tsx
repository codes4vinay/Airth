import React from 'react';
import { JobCounts, JobStatus } from '../types/job';
import clsx from 'clsx';

interface StatusFilterProps {
  activeFilter?: JobStatus;
  onSelect: (status?: JobStatus) => void;
  counts?: JobCounts;
}

export const StatusFilter: React.FC<StatusFilterProps> = ({
  activeFilter,
  onSelect,
  counts,
}) => {
  const tabs: Array<{ id: JobStatus | undefined; label: string; count?: number }> = [
    { id: undefined, label: 'All', count: counts?.total ?? 0 },
    { id: 'pending', label: 'Pending', count: counts?.pending ?? 0 },
    { id: 'running', label: 'Running', count: counts?.running ?? 0 },
    { id: 'completed', label: 'Completed', count: counts?.completed ?? 0 },
    { id: 'failed', label: 'Failed', count: counts?.failed ?? 0 },
  ];

  return (
    <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 scrollbar-none max-w-full min-w-0">
      <div className="inline-flex items-center p-1 bg-slate-200/60 rounded-lg border border-slate-200/80 gap-1 shrink-0">
        {tabs.map((tab) => {
          const isActive = activeFilter === tab.id;
          return (
            <button
              key={tab.label}
              type="button"
              onClick={() => onSelect(tab.id)}
              className={clsx(
                'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-all',
                isActive
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60',
              )}
            >
              <span>{tab.label}</span>
              <span
                className={clsx(
                  'px-1.5 py-0.5 rounded text-[11px] font-mono leading-none',
                  isActive
                    ? 'bg-slate-100 text-slate-800 font-semibold'
                    : 'bg-slate-200/80 text-slate-600',
                )}
              >
                {tab.count ?? 0}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
