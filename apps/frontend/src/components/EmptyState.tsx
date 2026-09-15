import React from 'react';
import { Inbox, Plus } from 'lucide-react';
import { JobStatus } from '../types/job';

interface EmptyStateProps {
  statusFilter?: JobStatus;
  onCreateClick: () => void;
  onClearFilter: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  statusFilter,
  onCreateClick,
  onClearFilter,
}) => {
  return (
    <div className="py-16 text-center border-2 border-dashed border-slate-200 rounded-xl bg-white/50 p-8">
      <div className="mx-auto h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
        <Inbox className="h-6 w-6" />
      </div>
      <h3 className="text-sm font-semibold text-slate-900">
        {statusFilter ? `No ${statusFilter} jobs found` : 'No jobs in queue'}
      </h3>
      <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
        {statusFilter
          ? `There are currently no jobs matching status "${statusFilter}". Clear the filter or submit a new job.`
          : 'Create a background job to start monitoring tasks and state transitions in real time.'}
      </p>
      <div className="mt-4 flex items-center justify-center gap-3">
        {statusFilter && (
          <button
            type="button"
            onClick={onClearFilter}
            className="px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 border border-slate-300 rounded-md transition-colors"
          >
            Clear Filter
          </button>
        )}
        <button
          type="button"
          onClick={onCreateClick}
          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-blue-600 text-white hover:bg-blue-700 rounded-md shadow-sm transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>Create First Job</span>
        </button>
      </div>
    </div>
  );
};
