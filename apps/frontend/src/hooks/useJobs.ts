import {
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import {
  fetchJobs,
  fetchJobCounts,
  fetchJobHistory,
  createJob,
  updateJobStatus,
  deleteJob,
} from '../api/jobs';
import {
  Job,
  JobStatus,
  JobCounts,
  CreateJobInput,
  UpdateJobStatusInput,
} from '../types/job';
import { POLLING_INTERVAL_MS } from '../constants/config';

export const JOB_QUERY_KEYS = {
  all: ['jobs'] as const,
  list: (status?: JobStatus) => ['jobs', { status: status || 'all' }] as const,
  counts: ['job-counts'] as const,
  history: (id: string | null) => ['job-history', id] as const,
};

/**
 * Hook to retrieve jobs list with automatic 10s background polling.
 * Halts polling when tab is inactive. Stale time 0 ensures instant freshness on invalidation.
 */
export function useJobs(status?: JobStatus) {
  return useQuery({
    queryKey: JOB_QUERY_KEYS.list(status),
    queryFn: () => fetchJobs(status),
    refetchInterval: POLLING_INTERVAL_MS,
    refetchIntervalInBackground: false,
    staleTime: 0,
  });
}

/**
 * Hook to retrieve status aggregation counts.
 */
export function useJobCounts() {
  return useQuery({
    queryKey: JOB_QUERY_KEYS.counts,
    queryFn: fetchJobCounts,
    refetchInterval: POLLING_INTERVAL_MS,
    refetchIntervalInBackground: false,
    staleTime: 0,
  });
}

/**
 * Hook to retrieve chronological status transition history for a single job.
 */
export function useJobHistory(jobId: string | null) {
  return useQuery({
    queryKey: JOB_QUERY_KEYS.history(jobId),
    queryFn: () => (jobId ? fetchJobHistory(jobId) : Promise.resolve([])),
    enabled: Boolean(jobId),
  });
}

/**
 * Hook to create a new job with immediate local cache insertion.
 */
export function useCreateJob() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateJobInput) => createJob(input),
    onSuccess: (newJob) => {
      // Immediately inject into local cache without waiting for network refetch
      queryClient.setQueriesData<Job[]>(
        { queryKey: JOB_QUERY_KEYS.all },
        (old) => (old ? [newJob, ...old] : [newJob]),
      );
      queryClient.invalidateQueries({ queryKey: JOB_QUERY_KEYS.all });
      queryClient.invalidateQueries({ queryKey: JOB_QUERY_KEYS.counts });
    },
  });
}

/**
 * Hook to atomically update a job status with INSTANT OPTIMISTIC UI FEEDBACK:
 * 1. Cancels outgoing refetches to avoid overwriting optimistic data.
 * 2. Immediately mutates local cache (status flips in 0ms, action buttons swap immediately).
 * 3. Optimistically updates status counts on tabs.
 * 4. Rolls back automatically if a concurrency conflict (409) or network error occurs.
 * 5. On settle, synchronizes authoritative state with database.
 */
export function useUpdateJobStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id: string;
      input: UpdateJobStatusInput;
    }) => updateJobStatus(id, input),

    onMutate: async ({ id, input }) => {
      // 1. Cancel outgoing queries
      await queryClient.cancelQueries({ queryKey: JOB_QUERY_KEYS.all });

      // 2. Snapshot previous state
      const previousJobs = queryClient.getQueriesData<Job[]>({
        queryKey: JOB_QUERY_KEYS.all,
      });
      const previousCounts = queryClient.getQueryData<JobCounts>(
        JOB_QUERY_KEYS.counts,
      );

      // 3. Optimistically update all job lists in cache
      queryClient.setQueriesData<Job[]>(
        { queryKey: JOB_QUERY_KEYS.all },
        (old) => {
          if (!old) return old;
          return old.map((job) =>
            job.id === id
              ? {
                  ...job,
                  status: input.status,
                  updatedAt: new Date().toISOString(),
                }
              : job,
          );
        },
      );

      // 4. Optimistically adjust counts
      if (
        previousCounts &&
        input.currentStatus &&
        input.currentStatus !== input.status
      ) {
        queryClient.setQueryData<JobCounts>(JOB_QUERY_KEYS.counts, {
          ...previousCounts,
          [input.currentStatus]: Math.max(
            0,
            (previousCounts[input.currentStatus] || 0) - 1,
          ),
          [input.status]: (previousCounts[input.status] || 0) + 1,
        });
      }

      return { previousJobs, previousCounts };
    },

    onError: (_err, _variables, context) => {
      // Rollback to previous state on failure/conflict
      if (context?.previousJobs) {
        context.previousJobs.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      if (context?.previousCounts) {
        queryClient.setQueryData(JOB_QUERY_KEYS.counts, context.previousCounts);
      }
    },

    onSettled: (_data, _err, { id }) => {
      // Ensure local state strictly matches database truth
      queryClient.invalidateQueries({ queryKey: JOB_QUERY_KEYS.all });
      queryClient.invalidateQueries({ queryKey: JOB_QUERY_KEYS.counts });
      queryClient.invalidateQueries({
        queryKey: JOB_QUERY_KEYS.history(id),
      });
    },
  });
}

/**
 * Hook to delete a job with optimistic removal.
 */
export function useDeleteJob() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteJob(id),
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: JOB_QUERY_KEYS.all });

      const previousJobs = queryClient.getQueriesData<Job[]>({
        queryKey: JOB_QUERY_KEYS.all,
      });

      queryClient.setQueriesData<Job[]>(
        { queryKey: JOB_QUERY_KEYS.all },
        (old) => (old ? old.filter((job) => job.id !== id) : old),
      );

      return { previousJobs };
    },
    onError: (_err, _id, context) => {
      if (context?.previousJobs) {
        context.previousJobs.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: JOB_QUERY_KEYS.all });
      queryClient.invalidateQueries({ queryKey: JOB_QUERY_KEYS.counts });
    },
  });
}

