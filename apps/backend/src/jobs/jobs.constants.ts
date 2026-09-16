import { JobStatus } from '@prisma/client';

export const VALID_STATUS_TRANSITIONS: Readonly<
  Record<JobStatus, readonly JobStatus[]>
> = {
  [JobStatus.pending]: [JobStatus.running, JobStatus.failed],
  [JobStatus.running]: [JobStatus.completed, JobStatus.failed],
  [JobStatus.completed]: [],
  [JobStatus.failed]: [],
};

export function isValidTransition(
  fromStatus: JobStatus,
  toStatus: JobStatus,
): boolean {
  const allowed = VALID_STATUS_TRANSITIONS[fromStatus];
  return allowed ? allowed.includes(toStatus) : false;
}
