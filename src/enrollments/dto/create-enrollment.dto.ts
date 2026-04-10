import { IsInt, IsNotEmpty, IsArray, ArrayMinSize } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

/**
 * DTO for creating a single enrollment
 */
export class CreateEnrollmentDto {
  @ApiProperty({
    description: 'Employee ID to enroll',
    example: 1,
  })
  @IsInt()
  @IsNotEmpty({ message: 'Employee ID is required' })
  @Type(() => Number)
  employee_id: number;

  @ApiProperty({
    description: 'Course ID to enroll in',
    example: 1,
  })
  @IsInt()
  @IsNotEmpty({ message: 'Course ID is required' })
  @Type(() => Number)
  course_id: number;
}

/**
 * DTO for bulk enrollment
 */
export class BulkEnrollmentDto {
  @ApiProperty({
    description: 'Array of employee IDs to enroll',
    example: [1, 2, 3],
    type: [Number],
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'At least one employee ID is required' })
  @IsInt({ each: true })
  @Type(() => Number)
  employee_ids: number[];

  @ApiProperty({
    description: 'Course ID to enroll employees in',
    example: 1,
  })
  @IsInt()
  @IsNotEmpty({ message: 'Course ID is required' })
  @Type(() => Number)
  course_id: number;
}
