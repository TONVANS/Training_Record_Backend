// src/dashboard/dashboard.controller.ts
import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

/**
 * DashboardController provides analytics and metrics endpoints
 */
@ApiTags('Dashboard & Analytics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('metrics')
  @ApiOperation({
    summary: 'Get comprehensive dashboard metrics',
    description: `
      Returns aggregated metrics including:
      - Total employees, courses, and enrollments
      - Active and upcoming courses count
      - Total annual budget used (filtered by date range)
      - Enrollment breakdown by status
      - Course breakdown by format
    `,
  })
  @ApiQuery({
    name: 'startDate',
    required: false,
    type: String,
    description: 'Start date for filtering courses (ISO 8601 format)',
    example: '2026-01-01',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    type: String,
    description: 'End date for filtering courses (ISO 8601 format)',
    example: '2026-12-31',
  })
  @ApiResponse({ status: 200, description: 'Metrics retrieved successfully' })
  async getMetrics(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.dashboardService.getMetrics(startDate, endDate);
  }

  @Get('upcoming')
  @ApiOperation({
    summary: 'Get upcoming courses (next 7-30 days)',
    description:
      'Serves as the notification/display system for upcoming training courses. Can be filtered by date range.',
  })
  @ApiQuery({
    name: 'days',
    required: false,
    type: Number,
    description: 'Number of days to look ahead (default: 30)',
  })
  @ApiQuery({
    name: 'startDate',
    required: false,
    type: String,
    description: 'Start date for filtering courses (ISO 8601 format)',
    example: '2026-01-01',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    type: String,
    description: 'End date for filtering courses (ISO 8601 format)',
    example: '2026-12-31',
  })
  @ApiResponse({
    status: 200,
    description: 'Upcoming courses retrieved successfully',
  })
  async getUpcomingCourses(
    @Query('days') days?: number,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const daysAhead = days ? Number(days) : 30;
    return this.dashboardService.getUpcomingCourses(
      daysAhead,
      startDate,
      endDate,
    );
  }

  @Get('top-courses')
  @ApiOperation({
    summary: 'Get top performing courses by completion rate',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of courses to return (default: 10)',
  })
  @ApiQuery({
    name: 'startDate',
    required: false,
    type: String,
    description: 'Start date for filtering courses (ISO 8601 format)',
    example: '2026-01-01',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    type: String,
    description: 'End date for filtering courses (ISO 8601 format)',
    example: '2026-12-31',
  })
  @ApiResponse({
    status: 200,
    description: 'Top courses retrieved successfully',
  })
  async getTopPerformingCourses(
    @Query('limit') limit?: number,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const courseLimit = limit ? Number(limit) : 10;
    return this.dashboardService.getTopPerformingCourses(
      courseLimit,
      startDate,
      endDate,
    );
  }

  @Get('department-stats')
  @ApiOperation({
    summary: 'Get department-wise training statistics',
    description: `
      Returns statistics for each department including:
      - Total employees
      - Total and completed enrollments
      - Completion rate
      - Average enrollments per employee
    `,
  })
  @ApiResponse({
    status: 200,
    description: 'Department statistics retrieved successfully',
  })
  async getDepartmentStatistics() {
    return this.dashboardService.getDepartmentStatistics();
  }
}
