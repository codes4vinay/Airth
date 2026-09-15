import React from 'react';
import { JobStatus } from '../types/job';
import { STATUS_CONFIG } from '../constants/config';
import clsx from 'clsx';

interface StatusBadgeProps {
  status: JobStatus;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const meta = STATUS_CONFIG[status] || {
    label: status,
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
    dotClass: 'bg-slate-400',
  };

  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 font-medium border rounded-full',
        meta.badgeClass,
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs',
      )}
    >
      <span className={clsx('h-1.5 w-1.5 rounded-full', meta.dotClass)} />
      <span>{meta.label}</span>
    </span>
  );
};
