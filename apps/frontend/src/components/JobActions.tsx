import React from 'react';
import { Job, JobStatus } from '../types/job';
import { Play, Check, XCircle, Loader2 } from 'lucide-react';

interface JobActionsProps {
  job: Job;
  onUpdateStatus: (job: Job, nextStatus: JobStatus) => void;
  isUpdating: boolean;
}

export const JobActions: React.FC<JobActionsProps> = ({
  job,
  onUpdateStatus,
  isUpdating,
}) => {
  if (job.status === 'pending') {
    return (
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          disabled={isUpdating}
          onClick={() => onUpdateStatus(job, 'running')}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition-colors disabled:opacity-50"
          title="Start execution (Move to running)"
        >
          {isUpdating ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Play className="h-3 w-3 fill-current" />
          )}
          <span>Run</span>
        </button>

        <button
          type="button"
          disabled={isUpdating}
          onClick={() => onUpdateStatus(job, 'failed')}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 transition-colors disabled:opacity-50"
          title="Fail immediately"
        >
          <XCircle className="h-3 w-3" />
          <span>Fail</span>
        </button>
      </div>
    );
  }

  if (job.status === 'running') {
    return (
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          disabled={isUpdating}
          onClick={() => onUpdateStatus(job, 'completed')}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-colors disabled:opacity-50"
          title="Mark completed"
        >
          {isUpdating ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Check className="h-3 w-3" />
          )}
          <span>Complete</span>
        </button>

        <button
          type="button"
          disabled={isUpdating}
          onClick={() => onUpdateStatus(job, 'failed')}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 transition-colors disabled:opacity-50"
          title="Mark failed"
        >
          <XCircle className="h-3 w-3" />
          <span>Fail</span>
        </button>
      </div>
    );
  }

  // Terminal states (completed or failed)
  return (
    <span className="text-xs text-slate-400 italic">
      No actions available
    </span>
  );
};
