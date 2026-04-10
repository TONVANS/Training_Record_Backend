// src/sync/sync.controller.ts
import { Controller, Param, Post } from '@nestjs/common';
import { SyncService } from './sync.service';

@Controller('sync')
export class SyncController {
  constructor(private readonly syncService: SyncService) { }

  @Post('all')
  async syncAll() {
    const results = await this.syncService.syncAll();
    return { success: true, results };
  }

  @Post('departments')
  async syncDepartments() {
    return this.syncService.syncDepartments();
  }

  @Post('divisions')
  async syncDivisions() {
    return this.syncService.syncDivisions();
  }

  @Post('units')
  async syncUnits() {
    return this.syncService.syncUnits();
  }

  @Post('position-groups')
  async syncPositionGroups() {
    return this.syncService.syncPositionGroups();
  }

  @Post('position-codes')
  async syncPositionCodes() {
    return this.syncService.syncPositionCodes();
  }

  @Post('positions')
  async syncPositions() {
    return this.syncService.syncPositions();
  }

  @Post('employees/all')
  async syncAllEmployees() {
    const results = await this.syncService.syncAllEmployees();
    const total = results.reduce((s, r) => s + r.synced, 0);
    const errors = results.reduce((s, r) => s + r.errors, 0);
    return { success: true, total_synced: total, total_errors: errors, results };
  }

  @Post('employees/department/:id')
  async syncEmployeesByDept(@Param('id') id: string) {
    const result = await this.syncService.syncEmployeesByDepartment(+id);
    return { success: true, result };
  }
}
