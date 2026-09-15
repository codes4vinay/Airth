import { JobStatus } from '@prisma/client';

/**
 * Valid state transitions for a Job.
 * Single source of truth for all lifecycle transitions:
 * - pending -> running
 * - pending -> failed
 * - running -> completed
 * - running -> failed
 * Terminal states (completed, failed) cannot transition to any other status.
 */
export const VALID_STATUS_TRANSITIONS: Readonly<
  Record<JobStatus, readonly JobStatus[]>
> = {
  [JobStatus.pending]: [JobStatus.running, JobStatus.failed],
  [JobStatus.running]: [JobStatus.completed, JobStatus.failed],
  [JobStatus.completed]: [],
  [JobStatus.failed]: [],
};

/**
 * Checks whether transitioning from `fromStatus` to `toStatus` is permitted.
 */
export function isValidTransition(
  fromStatus: JobStatus,
  toStatus: JobStatus,
): boolean {
  const allowed = VALID_STATUS_TRANSITIONS[fromStatus];
  return allowed ? allowed.includes(toStatus) : false;
}

/**
 * Inverted lookup: returns all statuses from which a job can transition to `toStatus`.
 */
export function getValidPreviousStatuses(toStatus: JobStatus): JobStatus[] {
  return (Object.keys(VALID_STATUS_TRANSITIONS) as JobStatus[]).filter((from) =>
    VALID_STATUS_TRANSITIONS[from].includes(toStatus),
  );
}
