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
    { id: undefined, label: 'All Jobs', count: counts?.total },
    { id: 'pending', label: 'Pending', count: counts?.pending },
    { id: 'running', label: 'Running', count: counts?.running },
    { id: 'completed', label: 'Completed', count: counts?.completed },
    { id: 'failed', label: 'Failed', count: counts?.failed },
  ];

  return (
    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
      {tabs.map((tab) => {
        const isActive = activeFilter === tab.id;
        return (
          <button
            key={tab.label}
            type="button"
            onClick={() => onSelect(tab.id)}
            className={clsx(
              'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors',
              isActive
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200',
            )}
          >
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span
                className={clsx(
                  'px-1.5 py-0.2 rounded-full text-[10px] font-semibold',
                  isActive
                    ? 'bg-slate-700 text-slate-200'
                    : 'bg-slate-100 text-slate-600',
                )}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};
