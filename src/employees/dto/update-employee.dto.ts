import { IsOptional, IsString, IsEnum, IsEmail, IsInt } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Gender } from '@prisma/client';

/**
 * Unified DTO for updating employee profile and organization
 */
export class UpdateEmployeeDto {
  // --- Personal Information ---
  @ApiPropertyOptional({
    description: 'Employee first name (Lao)',
    example: 'ຈອນ',
  })
  @IsOptional()
  @IsString()
  first_name_la?: string;

  @ApiPropertyOptional({
    description: 'Employee last name (Lao)',
    example: 'ໂດ',
  })
  @IsOptional()
  @IsString()
  last_name_la?: string;

  @ApiPropertyOptional({
    description: 'Email address',
    example: 'employee@example.com',
  })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({
    description: 'Phone number',
    example: '+856-20-5555555',
  })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({
    description: 'Gender',
    enum: Gender,
    example: Gender.MALE,
  })
  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;

  // --- Organization Assignments (Merged here) ---
  @ApiPropertyOptional({ description: 'Department ID', example: 1 })
  @IsOptional()
  @IsInt()
  department_id?: number;

  @ApiPropertyOptional({ description: 'Division ID', example: 1 })
  @IsOptional()
  @IsInt()
  division_id?: number;

  @ApiPropertyOptional({ description: 'Unit ID', example: 1 })
  @IsOptional()
  @IsInt()
  unit_id?: number;

  @ApiPropertyOptional({ description: 'Position ID', example: 1 })
  @IsOptional()
  @IsInt()
  position_id?: number;

  @ApiPropertyOptional({ description: 'Position Code ID', example: 1 })
  @IsOptional()
  @IsInt()
  pos_code_id?: number;
}
