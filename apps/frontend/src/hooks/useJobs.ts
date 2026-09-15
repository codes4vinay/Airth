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
  JobStatus,
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
 * TanStack Query automatically halts polling when the browser tab is inactive or hidden
 * because refetchIntervalInBackground defaults to false.
 */
export function useJobs(status?: JobStatus) {
  return useQuery({
    queryKey: JOB_QUERY_KEYS.list(status),
    queryFn: () => fetchJobs(status),
    refetchInterval: POLLING_INTERVAL_MS,
    refetchIntervalInBackground: false,
    staleTime: 5000,
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
    staleTime: 5000,
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
 * Hook to create a new job. Automatically invalidates job lists and counts.
 */
export function useCreateJob() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateJobInput) => createJob(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: JOB_QUERY_KEYS.all });
      queryClient.invalidateQueries({ queryKey: JOB_QUERY_KEYS.counts });
    },
  });
}

/**
 * Hook to atomically update a job status.
 * Invalidates queries upon successful transition.
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
    onSuccess: (updatedJob) => {
      queryClient.invalidateQueries({ queryKey: JOB_QUERY_KEYS.all });
      queryClient.invalidateQueries({ queryKey: JOB_QUERY_KEYS.counts });
      queryClient.invalidateQueries({
        queryKey: JOB_QUERY_KEYS.history(updatedJob.id),
      });
    },
  });
}

/**
 * Hook to delete a job.
 */
export function useDeleteJob() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteJob(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: JOB_QUERY_KEYS.all });
      queryClient.invalidateQueries({ queryKey: JOB_QUERY_KEYS.counts });
    },
  });
}
