export type JobStatus = 'pending' | 'running' | 'completed' | 'failed';

export interface Job {
  id: string;
  title: string;
  type: string;
  status: JobStatus;
  createdAt: string;
  updatedAt: string;
}

export interface JobStatusHistory {
  id: string;
  jobId: string;
  fromStatus: JobStatus;
  toStatus: JobStatus;
  changedAt: string;
}

export interface JobCounts {
  total: number;
  pending: number;
  running: number;
  completed: number;
  failed: number;
}

export interface CreateJobInput {
  title: string;
  type: string;
}

export interface UpdateJobStatusInput {
  status: JobStatus;
  currentStatus?: JobStatus;
}

/**
 * Valid UI transitions mapping. Used to display only sensible action buttons.
 */
export const ALLOWED_TRANSITIONS: Record<JobStatus, JobStatus[]> = {
  pending: ['running', 'failed'],
  running: ['completed', 'failed'],
  completed: [],
  failed: [],
};
