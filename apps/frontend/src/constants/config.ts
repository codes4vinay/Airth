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
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
    borderClass: 'border-amber-400',
    dotClass: 'bg-amber-400',
    description: 'Waiting in queue for worker availability',
  },
  running: {
    label: 'Running',
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
    borderClass: 'border-blue-500',
    dotClass: 'bg-blue-500 animate-pulse',
    description: 'Actively executing on a processing worker',
  },
  completed: {
    label: 'Completed',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    borderClass: 'border-emerald-500',
    dotClass: 'bg-emerald-500',
    description: 'Execution finished successfully',
  },
  failed: {
    label: 'Failed',
    badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
    borderClass: 'border-rose-500',
    dotClass: 'bg-rose-500',
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
