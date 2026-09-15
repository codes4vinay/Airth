import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateJobDto {
  @ApiProperty({
    description: 'Human-readable title describing the job task',
    example: 'Process user report #1042',
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty({ message: 'Title must not be empty' })
  @MaxLength(255, { message: 'Title must not exceed 255 characters' })
  title: string;

  @ApiProperty({
    description: 'Category or worker queue type for the job',
    example: 'DATA_EXPORT',
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty({ message: 'Type must not be empty' })
  @MaxLength(100, { message: 'Type must not exceed 100 characters' })
  type: string;
}
