import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateJobDto } from './dto/create-job.dto';
import { UpdateJobStatusDto } from './dto/update-job-status.dto';
import {
  JobCounts,
  JobEntity,
  JobStatus,
  JobStatusHistoryEntity,
} from './jobs.types';
import { VALID_STATUS_TRANSITIONS, isValidTransition } from './jobs.constants';

@Injectable()
export class JobsService {
  private readonly logger = new Logger(JobsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new job with initial status 'pending'.
   */
  async createJob(dto: CreateJobDto): Promise<JobEntity> {
    const job = await this.prisma.job.create({
      data: {
        title: dto.title.trim(),
        type: dto.type.trim(),
        status: JobStatus.pending,
      },
    });

    this.logger.log(
      `Created job [${job.id}] "${job.title}" with initial status pending`,
    );
    return job;
  }

  /**
   * List all jobs, sorted by newest first, with optional status filtering.
   */
  async findAllJobs(status?: JobStatus): Promise<JobEntity[]> {
    return this.prisma.job.findMany({
      where: status ? { status } : undefined,
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get a single job by ID. Throws 404 if not found.
   */
  async findJobById(id: string): Promise<JobEntity> {
    const job = await this.prisma.job.findUnique({
      where: { id },
    });

    if (!job) {
      throw new NotFoundException(`Job with ID "${id}" was not found`);
    }

    return job;
  }

  /**
   * Aggregate job counts by status for quick dashboard metrics.
   */
  async getJobCounts(): Promise<JobCounts> {
    const counts = await this.prisma.job.groupBy({
      by: ['status'],
      _count: {
        _all: true,
      },
    });

    const statusCounts: Record<JobStatus, number> = {
      [JobStatus.pending]: 0,
      [JobStatus.running]: 0,
      [JobStatus.completed]: 0,
      [JobStatus.failed]: 0,
    };

    let total = 0;
    for (const item of counts) {
      statusCounts[item.status] = item._count._all;
      total += item._count._all;
    }

    return {
      total,
      pending: statusCounts[JobStatus.pending],
      running: statusCounts[JobStatus.running],
      completed: statusCounts[JobStatus.completed],
      failed: statusCounts[JobStatus.failed],
    };
  }

  /**
   * Atomically transitions the job's status using a PostgreSQL row-level conditional update.
   *
   * Concurrency & State Invariant Guarantees:
   * 1. Evaluates allowed source statuses for target `dto.status`.
   * 2. Executes `UPDATE ... WHERE id = $id AND status IN ($allowedPrevious)` in a transaction.
   * 3. If count === 0:
   *    - Returns 404 if job does not exist.
   *    - Returns 409 if job exists but is in an invalid/conflicting status (e.g. concurrent race).
   * 4. If count === 1:
   *    - Inserts `JobStatusHistory` record in the SAME transaction.
   *    - Returns updated job.
   */
  async updateJobStatus(
    id: string,
    dto: UpdateJobStatusDto,
  ): Promise<JobEntity> {
    const targetStatus = dto.status;

    return await this.prisma.$transaction(async (tx) => {
      // Find the existing job inside the transaction
      const existing = await tx.job.findUnique({
        where: { id },
        select: { id: true, status: true },
      });

      if (!existing) {
        throw new NotFoundException(`Job with ID "${id}" was not found`);
      }

      // If caller provided an expected current status, verify it matches
      if (dto.currentStatus && existing.status !== dto.currentStatus) {
        throw new ConflictException(
          `Cannot transition job: expected current status "${dto.currentStatus}", but job is currently "${existing.status}".`,
        );
      }

      // Verify the transition from existing.status to targetStatus is valid
      if (!isValidTransition(existing.status, targetStatus)) {
        throw new ConflictException(
          `Cannot transition job from "${existing.status}" to "${targetStatus}". Valid transitions from "${existing.status}" are: [${VALID_STATUS_TRANSITIONS[existing.status].join(', ')}].`,
        );
      }

      const expectedPrevious = existing.status;

      // PostgreSQL row-level atomic conditional update:
      // Enforces: UPDATE job WHERE id = requestedId AND status = expectedPreviousStatus
      const updateResult = await tx.job.updateMany({
        where: {
          id,
          status: expectedPrevious,
        },
        data: {
          status: targetStatus,
        },
      });

      if (updateResult.count === 0) {
        // Race condition: a concurrent transaction updated the status first
        const current = await tx.job.findUnique({
          where: { id },
          select: { status: true },
        });

        throw new ConflictException(
          `Concurrent update conflict on job "${id}". The job status changed to "${current?.status}" before this update could be applied.`,
        );
      }

      // Query the updated job
      const updatedJob = await tx.job.findUniqueOrThrow({
        where: { id },
      });

      // Record status transition in history within the same atomic transaction
      await tx.jobStatusHistory.create({
        data: {
          jobId: id,
          fromStatus: expectedPrevious,
          toStatus: targetStatus,
        },
      });

      this.logger.log(
        `Job [${id}] transitioned from "${expectedPrevious}" to "${targetStatus}"`,
      );

      return updatedJob;
    });
  }

  /**
   * Deletes a job. Associated history is removed via foreign key cascade.
   * Throws 404 if job does not exist.
   */
  async deleteJob(id: string): Promise<{ success: boolean; message: string }> {
    const existing = await this.prisma.job.findUnique({
      where: { id },
      select: { id: true, title: true },
    });

    if (!existing) {
      throw new NotFoundException(`Job with ID "${id}" was not found`);
    }

    await this.prisma.job.delete({
      where: { id },
    });

    this.logger.log(`Deleted job [${id}] "${existing.title}"`);
    return {
      success: true,
      message: `Job "${existing.title}" (${id}) was deleted successfully`,
    };
  }

  /**
   * Returns chronological status transition history for a job.
   * Throws 404 if job does not exist.
   */
  async getJobHistory(id: string): Promise<JobStatusHistoryEntity[]> {
    const existing = await this.prisma.job.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!existing) {
      throw new NotFoundException(`Job with ID "${id}" was not found`);
    }

    return this.prisma.jobStatusHistory.findMany({
      where: { jobId: id },
      orderBy: { changedAt: 'asc' },
    });
  }
}
