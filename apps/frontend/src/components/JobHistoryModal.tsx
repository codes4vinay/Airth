import React from 'react';
import { X, History, ArrowRight, Loader2, Calendar } from 'lucide-react';
import { useJobHistory } from '../hooks/useJobs';
import { StatusBadge } from './StatusBadge';
import { Job } from '../types/job';

interface JobHistoryModalProps {
  job: Job | null;
  onClose: () => void;
}

export const JobHistoryModal: React.FC<JobHistoryModalProps> = ({ job, onClose }) => {
  const { history, isLoading, error } = useJobHistory(job ? job.id : null);

  if (!job) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="history-modal-title"
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in"
    >
      <div className="relative w-full max-w-xl bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/60">

          <div className="flex items-center gap-2">
            <History className="h-5 w-5 text-slate-700" />
            <div>
              <h2 id="history-modal-title" className="text-base font-semibold text-slate-900">
                Job Transition History
              </h2>
              <p className="text-xs text-slate-500 font-mono mt-0.5 truncate max-w-md">
                ID: {job.id}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-md transition-colors"
            aria-label="Close dialog"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6">

          <div className="mb-4 p-3 rounded-lg bg-slate-50 border border-slate-200/80 flex items-center justify-between">
            <div>
              <span className="text-xs text-slate-500 block">Current Status</span>
              <div className="mt-1">
                <StatusBadge status={job.status} />
              </div>
            </div>
            <div className="text-right">
              <span className="text-xs text-slate-500 block">Job Title</span>
              <span className="text-xs font-medium text-slate-900 line-clamp-1">
                {job.title}
              </span>
            </div>
          </div>

          {isLoading ? (
            <div className="py-12 flex flex-col items-center justify-center text-slate-400">
              <Loader2 className="h-6 w-6 animate-spin text-blue-600 mb-2" />
              <p className="text-xs">Loading status audit log...</p>
            </div>
          ) : error ? (
            <div className="p-4 rounded-md bg-rose-50 text-rose-800 text-xs border border-rose-200">
              Failed to load status history.
            </div>
          ) : history.length === 0 ? (
            <div className="py-8 text-center text-slate-500 text-xs">
              No status transitions recorded yet. Initial status remains pending.
            </div>
          ) : (
            <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
              {history.map((record) => {
                const date = new Date(record.changedAt);
                return (
                  <div key={record.id} className="relative group">
                    <span className="absolute -left-6 top-1.5 h-3.5 w-3.5 rounded-full border-2 border-white bg-blue-600 shadow-sm" />
                    <div className="p-3 bg-white rounded-lg border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <StatusBadge status={record.fromStatus} size="sm" />
                        <ArrowRight className="h-3 w-3 text-slate-400" />
                        <StatusBadge status={record.toStatus} size="sm" />
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-mono">
                        <Calendar className="h-3 w-3" />
                        <span>{date.toLocaleDateString()}</span>
                        <span>{date.toLocaleTimeString()}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 text-right">

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-200/70 rounded-md transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
