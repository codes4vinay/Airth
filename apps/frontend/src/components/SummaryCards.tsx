import React from 'react';
import { JobCounts, JobStatus } from '../types/job';
import { Layers, Clock, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import clsx from 'clsx';

interface SummaryCardsProps {
  counts?: JobCounts;
  activeFilter?: JobStatus;
  onSelectFilter: (status?: JobStatus) => void;
  isLoading?: boolean;
}

export const SummaryCards: React.FC<SummaryCardsProps> = ({
  counts = { total: 0, pending: 0, running: 0, completed: 0, failed: 0 },
  activeFilter,
  onSelectFilter,
  isLoading,
}) => {
  const cards = [
    {
      id: undefined,
      label: 'Total Jobs',
      value: counts.total,
      icon: Layers,
      iconColor: 'text-slate-600',
      bgColor: 'bg-slate-50',
      activeBorder: 'border-slate-800 ring-1 ring-slate-800',
      hoverBorder: 'hover:border-slate-300',
    },
    {
      id: 'pending' as JobStatus,
      label: 'Pending',
      value: counts.pending,
      icon: Clock,
      iconColor: 'text-amber-600',
      bgColor: 'bg-amber-50',
      activeBorder: 'border-amber-500 ring-1 ring-amber-500',
      hoverBorder: 'hover:border-amber-300',
    },
    {
      id: 'running' as JobStatus,
      label: 'Running',
      value: counts.running,
      icon: Loader2,
      iconColor: 'text-blue-600',
      bgColor: 'bg-blue-50',
      activeBorder: 'border-blue-500 ring-1 ring-blue-500',
      hoverBorder: 'hover:border-blue-300',
      spinIcon: counts.running > 0,
    },
    {
      id: 'completed' as JobStatus,
      label: 'Completed',
      value: counts.completed,
      icon: CheckCircle2,
      iconColor: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
      activeBorder: 'border-emerald-500 ring-1 ring-emerald-500',
      hoverBorder: 'hover:border-emerald-300',
    },
    {
      id: 'failed' as JobStatus,
      label: 'Failed',
      value: counts.failed,
      icon: AlertCircle,
      iconColor: 'text-rose-600',
      bgColor: 'bg-rose-50',
      activeBorder: 'border-rose-500 ring-1 ring-rose-500',
      hoverBorder: 'hover:border-rose-300',
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
      {cards.map((card) => {
        const Icon = card.icon;
        const isSelected = activeFilter === card.id;

        return (
          <button
            key={card.label}
            type="button"
            onClick={() => onSelectFilter(isSelected && card.id ? undefined : card.id)}
            className={clsx(
              'flex flex-col text-left p-4 rounded-lg bg-white border transition-all text-slate-800 shadow-sm',
              isSelected ? card.activeBorder : `border-slate-200 ${card.hoverBorder}`,
            )}
          >
            <div className="flex items-center justify-between w-full">
              <span className="text-xs font-medium text-slate-500">
                {card.label}
              </span>
              <div
                className={clsx(
                  'p-1.5 rounded-md flex items-center justify-center',
                  card.bgColor,
                )}
              >
                <Icon
                  className={clsx(
                    'h-4 w-4',
                    card.iconColor,
                    card.spinIcon && 'animate-spin',
                  )}
                />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-semibold tracking-tight text-slate-900">
                {isLoading ? '-' : card.value}
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
};
