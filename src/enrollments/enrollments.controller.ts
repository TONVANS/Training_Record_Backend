// enrollments.controller.ts
import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import {
  CreateEnrollmentDto,
  BulkEnrollmentDto,
} from './dto/create-enrollment.dto';
import { UpdateEnrollmentStatusDto } from './dto/update-enrollment-status.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { EnrollmentService } from './enrollments.service';

/**
 * EnrollmentController handles course enrollment operations
 */
@ApiTags('Enrollment Management')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('enrollments')
export class EnrollmentController {
  constructor(private readonly enrollmentService: EnrollmentService) {}

  @Post()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Enroll an employee in a course (Admin only)' })
  @ApiResponse({ status: 201, description: 'Employee enrolled successfully' })
  @ApiResponse({ status: 404, description: 'Employee or course not found' })
  @ApiResponse({ status: 409, description: 'Employee already enrolled' })
  async createEnrollment(@Body() createEnrollmentDto: CreateEnrollmentDto) {
    return this.enrollmentService.createEnrollment(createEnrollmentDto);
  }

  @Post('bulk')
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Bulk enroll multiple employees in a course (Admin only)',
  })
  @ApiResponse({ status: 201, description: 'Employees enrolled successfully' })
  @ApiResponse({
    status: 404,
    description: 'Course or some employees not found',
  })
  @ApiResponse({ status: 409, description: 'Some employees already enrolled' })
  async bulkEnrollment(@Body() bulkEnrollmentDto: BulkEnrollmentDto) {
    return this.enrollmentService.bulkEnrollment(bulkEnrollmentDto);
  }

  @Get()
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Get all enrollments with optional filters (Admin only)',
  })
  @ApiQuery({ name: 'employee_id', required: false, type: Number })
  @ApiQuery({ name: 'course_id', required: false, type: Number })
  @ApiResponse({
    status: 200,
    description: 'Enrollments retrieved successfully',
  })
  async getEnrollments(
    @Query('employee_id') employeeId?: number,
    @Query('course_id') courseId?: number,
  ) {
    return this.enrollmentService.getEnrollments(
      employeeId ? Number(employeeId) : undefined,
      courseId ? Number(courseId) : undefined,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single enrollment by ID' })
  @ApiResponse({
    status: 200,
    description: 'Enrollment retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Enrollment not found' })
  async getEnrollment(@Param('id', ParseIntPipe) id: number) {
    return this.enrollmentService.getEnrollment(id);
  }

  @Patch(':id/status')
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Update enrollment status (Admin only)',
    description: `
      Valid status transitions:
      - ENROLLED → IN_PROGRESS, COMPLETED, FAILED
      - IN_PROGRESS → COMPLETED, FAILED
      - COMPLETED → (no transitions allowed)
      - FAILED → (no transitions allowed)
    `,
  })
  @ApiResponse({
    status: 200,
    description: 'Enrollment status updated successfully',
  })
  @ApiResponse({ status: 400, description: 'Invalid status transition' })
  @ApiResponse({ status: 404, description: 'Enrollment not found' })
  async updateEnrollmentStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateEnrollmentStatusDto,
  ) {
    return this.enrollmentService.updateEnrollmentStatus(id, updateDto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Delete an enrollment (Admin only)' })
  @ApiResponse({ status: 200, description: 'Enrollment deleted successfully' })
  @ApiResponse({ status: 404, description: 'Enrollment not found' })
  async deleteEnrollment(@Param('id', ParseIntPipe) id: number) {
    return this.enrollmentService.deleteEnrollment(id);
  }
}
