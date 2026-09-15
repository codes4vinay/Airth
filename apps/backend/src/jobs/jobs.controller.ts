import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { JobsService } from './jobs.service';
import { CreateJobDto } from './dto/create-job.dto';
import { UpdateJobStatusDto } from './dto/update-job-status.dto';
import { FilterJobsDto } from './dto/filter-jobs.dto';
import {
  JobCounts,
  JobEntity,
  JobStatus,
  JobStatusHistoryEntity,
} from './jobs.types';

@ApiTags('jobs')
@Controller('jobs')
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new job in pending status' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Job created successfully',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Validation failed on input data',
  })
  createJob(@Body() dto: CreateJobDto): Promise<JobEntity> {
    return this.jobsService.createJob(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all jobs with optional status filter' })
  @ApiQuery({
    name: 'status',
    enum: JobStatus,
    required: false,
    description: 'Filter jobs by status',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of jobs sorted by newest first',
  })
  findAllJobs(@Query() filter: FilterJobsDto): Promise<JobEntity[]> {
    return this.jobsService.findAllJobs(filter.status);
  }

  @Get('counts')
  @ApiOperation({ summary: 'Get total job counts grouped by status' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Summary metrics of jobs per status',
  })
  getJobCounts(): Promise<JobCounts> {
    return this.jobsService.getJobCounts();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific job by ID' })
  @ApiParam({ name: 'id', description: 'Job UUID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Job details retrieved',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Job was not found',
  })
  findJobById(@Param('id') id: string): Promise<JobEntity> {
    return this.jobsService.findJobById(id);
  }

  @Patch(':id/status')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Atomically update job status and append to status history',
    description:
      'Performs a PostgreSQL row-level atomic conditional update. Rejects invalid transitions with 409 Conflict.',
  })
  @ApiParam({ name: 'id', description: 'Job UUID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Status updated successfully',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Malformed input or unallowed status string',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Job does not exist',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Invalid transition or concurrent conflict',
  })
  updateJobStatus(
    @Param('id') id: string,
    @Body() dto: UpdateJobStatusDto,
  ): Promise<JobEntity> {
    return this.jobsService.updateJobStatus(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a job and its associated status history' })
  @ApiParam({ name: 'id', description: 'Job UUID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Job deleted successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Job was not found',
  })
  deleteJob(
    @Param('id') id: string,
  ): Promise<{ success: boolean; message: string }> {
    return this.jobsService.deleteJob(id);
  }

  @Get(':id/history')
  @ApiOperation({ summary: 'Get transition history for a specific job' })
  @ApiParam({ name: 'id', description: 'Job UUID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Chronological status transition history',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Job was not found',
  })
  getJobHistory(@Param('id') id: string): Promise<JobStatusHistoryEntity[]> {
    return this.jobsService.getJobHistory(id);
  }
}
