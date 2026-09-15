import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { JobStatus } from '../jobs.types';

export class FilterJobsDto {
  @ApiPropertyOptional({
    enum: JobStatus,
    description: 'Filter jobs by status',
    example: JobStatus.pending,
  })
  @IsOptional()
  @IsEnum(JobStatus, {
    message: `Status must be one of: ${Object.values(JobStatus).join(', ')}`,
  })
  status?: JobStatus;
}
