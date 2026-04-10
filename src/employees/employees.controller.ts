// src/employees/employees.controller.ts
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {
  Controller,
  Get,
  Put,
  Body,
  Param,
  ParseIntPipe,
  UseGuards,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '@prisma/client';
import { EmployeeService } from './employees.service';

/**
 * EmployeeController handles all employee related operations:
 * - Profile management (User)
 * - Course viewing (User)
 * - Organization structure & Assignments (Admin)
 */
@ApiTags('Employee Management')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('employees')
export class EmployeeController {
  constructor(private readonly employeeService: EmployeeService) { }

  // ==================================================================
  // 1. USER SELF-SERVICE ENDPOINTS (Accessible by authenticated users)
  // ==================================================================

  @Get('profile')
  @ApiOperation({ summary: 'Get current user profile (Detailed)' })
  @ApiResponse({ status: 200, description: 'Profile retrieved successfully' })
  async getProfile(@CurrentUser() user: any) {
    return this.employeeService.findOne(user.id);
  }

  @Put('profile')
  @ApiOperation({ summary: 'Update current user profile' })
  @ApiResponse({ status: 200, description: 'Profile updated successfully' })
  async updateProfile(
    @CurrentUser() user: any,
    @Body() updateDto: UpdateEmployeeDto,
  ) {
    return this.employeeService.update(user.id, updateDto);
  }

  @Get('my-courses')
  @ApiOperation({
    summary: 'Get courses enrolled by the current user',
    description:
      'Returns courses categorized as: upcoming, active, completed, and failed',
  })
  @ApiResponse({ status: 200, description: 'Courses retrieved successfully' })
  async getMyCourses(@CurrentUser() user: any) {
    return this.employeeService.getMyCourses(user.id);
  }

  // ==================================================================
  // 2. ADMIN ENDPOINTS (Accessible only by ADMIN)
  // ==================================================================

  @Get('training-stats')
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Get all employees with their total course count (Admin only)',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page (default: 10)' })
  @ApiQuery({ name: 'employee_code', required: false, type: String, description: 'Filter by employee code' })
  @ApiResponse({ status: 200, description: 'Stats retrieved successfully' })
  async getEmployeesCourseCount(
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
    @Query('employee_code') employee_code?: string,
  ) {
    return this.employeeService.getEmployeesCourseCount({ page, limit, employee_code });
  }

  @Get('summary')
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Get organizational structure summary (Admin only)',
    description:
      'Returns counts of departments, divisions, units, and employees',
  })
  @ApiResponse({ status: 200, description: 'Summary retrieved successfully' })
  async getOrganizationSummary() {
    return this.employeeService.getOrganizationSummary();
  }

  @Get('departments/all')
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Get all departments (Admin only)',
  })
  @ApiResponse({ status: 200, description: 'Departments retrieved successfully' })
  async getAllDepartments() {
    return this.employeeService.getAllDepartments();
  }

  @Get()
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Get all employees with pagination and filters (Admin only)',
    description: 'Filter by organization unit IDs and search with Pagination',
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'department_id', required: false, type: Number })
  @ApiQuery({ name: 'division_id', required: false, type: Number })
  @ApiQuery({ name: 'unit_id', required: false, type: Number })
  @ApiQuery({ name: 'position_id', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Employees retrieved successfully' })
  async getAllEmployees(
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
    @Query('search') search?: string,
    @Query('department_id', new ParseIntPipe({ optional: true })) department_id?: number,
    @Query('division_id', new ParseIntPipe({ optional: true })) division_id?: number,
    @Query('unit_id', new ParseIntPipe({ optional: true })) unit_id?: number,
    @Query('position_id', new ParseIntPipe({ optional: true })) position_id?: number,
  ) {
    return this.employeeService.findAll({
      page,
      limit,
      search,
      department_id,
      division_id,
      unit_id,
      position_id,
    });
  }

  @Get('code/:code')
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Get employee by Employee Code (Admin only)',
  })
  @ApiResponse({ status: 200, description: 'Employee retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Employee not found' })
  async getEmployeeByCode(@Param('code') code: string) {
    return this.employeeService.findByCode(code);
  }

  @Get(':id/courses')
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Get all courses attended by a specific employee (Admin only)',
  })
  @ApiResponse({ status: 200, description: 'Courses retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Employee not found' })
  async getEmployeeCourses(@Param('id', ParseIntPipe) id: number) {
    return this.employeeService.getEmployeeCourses(id);
  }

  @Get(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Get employee by ID with full details (Admin only)',
  })
  @ApiResponse({ status: 200, description: 'Employee retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Employee not found' })
  async getEmployee(@Param('id', ParseIntPipe) id: number) {
    return this.employeeService.findOne(id);
  }

  @Put(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Update employee profile or organization (Admin only)',
    description:
      'Can update personal info AND move employee to different department/unit',
  })
  @ApiResponse({ status: 200, description: 'Employee updated successfully' })
  @ApiResponse({ status: 404, description: 'Employee not found' })
  async updateEmployee(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateEmployeeDto,
  ) {
    return this.employeeService.update(id, updateDto);
  }
}