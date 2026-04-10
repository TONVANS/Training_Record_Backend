// src/reports/reports.controller.ts
import { Controller, Get, Query, ParseIntPipe, ParseEnumPipe, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
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
  @ApiOperation({ 
    summary: 'ດຶງຂໍ້ມູນລາຍງານການຝຶກອົບຮົມພາບລວມ',
    description: 'ໃຊ້ສຳລັບດຶງຂໍ້ມູນໄປສະແດງໃນຕາຕະລາງລາຍງານ PDF'
  })
  @ApiQuery({ name: 'year', type: Number })
  @ApiQuery({ name: 'type', enum: ReportPeriodType })
  @ApiQuery({ name: 'value', type: Number, required: false })
  @ApiResponse({ status: 200, description: 'ດຶງຂໍ້ມູນລາຍງານສຳເລັດ' })
  async getTrainingReport(
    @Query('year', ParseIntPipe) year: number,
    @Query('type', new ParseEnumPipe(ReportPeriodType)) type: ReportPeriodType,
    @Query('value', new ParseIntPipe({ optional: true })) value?: number,
  ) {
    const periodValue = value || 1; 
    return this.reportsService.getTrainingReport(year, type, periodValue);
  }

  // ==========================================
  // ເພີ່ມ Endpoint ໃໝ່ ສຳລັບລາຍງານແຍກຕາມຝ່າຍ
  // ==========================================
  @Get('department-training')
  @Roles(Role.ADMIN) 
  @ApiOperation({ 
    summary: 'ດຶງຂໍ້ມູນລາຍງານການຝຶກອົບຮົມແຍກຕາມຝ່າຍ (Department)',
    description: 'ມີລາຍລະອຽດພະນັກງານທີ່ເຂົ້າຮ່ວມ (ລະຫັດ, ຊື່-ນາມສະກຸນ, ຕຳແໜ່ງ, ພາກສ່ວນ)'
  })
  @ApiQuery({ name: 'departmentId', type: Number, description: 'ID ຂອງຝ່າຍທີ່ຕ້ອງການເບິ່ງລາຍງານ' })
  @ApiQuery({ name: 'year', type: Number, description: 'ປີ (ເຊັ່ນ: 2026)' })
  @ApiQuery({ name: 'type', enum: ReportPeriodType, description: 'ປະເພດລາຍງານ' })
  @ApiQuery({ name: 'value', type: Number, required: false, description: 'ຄ່າຂອງປະເພດ (1-12, 1-4, 1-2)' })
  @ApiResponse({ status: 200, description: 'ດຶງຂໍ້ມູນລາຍງານຝ່າຍສຳເລັດ' })
  async getDepartmentTrainingReport(
    @Query('departmentId', ParseIntPipe) departmentId: number,
    @Query('year', ParseIntPipe) year: number,
    @Query('type', new ParseEnumPipe(ReportPeriodType)) type: ReportPeriodType,
    @Query('value', new ParseIntPipe({ optional: true })) value?: number,
  ) {
    const periodValue = value || 1; 
    return this.reportsService.getDepartmentTrainingReport(departmentId, year, type, periodValue);
  }
}