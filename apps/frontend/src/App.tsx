import React, { useState, useEffect } from 'react';
import { useJobs } from './hooks/useJobs';
import { createJob, updateJobStatus, deleteJob } from './api/jobs';
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

export const App: React.FC = () => {
  const [activeFilter, setActiveFilter] = useState<JobStatus | undefined>();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [historyJob, setHistoryJob] = useState<Job | null>(null);

  const [banner, setBanner] = useState<{
    message: string;
    type: 'success' | 'error' | 'conflict';
  } | null>(null);

  // Auto-dismiss banners: success messages clear quickly, errors/conflicts give more time to read
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

  const [updatingJobId, setUpdatingJobId] = useState<string | null>(null);
  const [deletingJobId, setDeletingJobId] = useState<string | null>(null);

  const {
    jobs,
    counts,
    isLoading,
    isFetching,
    error,
    lastUpdated,
    refreshJobs,
  } = useJobs(activeFilter);

  const handleCreateJob = async (input: CreateJobInput) => {
    setIsCreating(true);
    try {
      const created = await createJob(input);
      setBanner({
        type: 'success',
        message: `Job "${created.title}" created successfully in pending status.`,
      });
      setIsCreateModalOpen(false);
      await refreshJobs();
    } catch (err: unknown) {
      setBanner({
        type: 'error',
        message: getApiErrorMessage(err),
      });
      throw err;
    } finally {
      setIsCreating(false);
    }
  };

  const handleUpdateStatus = async (job: Job, nextStatus: JobStatus) => {
    setUpdatingJobId(job.id);
    setBanner(null);

    try {
      // Send currentStatus so the backend can verify the job hasn't changed in another tab

      await updateJobStatus(job.id, {
        status: nextStatus,
        currentStatus: job.status,
      });

      setBanner({
        type: 'success',
        message: `Job "${job.title}" moved to ${nextStatus}.`,
      });

      await refreshJobs();
    } catch (err: unknown) {
      const isConflict =
        axios.isAxiosError(err) && err.response?.status === 409;

      setBanner({
        type: isConflict ? 'conflict' : 'error',
        message: isConflict
          ? `Conflict: ${getApiErrorMessage(err)}`
          : getApiErrorMessage(err),
      });
    } finally {
      setUpdatingJobId(null);
    }
  };

  const handleDeleteJob = async (id: string) => {
    setDeletingJobId(id);
    try {
      await deleteJob(id);
      setBanner({
        type: 'success',
        message: 'Job was deleted successfully.',
      });
      await refreshJobs();
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
      <Header
        lastUpdated={lastUpdated}
        isFetching={isFetching}
        onRefresh={refreshJobs}
        onCreateClick={() => setIsCreateModalOpen(true)}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-4 sm:space-y-6 min-w-0">
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

        <section className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 min-w-0">
            <StatusFilter
              activeFilter={activeFilter}
              onSelect={(status) => setActiveFilter(status)}
              counts={counts || undefined}
            />
          </div>

          {isLoading ? (
            <LoadingSkeleton />
          ) : error ? (
            <div className="p-8 rounded-xl bg-rose-50 border border-rose-200 text-center space-y-3">
              <AlertTriangle className="h-8 w-8 text-rose-600 mx-auto" />
              <div className="text-sm font-semibold text-rose-900">
                Failed to load job queue
              </div>
              <p className="text-xs text-rose-700 max-w-md mx-auto">{error}</p>
              <button
                type="button"
                onClick={refreshJobs}
                className="inline-flex items-center px-3 py-1.5 rounded-md text-xs font-medium bg-rose-600 text-white hover:bg-rose-700 transition-colors"
              >
                Retry
              </button>
            </div>
          ) : jobs.length === 0 ? (
            <EmptyState
              statusFilter={activeFilter}
              onClearFilter={() => setActiveFilter(undefined)}
              onCreateClick={() => setIsCreateModalOpen(true)}
            />
          ) : (
            <JobsTable
              jobs={jobs}
              onUpdateStatus={handleUpdateStatus}
              onDeleteJob={handleDeleteJob}
              onViewHistory={(job) => setHistoryJob(job)}
              updatingJobId={updatingJobId}
              deletingJobId={deletingJobId}
            />
          )}
        </section>
      </main>

      <CreateJobModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateJob}
        isCreating={isCreating}
      />

      <JobHistoryModal
        job={historyJob}
        onClose={() => setHistoryJob(null)}
      />
    </div>
  );
};

export default App;
