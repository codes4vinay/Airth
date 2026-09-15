import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { JobsService } from './jobs.service';
import { PrismaService } from '../prisma/prisma.service';
import { JobEntity, JobStatus, JobStatusHistoryEntity } from './jobs.types';
import { isValidTransition } from './jobs.constants';

describe('JobsService', () => {
  let service: JobsService;
  let mockPrisma: any;

  function makeJob(
    overrides: Partial<JobEntity> & { id: string; status: JobStatus },
  ): JobEntity {
    return {
      title: 'Test Job',
      type: 'TASK',
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    };
  }

  // In-memory simulation of PostgreSQL table state
  let jobsDb: Map<string, JobEntity>;
  let historyDb: JobStatusHistoryEntity[];

  beforeEach(async () => {
    jobsDb = new Map();
    historyDb = [];

    mockPrisma = {
      job: {
        create: jest.fn().mockImplementation(({ data }) => {
          const job = {
            id: 'job-uuid-1',
            title: data.title,
            type: data.type,
            status: data.status,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          jobsDb.set(job.id, job);
          return Promise.resolve(job);
        }),
        findMany: jest.fn().mockImplementation(({ where }) => {
          let list = Array.from(jobsDb.values());
          if (where?.status) {
            list = list.filter((j) => j.status === where.status);
          }
          return Promise.resolve(
            list.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()),
          );
        }),
        findUnique: jest.fn().mockImplementation(({ where }) => {
          return Promise.resolve(jobsDb.get(where.id) || null);
        }),
        findUniqueOrThrow: jest.fn().mockImplementation(({ where }) => {
          const job = jobsDb.get(where.id);
          if (!job) throw new Error('Not found');
          return Promise.resolve(job);
        }),
        groupBy: jest.fn().mockImplementation(() => {
          const counts: Record<string, number> = {};
          for (const job of jobsDb.values()) {
            counts[job.status] = (counts[job.status] || 0) + 1;
          }
          return Promise.resolve(
            Object.entries(counts).map(([status, count]) => ({
              status,
              _count: { _all: count },
            })),
          );
        }),
        delete: jest.fn().mockImplementation(({ where }) => {
          const job = jobsDb.get(where.id);
          jobsDb.delete(where.id);
          return Promise.resolve(job);
        }),
      },
      jobStatusHistory: {
        create: jest.fn().mockImplementation(({ data }) => {
          const record = {
            id: 'history-' + (historyDb.length + 1),
            ...data,
            changedAt: new Date(),
          };
          historyDb.push(record);
          return Promise.resolve(record);
        }),
        findMany: jest.fn().mockImplementation(({ where }) => {
          return Promise.resolve(
            historyDb
              .filter((h) => h.jobId === where.jobId)
              .sort((a, b) => a.changedAt.getTime() - b.changedAt.getTime()),
          );
        }),
      },
      // Simulate atomic PostgreSQL transaction and conditional row-level update
      $transaction: jest.fn().mockImplementation(async (callback) => {
        const tx = {
          job: {
            findUnique: jest.fn().mockImplementation(({ where }) => {
              return Promise.resolve(jobsDb.get(where.id) || null);
            }),
            findUniqueOrThrow: jest.fn().mockImplementation(({ where }) => {
              const j = jobsDb.get(where.id);
              if (!j) throw new Error('Not found');
              return Promise.resolve(j);
            }),
            // Emulates PostgreSQL: UPDATE jobs SET status = $to WHERE id = $id AND status IN ($allowed)
            updateMany: jest.fn().mockImplementation(({ where, data }) => {
              const job = jobsDb.get(where.id);
              if (!job) {
                return Promise.resolve({ count: 0 });
              }

              const allowedList: JobStatus[] = where.status?.in || [
                where.status,
              ];
              if (!allowedList.includes(job.status)) {
                return Promise.resolve({ count: 0 });
              }

              // Atomically update
              job.status = data.status;
              job.updatedAt = new Date();
              return Promise.resolve({ count: 1 });
            }),
          },
          jobStatusHistory: {
            create: jest.fn().mockImplementation(({ data }) => {
              const record = {
                id: 'history-' + (historyDb.length + 1),
                ...data,
                changedAt: new Date(),
              };
              historyDb.push(record);
              return Promise.resolve(record);
            }),
          },
        };

        return await callback(tx);
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JobsService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
      ],
    }).compile();

    service = module.get<JobsService>(JobsService);
  });

  describe('1. Creating a valid job', () => {
    it('should create a job with initial status "pending"', async () => {
      const job = await service.createJob({
        title: 'Generate financial report',
        type: 'REPORT_GEN',
      });

      expect(job).toBeDefined();
      expect(job.id).toBe('job-uuid-1');
      expect(job.title).toBe('Generate financial report');
      expect(job.type).toBe('REPORT_GEN');
      expect(job.status).toBe(JobStatus.pending);
    });
  });

  describe('2. State transition rules definition', () => {
    it('should accurately define valid transitions', () => {
      expect(isValidTransition(JobStatus.pending, JobStatus.running)).toBe(
        true,
      );
      expect(isValidTransition(JobStatus.pending, JobStatus.failed)).toBe(true);
      expect(isValidTransition(JobStatus.running, JobStatus.completed)).toBe(
        true,
      );
      expect(isValidTransition(JobStatus.running, JobStatus.failed)).toBe(true);

      // Invalid transitions
      expect(isValidTransition(JobStatus.pending, JobStatus.completed)).toBe(
        false,
      );
      expect(isValidTransition(JobStatus.completed, JobStatus.running)).toBe(
        false,
      );
      expect(isValidTransition(JobStatus.failed, JobStatus.running)).toBe(
        false,
      );
      expect(isValidTransition(JobStatus.completed, JobStatus.pending)).toBe(
        false,
      );
      expect(isValidTransition(JobStatus.failed, JobStatus.pending)).toBe(
        false,
      );
    });
  });

  describe('3. Listing and 4. Filtering jobs', () => {
    beforeEach(() => {
      jobsDb.set(
        'job-1',
        makeJob({
          id: 'job-1',
          title: 'Job 1',
          type: 'A',
          status: JobStatus.pending,
          createdAt: new Date('2026-03-15T10:00:00Z'),
        }),
      );
      jobsDb.set(
        'job-2',
        makeJob({
          id: 'job-2',
          title: 'Job 2',
          type: 'B',
          status: JobStatus.running,
          createdAt: new Date('2026-03-15T11:00:00Z'),
        }),
      );
      jobsDb.set(
        'job-3',
        makeJob({
          id: 'job-3',
          title: 'Job 3',
          type: 'C',
          status: JobStatus.completed,
          createdAt: new Date('2026-03-15T12:00:00Z'),
        }),
      );
    });

    it('should list all jobs sorted by newest first', async () => {
      const all = await service.findAllJobs();
      expect(all.length).toBe(3);
      expect(all[0].id).toBe('job-3');
      expect(all[1].id).toBe('job-2');
      expect(all[2].id).toBe('job-1');
    });

    it('should filter jobs by status', async () => {
      const runningJobs = await service.findAllJobs(JobStatus.running);
      expect(runningJobs.length).toBe(1);
      expect(runningJobs[0].id).toBe('job-2');
    });
  });

  describe('5. Valid pending -> running transition', () => {
    it('should update job from pending to running and record history', async () => {
      jobsDb.set('job-1', {
        id: 'job-1',
        title: 'Job 1',
        type: 'A',
        status: JobStatus.pending,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const updated = await service.updateJobStatus('job-1', {
        status: JobStatus.running,
      });

      expect(updated.status).toBe(JobStatus.running);
      expect(historyDb.length).toBe(1);
      expect(historyDb[0]).toMatchObject({
        jobId: 'job-1',
        fromStatus: JobStatus.pending,
        toStatus: JobStatus.running,
      });
    });
  });

  describe('6. Valid pending -> failed transition', () => {
    it('should allow transitioning directly from pending to failed', async () => {
      jobsDb.set('job-1', {
        id: 'job-1',
        title: 'Job 1',
        type: 'A',
        status: JobStatus.pending,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const updated = await service.updateJobStatus('job-1', {
        status: JobStatus.failed,
        currentStatus: JobStatus.pending,
      });

      expect(updated.status).toBe(JobStatus.failed);
      expect(historyDb[0]).toMatchObject({
        jobId: 'job-1',
        fromStatus: JobStatus.pending,
        toStatus: JobStatus.failed,
      });
    });
  });

  describe('7. Valid running -> completed transition', () => {
    it('should update status from running to completed and record history', async () => {
      jobsDb.set('job-1', {
        id: 'job-1',
        title: 'Job 1',
        type: 'A',
        status: JobStatus.running,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const updated = await service.updateJobStatus('job-1', {
        status: JobStatus.completed,
      });

      expect(updated.status).toBe(JobStatus.completed);
      expect(historyDb.length).toBe(1);
      expect(historyDb[0].fromStatus).toBe(JobStatus.running);
      expect(historyDb[0].toStatus).toBe(JobStatus.completed);
    });
  });

  describe('8. Valid running -> failed transition', () => {
    it('should update status from running to failed and record history', async () => {
      jobsDb.set('job-1', {
        id: 'job-1',
        title: 'Job 1',
        type: 'A',
        status: JobStatus.running,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const updated = await service.updateJobStatus('job-1', {
        status: JobStatus.failed,
        currentStatus: JobStatus.running,
      });

      expect(updated.status).toBe(JobStatus.failed);
      expect(historyDb.length).toBe(1);
      expect(historyDb[0].fromStatus).toBe(JobStatus.running);
      expect(historyDb[0].toStatus).toBe(JobStatus.failed);
    });
  });

  describe('9. Rejecting completed -> running', () => {
    it('should throw 409 ConflictException when attempting to restart completed job', async () => {
      jobsDb.set('job-1', {
        id: 'job-1',
        title: 'Job 1',
        type: 'A',
        status: JobStatus.completed,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await expect(
        service.updateJobStatus('job-1', { status: JobStatus.running }),
      ).rejects.toThrow(ConflictException);

      // Invariant: No history record created for failed transition
      expect(historyDb.length).toBe(0);
    });
  });

  describe('10. Rejecting failed -> running', () => {
    it('should throw 409 ConflictException when attempting to restart failed job', async () => {
      jobsDb.set('job-1', {
        id: 'job-1',
        title: 'Job 1',
        type: 'A',
        status: JobStatus.failed,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await expect(
        service.updateJobStatus('job-1', { status: JobStatus.running }),
      ).rejects.toThrow(ConflictException);

      expect(historyDb.length).toBe(0);
    });
  });

  describe('11. Deleting a job', () => {
    it('should delete existing job', async () => {
      jobsDb.set(
        'job-1',
        makeJob({
          id: 'job-1',
          title: 'To Delete',
          type: 'A',
          status: JobStatus.pending,
        }),
      );

      const result = await service.deleteJob('job-1');
      expect(result.success).toBe(true);
      expect(jobsDb.has('job-1')).toBe(false);
    });
  });

  describe('12. Missing job returns 404', () => {
    it('should throw NotFoundException if job does not exist on update', async () => {
      await expect(
        service.updateJobStatus('non-existent-id', {
          status: JobStatus.running,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if job does not exist on delete', async () => {
      await expect(service.deleteJob('non-existent-id')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException if job does not exist on getHistory', async () => {
      await expect(service.getJobHistory('non-existent-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('13. Invalid transition returns 409', () => {
    it('should reject invalid direct transition from pending to completed with 409', async () => {
      jobsDb.set('job-1', {
        id: 'job-1',
        title: 'Job 1',
        type: 'A',
        status: JobStatus.pending,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await expect(
        service.updateJobStatus('job-1', { status: JobStatus.completed }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('14. Status history is created only after successful transition', () => {
    it('should have 0 history records when transition fails', async () => {
      jobsDb.set(
        'job-1',
        makeJob({
          id: 'job-1',
          title: 'Job 1',
          type: 'A',
          status: JobStatus.completed,
        }),
      );

      try {
        await service.updateJobStatus('job-1', { status: JobStatus.running });
      } catch {
        // Expected to fail
      }

      expect(historyDb.length).toBe(0);
    });

    it('should record complete history chain across sequential transitions', async () => {
      jobsDb.set('job-1', {
        id: 'job-1',
        title: 'Job 1',
        type: 'A',
        status: JobStatus.pending,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // 1: pending -> running
      await service.updateJobStatus('job-1', { status: JobStatus.running });
      // 2: running -> completed
      await service.updateJobStatus('job-1', { status: JobStatus.completed });

      const history = await service.getJobHistory('job-1');
      expect(history.length).toBe(2);
      expect(history[0]).toMatchObject({
        fromStatus: JobStatus.pending,
        toStatus: JobStatus.running,
      });
      expect(history[1]).toMatchObject({
        fromStatus: JobStatus.running,
        toStatus: JobStatus.completed,
      });
    });
  });

  describe('15. Concurrency: Two concurrent attempts to update pending -> running result in only one success', () => {
    it('should allow only one concurrent request to succeed, while the other receives 409 Conflict', async () => {
      jobsDb.set('job-concurrent', {
        id: 'job-concurrent',
        title: 'Concurrent Target',
        type: 'TASK',
        status: JobStatus.pending,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Simulate 2 parallel requests hitting the endpoint nearly simultaneously
      const req1 = service.updateJobStatus('job-concurrent', {
        status: JobStatus.running,
      });
      const req2 = service.updateJobStatus('job-concurrent', {
        status: JobStatus.running,
      });

      const results = await Promise.allSettled([req1, req2]);

      const fulfilled = results.filter((r) => r.status === 'fulfilled');
      const rejected = results.filter((r) => r.status === 'rejected');

      expect(fulfilled.length).toBe(1);
      expect(rejected.length).toBe(1);

      const rejectedError = (rejected[0] as PromiseRejectedResult).reason;
      expect(rejectedError).toBeInstanceOf(ConflictException);

      // Verify the final status in DB is running
      expect(jobsDb.get('job-concurrent')?.status).toBe(JobStatus.running);

      // Exactly 1 history record should exist
      expect(historyDb.length).toBe(1);
    });
  });
});
