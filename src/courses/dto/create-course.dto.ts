import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsNumber,
  IsDateString,
  IsEnum,
  IsArray,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { TrainingFormat, LocationType, CourseStatus } from '@prisma/client';

export class CreateCourseDto {
  @ApiProperty({ description: 'Title of the course' })
  @IsNotEmpty()
  @IsString()
  title: string;

  @ApiPropertyOptional({ description: 'Course description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Category ID' })
  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber()
  category_id: number;

  @ApiProperty({ description: 'Start date of the course' })
  @IsNotEmpty()
  @IsDateString()
  start_date: string;

  @ApiProperty({ description: 'End date of the course' })
  @IsNotEmpty()
  @IsDateString()
  end_date: string;

  @ApiPropertyOptional({ enum: TrainingFormat, default: TrainingFormat.ONLINE })
  @IsOptional()
  @IsEnum(TrainingFormat)
  format?: TrainingFormat;

  @ApiPropertyOptional({ enum: LocationType })
  @IsOptional()
  @IsEnum(LocationType)
  location_type?: LocationType;

  @ApiPropertyOptional({ description: 'Meeting link or Venue name' })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional({ description: 'Country name (if international)' })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiPropertyOptional({ description: 'Budget allocated' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  budget?: number;

  @ApiPropertyOptional({ enum: CourseStatus })
  @IsOptional()
  @IsEnum(CourseStatus)
  status?: CourseStatus;

  // ========== ຂໍ້ມູນໃໝ່ທີ່ເພີ່ມມາຕາມ Schema ==========
  @ApiPropertyOptional({ description: 'Name of the trainer/instructor' })
  @IsOptional()
  @IsString()
  trainer?: string;

  @ApiPropertyOptional({ description: 'Training institution' })
  @IsOptional()
  @IsString()
  institution?: string;

  @ApiPropertyOptional({ description: 'Organization hosting the training' })
  @IsOptional()
  @IsString()
  organization?: string;

  @ApiPropertyOptional({
    description: 'Array of employee IDs to enroll immediately',
    type: [Number],
  })
  @IsOptional()
  @IsArray()
  @Type(() => Number)
  employee_ids?: number[];
}