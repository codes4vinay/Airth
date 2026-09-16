import React, { useState, useEffect } from 'react';
import {
  QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query';
import {
  useJobs,
  useJobCounts,
  useCreateJob,
  useUpdateJobStatus,
  useDeleteJob,
} from './hooks/useJobs';
import { Header } from './components/Header';
import { StatusFilter } from './components/StatusFilter';
import { JobsTable } from './components/JobsTable';
import { CreateJobModal } from './components/CreateJobModal';
import { JobHistoryModal } from './components/JobHistoryModal';
import { EmptyState } from './components/EmptyState';
import { LoadingSkeleton } from './components/LoadingSkeleton';
import { Job, JobStatus, CreateJobInput } from './types/job';
import { getApiErrorMessage } from './api/client';
import { AlertTriangle, CheckCircle, X } from 'lucide-react';
import axios from 'axios';

// Create a single QueryClient instance
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: true,
    },
  },
});

const DashboardContent: React.FC = () => {
  const [activeFilter, setActiveFilter] = useState<JobStatus | undefined>();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [historyJob, setHistoryJob] = useState<Job | null>(null);

  // Status feedback toast/banner
  const [banner, setBanner] = useState<{
    message: string;
    type: 'success' | 'error' | 'conflict';
  } | null>(null);

  // Auto-dismiss alert banner after 4s for success, 6s for errors/conflicts
  useEffect(() => {
    if (!banner) return;
    const timer = setTimeout(
      () => {
        setBanner(null);
      },
      banner.type === 'success' ? 4000 : 6000,
    );

    return () => clearTimeout(timer);
  }, [banner]);

  // Mutation track states
  const [updatingJobId, setUpdatingJobId] = useState<string | null>(null);
  const [deletingJobId, setDeletingJobId] = useState<string | null>(null);

  // Queries
  const {
    data: jobs = [],
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
    dataUpdatedAt,
  } = useJobs(activeFilter);

  const { data: counts } = useJobCounts();

  // Mutations
  const createJobMutation = useCreateJob();
  const updateJobStatusMutation = useUpdateJobStatus();
  const deleteJobMutation = useDeleteJob();

  // Handlers
  const handleCreateJob = async (input: CreateJobInput) => {
    try {
      const created = await createJobMutation.mutateAsync(input);
      setBanner({
        type: 'success',
        message: `Job "${created.title}" created successfully in pending status.`,
      });
    } catch (err: unknown) {
      setBanner({
        type: 'error',
        message: getApiErrorMessage(err),
      });
      throw err;
    }
  };

  const handleUpdateStatus = async (job: Job, nextStatus: JobStatus) => {
    setUpdatingJobId(job.id);
    setBanner(null);

    try {
      await updateJobStatusMutation.mutateAsync({
        id: job.id,
        input: {
          status: nextStatus,
          currentStatus: job.status,
        },
      });

      setBanner({
        type: 'success',
        message: `Job "${job.title}" transitioned from ${job.status} to ${nextStatus}.`,
      });
    } catch (err: unknown) {
      let isConflict = false;
      if (axios.isAxiosError(err) && err.response?.status === 409) {
        isConflict = true;
      }

      setBanner({
        type: isConflict ? 'conflict' : 'error',
        message: isConflict
          ? `Concurrency Conflict: ${getApiErrorMessage(err)}`
          : getApiErrorMessage(err),
      });
    } finally {
      setUpdatingJobId(null);
    }
  };

  const handleDeleteJob = async (id: string) => {
    setDeletingJobId(id);
    try {
      await deleteJobMutation.mutateAsync(id);
      setBanner({
        type: 'success',
        message: 'Job was deleted successfully.',
      });
    } catch (err: unknown) {
      setBanner({
        type: 'error',
        message: getApiErrorMessage(err),
      });
    } finally {
      setDeletingJobId(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col antialiased w-full max-w-full overflow-x-hidden">
      {/* Top Header */}
      <Header
        lastUpdated={dataUpdatedAt ? new Date(dataUpdatedAt) : null}
        isFetching={isFetching}
        onRefresh={() => refetch()}
        onCreateClick={() => setIsCreateModalOpen(true)}
      />

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-4 sm:space-y-6 min-w-0">
        {/* Flash Alert Banner */}
        {banner && (
          <div
            role="alert"
            className={`p-3.5 rounded-lg border flex items-center justify-between text-xs sm:text-sm animate-in fade-in duration-200 ${
              banner.type === 'conflict'
                ? 'bg-amber-50 text-amber-900 border-amber-300'
                : banner.type === 'error'
                ? 'bg-rose-50 text-rose-900 border-rose-200'
                : 'bg-emerald-50 text-emerald-900 border-emerald-200'
            }`}
          >
            <div className="flex items-center gap-2.5">
              {banner.type === 'conflict' || banner.type === 'error' ? (
                <AlertTriangle className="h-4 w-4 shrink-0 text-current" />
              ) : (
                <CheckCircle className="h-4 w-4 shrink-0 text-current" />
              )}
              <span className="font-medium">{banner.message}</span>
            </div>
            <button
              type="button"
              onClick={() => setBanner(null)}
              className="p-1 hover:bg-black/5 rounded transition-colors text-current"
              aria-label="Dismiss alert"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Queue Management Section */}
        <section aria-label="Job queue management" className="space-y-4">
          <div className="flex items-center justify-between gap-3 min-w-0">
            <StatusFilter
              activeFilter={activeFilter}
              onSelect={setActiveFilter}
              counts={counts}
            />
          </div>

          {/* Table / Loading / Error / Empty States */}
          {isLoading ? (
            <LoadingSkeleton />
          ) : isError ? (
            <div className="p-8 text-center bg-white border border-rose-200 rounded-xl shadow-sm">
              <AlertTriangle className="h-8 w-8 text-rose-500 mx-auto mb-2" />
              <h3 className="text-sm font-semibold text-slate-900">
                Failed to load jobs
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                {getApiErrorMessage(error)}
              </p>
              <button
                type="button"
                onClick={() => refetch()}
                className="mt-3 px-3 py-1.5 text-xs font-medium bg-slate-900 text-white rounded-md hover:bg-slate-800"
              >
                Retry Request
              </button>
            </div>
          ) : jobs.length === 0 ? (
            <EmptyState
              statusFilter={activeFilter}
              onCreateClick={() => setIsCreateModalOpen(true)}
              onClearFilter={() => setActiveFilter(undefined)}
            />
          ) : (
            <JobsTable
              jobs={jobs}
              onUpdateStatus={handleUpdateStatus}
              onDeleteJob={handleDeleteJob}
              onViewHistory={setHistoryJob}
              updatingJobId={updatingJobId}
              deletingJobId={deletingJobId}
            />
          )}
        </section>
      </main>

      {/* Create Job Modal */}
      <CreateJobModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateJob}
        isCreating={createJobMutation.isPending}
      />

      {/* Status History Modal */}
      <JobHistoryModal
        job={historyJob}
        onClose={() => setHistoryJob(null)}
      />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <DashboardContent />
    </QueryClientProvider>
  );
};

export default App;
