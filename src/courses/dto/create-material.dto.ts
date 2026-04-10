// src/courses/dto/create-material.dto.ts
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {
  IsEnum,
  IsString,
  IsUrl,
  ValidateIf,
  IsOptional,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MaterialType } from '@prisma/client';

export class CreateMaterialDto {
  @ApiProperty({
    description: 'Material type',
    enum: MaterialType,
    example: MaterialType.PDF,
  })
  @IsEnum(MaterialType, { message: 'Type must be either PDF, URL, VIDEO, or DOC' })
  @IsOptional()
  type: MaterialType;

  @ApiProperty({
    description: 'File path (for PDF) or URL link',
    example: '/uploads/course-materials/typescript-guide.pdf',
  })
  @IsString()
  @IsOptional()
  file_path_or_link: string;
}

export class AddMaterialsDto {
  @ApiPropertyOptional({
    description: 'JSON string of URL materials. Example: [{"type":"URL","file_path_or_link":"https://..."}]',
  })
  @IsOptional()
  @IsString()
  urls_json?: string;
}
