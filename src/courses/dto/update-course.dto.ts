import { PartialType } from '@nestjs/swagger';
import { CreateCourseDto } from './create-course.dto';

/**
 * DTO for updating a course
 * All fields from CreateCourseDto are optional
 */
export class UpdateCourseDto extends PartialType(CreateCourseDto) {}
