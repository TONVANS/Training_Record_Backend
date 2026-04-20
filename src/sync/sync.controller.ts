// src/sync/sync.controller.ts
import { Controller, Param, Post, Sse, MessageEvent, Res } from '@nestjs/common';
import { Response } from 'express';
import { SyncService } from './sync.service';
import { Observable, Subject } from 'rxjs';

@Controller('sync')
export class SyncController {
  constructor(private readonly syncService: SyncService) { }

  // ================================================================
  // STANDARD (non-streaming) endpoints — ยังคงไว้สำหรับ backward compat
  // ================================================================

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

  @Post('employees/department/:id')
  async syncEmployeesByDept(@Param('id') id: string) {
    const result = await this.syncService.syncEmployeesByDepartment(+id);
    return { success: true, result };
  }

  // ================================================================
  // SSE STREAMING ENDPOINTS — ส่ง progress เป็น % แบบ real-time
  // ================================================================

  /**
   * GET /sync/stream/all
   * Stream progress ของ syncAll (ทุก entity ยกเว้น employees)
   */
  @Sse('stream/all')
  streamSyncAll(): Observable<MessageEvent> {
    const subject = new Subject<MessageEvent>();

    this.syncService.syncAllWithProgress((event) => {
      subject.next({ data: event } as MessageEvent);
    }).then(() => {
      subject.complete();
    }).catch((err) => {
      subject.next({ data: { type: 'error', message: err.message } } as MessageEvent);
      subject.complete();
    });

    return subject.asObservable();
  }

  /**
   * GET /sync/stream/employees/all
   * Stream progress ของ syncAllEmployees แบบ real-time
   */
  @Sse('stream/employees/all')
  streamSyncAllEmployees(): Observable<MessageEvent> {
    const subject = new Subject<MessageEvent>();

    this.syncService.syncAllEmployeesWithProgress((event) => {
      subject.next({ data: event } as MessageEvent);
    }).then(() => {
      subject.complete();
    }).catch((err) => {
      subject.next({ data: { type: 'error', message: err.message } } as MessageEvent);
      subject.complete();
    });

    return subject.asObservable();
  }

  /**
   * GET /sync/stream/departments
   * Stream progress ของ entity เดี่ยวๆ
   */
  @Sse('stream/departments')
  streamDepartments(): Observable<MessageEvent> {
    return this.streamSingleEntity('departments');
  }

  @Sse('stream/divisions')
  streamDivisions(): Observable<MessageEvent> {
    return this.streamSingleEntity('divisions');
  }

  @Sse('stream/units')
  streamUnits(): Observable<MessageEvent> {
    return this.streamSingleEntity('units');
  }

  @Sse('stream/position-groups')
  streamPositionGroups(): Observable<MessageEvent> {
    return this.streamSingleEntity('positionGroups');
  }

  @Sse('stream/position-codes')
  streamPositionCodes(): Observable<MessageEvent> {
    return this.streamSingleEntity('positionCodes');
  }

  @Sse('stream/positions')
  streamPositions(): Observable<MessageEvent> {
    return this.streamSingleEntity('positions');
  }

  // ── Helper: stream entity เดี่ยว ─────────────────────────────────
  private streamSingleEntity(
    entity: 'departments' | 'divisions' | 'units' | 'positionGroups' | 'positionCodes' | 'positions'
  ): Observable<MessageEvent> {
    const subject = new Subject<MessageEvent>();

    const methodMap = {
      departments: () => this.syncService.syncDepartments(),
      divisions: () => this.syncService.syncDivisions(),
      units: () => this.syncService.syncUnits(),
      positionGroups: () => this.syncService.syncPositionGroups(),
      positionCodes: () => this.syncService.syncPositionCodes(),
      positions: () => this.syncService.syncPositions(),
    };

    // ส่ง start event
    subject.next({
      data: {
        type: 'start',
        entity,
        percent: 0,
        message: `ເລີ່ມ Sync ${entity}...`,
      },
    } as MessageEvent);

    methodMap[entity]().then((result) => {
      subject.next({
        data: {
          type: 'complete',
          entity,
          percent: 100,
          result,
          message: `Sync ${entity} ສຳເລັດ`,
        },
      } as MessageEvent);
      subject.complete();
    }).catch((err) => {
      subject.next({
        data: {
          type: 'error',
          entity,
          message: err.message,
        },
      } as MessageEvent);
      subject.complete();
    });

    return subject.asObservable();
  }
}