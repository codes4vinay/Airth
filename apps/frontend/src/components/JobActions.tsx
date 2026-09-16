import React from 'react';
import { Job, JobStatus } from '../types/job';
import { Play, Check, Loader2 } from 'lucide-react';

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
      <div className="flex items-center gap-1">
        <button
          type="button"
          disabled={isUpdating}
          onClick={() => onUpdateStatus(job, 'running')}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 shadow-2xs transition-colors disabled:opacity-50"
          title="Start execution"
        >
          {isUpdating ? (
            <Loader2 className="h-3 w-3 animate-spin text-slate-600" />
          ) : (
            <Play className="h-2.5 w-2.5 fill-slate-700 text-slate-700" />
          )}
          <span>Start</span>
        </button>

        <button
          type="button"
          disabled={isUpdating}
          onClick={() => onUpdateStatus(job, 'failed')}
          className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium text-slate-500 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-colors disabled:opacity-50"
          title="Mark as failed"
        >
          <span>Fail</span>
        </button>
      </div>
    );
  }

  if (job.status === 'running') {
    return (
      <div className="flex items-center gap-1">
        <button
          type="button"
          disabled={isUpdating}
          onClick={() => onUpdateStatus(job, 'completed')}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium bg-emerald-600 hover:bg-emerald-700 text-white border border-emerald-600 shadow-2xs transition-colors disabled:opacity-50"
          title="Mark as completed"
        >
          {isUpdating ? (
            <Loader2 className="h-3 w-3 animate-spin text-white" />
          ) : (
            <Check className="h-3 w-3" />
          )}
          <span>Complete</span>
        </button>

        <button
          type="button"
          disabled={isUpdating}
          onClick={() => onUpdateStatus(job, 'failed')}
          className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium text-slate-500 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-colors disabled:opacity-50"
          title="Mark as failed"
        >
          <span>Fail</span>
        </button>
      </div>
    );
  }

  // Terminal states (completed or failed)
  return <span className="text-slate-300 font-mono text-xs select-none">—</span>;
};
