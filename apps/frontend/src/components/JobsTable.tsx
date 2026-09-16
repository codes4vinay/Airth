import React, { useState } from 'react';
import { Job, JobStatus } from '../types/job';
import { StatusBadge } from './StatusBadge';
import { JobActions } from './JobActions';
import { History, Trash2, Calendar, Tag } from 'lucide-react';

interface JobsTableProps {
  jobs: Job[];
  onUpdateStatus: (job: Job, nextStatus: JobStatus) => void;
  onDeleteJob: (id: string) => Promise<void>;
  onViewHistory: (job: Job) => void;
  updatingJobId: string | null;
  deletingJobId: string | null;
}

export const JobsTable: React.FC<JobsTableProps> = ({
  jobs,
  onUpdateStatus,
  onDeleteJob,
  onViewHistory,
  updatingJobId,
  deletingJobId,
}) => {
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    try {
      await onDeleteJob(id);
      setConfirmDeleteId(null);
    } catch {
      // Handled by mutation hook / error toast
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
      {/* Desktop Table View */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-left border-collapse" aria-label="Job queue table">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/75 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              <th scope="col" className="py-3 px-4">
                Job Details
              </th>
              <th scope="col" className="py-3 px-4">
                Type
              </th>
              <th scope="col" className="py-3 px-4">
                Status
              </th>
              <th scope="col" className="py-3 px-4">
                Created At
              </th>
              <th scope="col" className="py-3 px-4 text-center">
                Actions
              </th>
              <th scope="col" className="py-3 px-4 text-right">
                Manage
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200/80 text-xs">
            {jobs.map((job) => {
              const isUpdating = updatingJobId === job.id;
              const isDeleting = deletingJobId === job.id;
              const createdDate = new Date(job.createdAt);

              return (
                <tr
                  key={job.id}
                  className="hover:bg-slate-50/60 transition-colors group"
                >
                  {/* Title & UUID */}
                  <td className="py-3.5 px-4">
                    <div className="font-medium text-slate-900 line-clamp-1 max-w-sm">
                      {job.title}
                    </div>
                    <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                      {job.id}
                    </div>
                  </td>

                  {/* Type */}
                  <td className="py-3.5 px-4">
                    <span className="inline-flex items-center gap-1 font-mono text-[11px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200">
                      <Tag className="h-3 w-3 text-slate-400" />
                      {job.type}
                    </span>
                  </td>

                  {/* Status Badge */}
                  <td className="py-3.5 px-4">
                    <StatusBadge status={job.status} />
                  </td>

                  {/* Created At */}
                  <td className="py-3.5 px-4 text-slate-500 font-mono text-[11px] whitespace-nowrap">
                    <div>{createdDate.toLocaleDateString()}</div>
                    <div className="text-slate-400">{createdDate.toLocaleTimeString()}</div>
                  </td>

                  {/* Status Transitions */}
                  <td className="py-3.5 px-4 text-center">
                    <div className="flex justify-center">
                      <JobActions
                        job={job}
                        onUpdateStatus={onUpdateStatus}
                        isUpdating={isUpdating}
                      />
                    </div>
                  </td>

                  {/* Management: History & Delete */}
                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {/* View History Button */}
                      <button
                        type="button"
                        onClick={() => onViewHistory(job)}
                        className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded transition-colors"
                        title="View status audit history"
                        aria-label={`View history for ${job.title}`}
                      >
                        <History className="h-4 w-4" />
                      </button>

                      {/* Delete Button / Confirmation */}
                      {confirmDeleteId === job.id ? (
                        <div className="flex items-center gap-1 bg-rose-50 border border-rose-200 rounded px-1.5 py-0.5 animate-in fade-in">
                          <button
                            type="button"
                            disabled={isDeleting}
                            onClick={() => handleDelete(job.id)}
                            className="text-[11px] font-semibold text-rose-700 hover:text-rose-900 disabled:opacity-50"
                          >
                            {isDeleting ? 'Deleting...' : 'Confirm'}
                          </button>
                          <span className="text-slate-300">|</span>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(null)}
                            className="text-[11px] text-slate-500 hover:text-slate-700"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(job.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                          title="Delete job"
                          aria-label={`Delete job ${job.title}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile Responsive Cards View */}
      <div className="md:hidden divide-y divide-slate-200">
        {jobs.map((job) => {
          const isUpdating = updatingJobId === job.id;
          const isDeleting = deletingJobId === job.id;
          const createdDate = new Date(job.createdAt);

          return (
            <div key={job.id} className="p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-semibold text-slate-900 truncate">
                    {job.title}
                  </h3>
                  <p className="text-[11px] font-mono text-slate-400 mt-0.5 truncate">
                    {job.id}
                  </p>
                </div>
                <div className="shrink-0">
                  <StatusBadge status={job.status} size="sm" />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                <span className="inline-flex items-center gap-1 font-mono text-[11px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200">
                  <Tag className="h-3 w-3 text-slate-400" />
                  {job.type}
                </span>
                <span className="inline-flex items-center gap-1 text-[11px] text-slate-400 font-mono">
                  <Calendar className="h-3 w-3" />
                  {createdDate.toLocaleDateString()} {createdDate.toLocaleTimeString()}
                </span>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <JobActions
                  job={job}
                  onUpdateStatus={onUpdateStatus}
                  isUpdating={isUpdating}
                />

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => onViewHistory(job)}
                    className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded"
                    title="Audit History"
                  >
                    <History className="h-4 w-4" />
                  </button>

                  {confirmDeleteId === job.id ? (
                    <div className="flex items-center gap-1 bg-rose-50 border border-rose-200 rounded px-2 py-0.5">
                      <button
                        type="button"
                        disabled={isDeleting}
                        onClick={() => handleDelete(job.id)}
                        className="text-xs font-semibold text-rose-700 hover:text-rose-900"
                      >
                        {isDeleting ? 'Deleting...' : 'Confirm'}
                      </button>
                      <span className="text-slate-300">|</span>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(null)}
                        className="text-xs text-slate-500"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteId(job.id)}
                      className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
