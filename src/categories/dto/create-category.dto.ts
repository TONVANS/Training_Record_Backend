import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO for creating a training category
 */
export class CreateCategoryDto {
  @ApiProperty({
    description: 'Category name',
    example: 'Technical Skills',
  })
  @IsString()
  @IsNotEmpty({ message: 'Category name is required' })
  name: string;
}
