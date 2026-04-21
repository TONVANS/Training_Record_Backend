// src/reports/reports.controller.ts
import {
  Controller, Get, Query, ParseIntPipe,
  ParseEnumPipe, UseGuards, DefaultValuePipe,
} from '@nestjs/common';
import {
  ApiTags, ApiOperation, ApiQuery,
  ApiBearerAuth, ApiResponse,
} from '@nestjs/swagger';
import { ReportsService, ReportPeriodType } from './reports.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

@ApiTags('Reports Management')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('training')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'ດຶງຂໍ້ມູນລາຍງານການຝຶກອົບຮົມພາບລວມ (Paginated)' })
  @ApiQuery({ name: 'year',     type: Number })
  @ApiQuery({ name: 'type',     enum: ReportPeriodType })
  @ApiQuery({ name: 'value',    type: Number, required: false })
  @ApiQuery({ name: 'page',     type: Number, required: false, description: 'ໜ້າ (default: 1)' })
  @ApiQuery({ name: 'pageSize', type: Number, required: false, description: 'ຈຳນວນ/ໜ້າ (default: 50)' })
  @ApiResponse({ status: 200, description: 'ດຶງຂໍ້ມູນລາຍງານສຳເລັດ' })
  async getTrainingReport(
    @Query('year',     ParseIntPipe) year: number,
    @Query('type',     new ParseEnumPipe(ReportPeriodType)) type: ReportPeriodType,
    @Query('value',    new ParseIntPipe({ optional: true })) value?: number,
    @Query('page',     new ParseIntPipe({ optional: true })) page?: number,
    @Query('pageSize', new ParseIntPipe({ optional: true })) pageSize?: number,
  ) {
    return this.reportsService.getTrainingReport(
      year,
      type,
      value || 1,
      page     || 1,
      pageSize || 50,
    );
  }

  @Get('department-training')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'ດຶງຂໍ້ມູນລາຍງານຝຶກອົບຮົມແຍກຕາມຝ່າຍ (Paginated + ຄຳນຳໜ້າ)' })
  @ApiQuery({ name: 'departmentId', type: Number })
  @ApiQuery({ name: 'year',         type: Number })
  @ApiQuery({ name: 'type',         enum: ReportPeriodType })
  @ApiQuery({ name: 'value',        type: Number, required: false })
  @ApiQuery({ name: 'page',         type: Number, required: false })
  @ApiQuery({ name: 'pageSize',     type: Number, required: false })
  @ApiResponse({ status: 200, description: 'ດຶງຂໍ້ມູນລາຍງານຝ່າຍສຳເລັດ' })
  async getDepartmentTrainingReport(
    @Query('departmentId', ParseIntPipe) departmentId: number,
    @Query('year',         ParseIntPipe) year: number,
    @Query('type',         new ParseEnumPipe(ReportPeriodType)) type: ReportPeriodType,
    @Query('value',        new ParseIntPipe({ optional: true })) value?: number,
    @Query('page',         new ParseIntPipe({ optional: true })) page?: number,
    @Query('pageSize',     new ParseIntPipe({ optional: true })) pageSize?: number,
  ) {
    return this.reportsService.getDepartmentTrainingReport(
      departmentId,
      year,
      type,
      value    || 1,
      page     || 1,
      pageSize || 30,
    );
  }
}