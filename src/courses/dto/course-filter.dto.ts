import {
  IsOptional,
  IsEnum,
  IsDateString,
  IsInt,
  Min,
  Max,
  IsString,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { CourseStatus, TrainingFormat } from '@prisma/client';

/**
 * DTO for filtering and paginating courses
 */
export class CourseFilterDto {
  // ========== PAGINATION ==========

  @ApiPropertyOptional({
    description: 'Page number (starts at 1)',
    example: 1,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Number of items per page',
    example: 10,
    default: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  // ========== FILTERS ==========

  @ApiPropertyOptional({
    description: 'Filter by course title (partial match)',
    example: 'Leadership',
  })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({
    description: 'Filter by category ID',
    example: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  category_id?: number;

  @ApiPropertyOptional({
    description: 'Filter by course status',
    enum: CourseStatus,
    example: CourseStatus.ACTIVE,
  })
  @IsOptional()
  @IsEnum(CourseStatus)
  status?: CourseStatus;

  @ApiPropertyOptional({
    description: 'Filter by training format',
    enum: TrainingFormat,
    example: TrainingFormat.ONLINE,
  })
  @IsOptional()
  @IsEnum(TrainingFormat)
  format?: TrainingFormat;

  // ========== DATE RANGE FILTERS ==========

  @ApiPropertyOptional({
    description: 'Filter courses starting on or after this date (ISO 8601)',
    example: '2026-03-01T00:00:00Z',
  })
  @IsOptional()
  @IsDateString()
  start_date_from?: string;

  @ApiPropertyOptional({
    description: 'Filter courses starting on or before this date (ISO 8601)',
    example: '2026-03-31T23:59:59Z',
  })
  @IsOptional()
  @IsDateString()
  start_date_to?: string;

  @ApiPropertyOptional({
    description: 'Filter courses ending on or after this date (ISO 8601)',
    example: '2026-03-01T00:00:00Z',
  })
  @IsOptional()
  @IsDateString()
  end_date_from?: string;

  @ApiPropertyOptional({
    description: 'Filter courses ending on or before this date (ISO 8601)',
    example: '2026-03-31T23:59:59Z',
  })
  @IsOptional()
  @IsDateString()
  end_date_to?: string;
}