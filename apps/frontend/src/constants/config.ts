import { JobStatus } from '../types/job';

/**
 * Polling interval for TanStack Query auto-refresh in milliseconds.
 * Centralized constant as required by specification.
 */
export const POLLING_INTERVAL_MS = 10000;

export interface StatusMeta {
  label: string;
  badgeClass: string;
  borderClass: string;
  dotClass: string;
  description: string;
}

export const STATUS_CONFIG: Record<JobStatus, StatusMeta> = {
  pending: {
    label: 'Pending',
    badgeClass: 'bg-slate-50 text-slate-700 border-slate-200',
    borderClass: 'border-slate-300',
    dotClass: 'bg-amber-500',
    description: 'Waiting in queue for worker availability',
  },
  running: {
    label: 'Running',
    badgeClass: 'bg-blue-50/70 text-blue-800 border-blue-200/80',
    borderClass: 'border-blue-400',
    dotClass: 'bg-blue-600',
    description: 'Actively executing on a processing worker',
  },
  completed: {
    label: 'Completed',
    badgeClass: 'bg-emerald-50/70 text-emerald-800 border-emerald-200/80',
    borderClass: 'border-emerald-400',
    dotClass: 'bg-emerald-600',
    description: 'Execution finished successfully',
  },
  failed: {
    label: 'Failed',
    badgeClass: 'bg-rose-50/70 text-rose-800 border-rose-200/80',
    borderClass: 'border-rose-400',
    dotClass: 'bg-rose-600',
    description: 'Terminated with an error or unhandled exception',
  },
};

export const PRESET_JOB_TYPES = [
  'DATA_SYNC',
  'EMAIL_NOTIFICATION',
  'REPORT_GENERATION',
  'VIDEO_ENCODING',
  'INDEX_OPTIMIZATION',
  'WEBHOOK_DELIVERY',
];
