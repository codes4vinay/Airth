import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { JobsController } from './jobs.controller';
import { JobsService } from './jobs.service';
import { JobStatus } from './jobs.types';
import { HttpExceptionFilter } from '../common/filters/http-exception.filter';

describe('JobsController (HTTP API Integration)', () => {
  let app: INestApplication;
  let mockJobsService: any;

  beforeEach(async () => {
    mockJobsService = {
      createJob: jest.fn().mockImplementation((dto) =>
        Promise.resolve({
          id: 'test-uuid-1',
          title: dto.title,
          type: dto.type,
          status: JobStatus.pending,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }),
      ),
      findAllJobs: jest.fn().mockResolvedValue([]),
      getJobCounts: jest.fn().mockResolvedValue({
        total: 10,
        pending: 4,
        running: 3,
        completed: 2,
        failed: 1,
      }),
      findJobById: jest.fn().mockImplementation((id) =>
        Promise.resolve({
          id,
          title: 'Job 1',
          type: 'EXPORT',
          status: JobStatus.pending,
          createdAt: new Date().toISOString(),
        }),
      ),
      updateJobStatus: jest.fn().mockImplementation((id, dto) =>
        Promise.resolve({
          id,
          title: 'Job 1',
          type: 'EXPORT',
          status: dto.status,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }),
      ),
      deleteJob: jest.fn().mockResolvedValue({
        success: true,
        message: 'Job deleted successfully',
      }),
      getJobHistory: jest.fn().mockResolvedValue([]),
    };

    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [JobsController],
      providers: [
        {
          provide: JobsService,
          useValue: mockJobsService,
        },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.useGlobalFilters(new HttpExceptionFilter());
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('POST /jobs', () => {
    it('should create job and return 201 for valid input', async () => {
      const res = await request(app.getHttpServer())
        .post('/jobs')
        .send({ title: 'New Job', type: 'TASK' })
        .expect(201);

      expect(res.body).toHaveProperty('id', 'test-uuid-1');
      expect(res.body.status).toBe(JobStatus.pending);
    });

    it('should reject with 400 when title is missing or empty', async () => {
      const res = await request(app.getHttpServer())
        .post('/jobs')
        .send({ title: '', type: 'TASK' })
        .expect(400);

      expect(res.body).toHaveProperty('statusCode', 400);
      expect(res.body).toHaveProperty('error', 'Bad Request');
    });

    it('should reject with 400 when unexpected fields are passed', async () => {
      await request(app.getHttpServer())
        .post('/jobs')
        .send({ title: 'Valid Title', type: 'TASK', rogueField: 'danger' })
        .expect(400);
    });
  });

  describe('GET /jobs', () => {
    it('should return 200 with list of jobs', async () => {
      const res = await request(app.getHttpServer()).get('/jobs').expect(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('should pass status query filter to service', async () => {
      await request(app.getHttpServer())
        .get('/jobs?status=running')
        .expect(200);

      expect(mockJobsService.findAllJobs).toHaveBeenCalledWith(
        JobStatus.running,
      );
    });

    it('should reject invalid status query parameter with 400', async () => {
      await request(app.getHttpServer())
        .get('/jobs?status=invalid_status')
        .expect(400);
    });
  });

  describe('GET /jobs/counts', () => {
    it('should return summary counts grouped by status', async () => {
      const res = await request(app.getHttpServer())
        .get('/jobs/counts')
        .expect(200);

      expect(res.body).toMatchObject({
        total: 10,
        pending: 4,
        running: 3,
        completed: 2,
        failed: 1,
      });
    });
  });

  describe('PATCH /jobs/:id/status', () => {
    it('should return 200 on valid status update', async () => {
      const res = await request(app.getHttpServer())
        .patch('/jobs/test-uuid-1/status')
        .send({ status: JobStatus.running })
        .expect(200);

      expect(res.body.status).toBe(JobStatus.running);
    });

    it('should reject invalid status string with 400', async () => {
      await request(app.getHttpServer())
        .patch('/jobs/test-uuid-1/status')
        .send({ status: 'invalid_status' })
        .expect(400);
    });
  });

  describe('DELETE /jobs/:id', () => {
    it('should return 200 when deleting a job', async () => {
      const res = await request(app.getHttpServer())
        .delete('/jobs/test-uuid-1')
        .expect(200);

      expect(res.body.success).toBe(true);
    });
  });
});
