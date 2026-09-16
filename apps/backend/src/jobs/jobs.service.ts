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

  async findAllJobs(status?: JobStatus): Promise<JobEntity[]> {
    return this.prisma.job.findMany({
      where: status ? { status } : undefined,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findJobById(id: string): Promise<JobEntity> {
    const job = await this.prisma.job.findUnique({
      where: { id },
    });

    if (!job) {
      throw new NotFoundException(`Job with ID "${id}" was not found`);
    }

    return job;
  }

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

  async updateJobStatus(
    id: string,
    dto: UpdateJobStatusDto,
  ): Promise<JobEntity> {
    const targetStatus = dto.status;

    return await this.prisma.$transaction(async (tx) => {
      const existing = await tx.job.findUnique({
        where: { id },
        select: { id: true, status: true },
      });

      if (!existing) {
        throw new NotFoundException(`Job with ID "${id}" was not found`);
      }

      if (dto.currentStatus && existing.status !== dto.currentStatus) {
        throw new ConflictException(
          `Cannot transition job: expected status "${dto.currentStatus}", but current status is "${existing.status}".`,
        );
      }

      if (!isValidTransition(existing.status, targetStatus)) {
        throw new ConflictException(
          `Cannot transition job from "${existing.status}" to "${targetStatus}". Valid next statuses: [${VALID_STATUS_TRANSITIONS[existing.status].join(', ')}].`,
        );
      }

      const expectedPrevious = existing.status;

      // Conditional update: only matches if the row is still in the expected state.
      // If a concurrent request moved it first, 0 rows are updated and we throw 409.
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
        const current = await tx.job.findUnique({
          where: { id },
          select: { status: true },
        });

        throw new ConflictException(
          `Concurrent update conflict on job "${id}". Status was modified to "${current?.status}" by another request.`,
        );
      }

      const updatedJob = await tx.job.findUniqueOrThrow({
        where: { id },
      });

      // Keep audit history in the same transaction so it never drifts from job state
      await tx.jobStatusHistory.create({
        data: {
          jobId: id,
          fromStatus: expectedPrevious,
          toStatus: targetStatus,
        },
      });

      this.logger.log(
        `Job [${id}] transitioned: ${expectedPrevious} -> ${targetStatus}`,
      );

      return updatedJob;
    });
  }

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
