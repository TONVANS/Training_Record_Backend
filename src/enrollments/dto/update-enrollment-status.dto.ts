import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EnrollmentStatus } from '@prisma/client';

/**
 * DTO for updating enrollment status
 */
export class UpdateEnrollmentStatusDto {
  @ApiProperty({
    description: 'New enrollment status',
    enum: EnrollmentStatus,
    example: EnrollmentStatus.COMPLETED,
  })
  @IsEnum(EnrollmentStatus, {
    message: 'Status must be ENROLLED, IN_PROGRESS, COMPLETED, or FAILED',
  })
  @IsNotEmpty({ message: 'Status is required' })
  status: EnrollmentStatus;

  @ApiPropertyOptional({
    description: 'Certificate URL (required when status is COMPLETED)',
    example: 'https://certificates.example.com/cert-12345.pdf',
  })
  @IsOptional()
  @IsString()
  certificate_url?: string;
}
