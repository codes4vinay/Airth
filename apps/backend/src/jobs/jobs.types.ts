import { JobStatus } from '@prisma/client';

export { JobStatus };

export interface JobEntity {
  id: string;
  title: string;
  type: string;
  status: JobStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface JobStatusHistoryEntity {
  id: string;
  jobId: string;
  fromStatus: JobStatus;
  toStatus: JobStatus;
  changedAt: Date;
}

export interface JobCounts {
  total: number;
  pending: number;
  running: number;
  completed: number;
  failed: number;
}
