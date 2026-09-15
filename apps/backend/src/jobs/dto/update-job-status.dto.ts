import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { JobStatus } from '../jobs.types';

export class UpdateJobStatusDto {
  @ApiProperty({
    enum: JobStatus,
    description: 'The requested next status for the job',
    example: JobStatus.running,
  })
  @IsEnum(JobStatus, {
    message: `Status must be one of: ${Object.values(JobStatus).join(', ')}`,
  })
  status: JobStatus;

  @ApiPropertyOptional({
    enum: JobStatus,
    description:
      'Optional expected previous status. If provided, the update will atomically verify that the job is currently in this status before transitioning.',
    example: JobStatus.pending,
  })
  @IsOptional()
  @IsEnum(JobStatus, {
    message: `Current status must be one of: ${Object.values(JobStatus).join(', ')}`,
  })
  currentStatus?: JobStatus;
}
