// src/sync/sync.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { PrismaService } from '../prisma/prisma.service';
import { firstValueFrom } from 'rxjs';
import { ConfigService } from '@nestjs/config';
import { HrmAuthService } from './hrm-auth.service';
import { Gender, EmployeeStatus } from '@prisma/client';
import {
    HrmDepartment,
    HrmDivision,
    HrmUnit,
    HrmOffice,
    HrmPositionGroup,
    HrmPositionCode,
    HrmPosition,
    SyncResult,
    HrmEmployee,
} from './sync.types';

// ── Progress Event Types ──────────────────────────────
export type ProgressEventType = 'start' | 'progress' | 'entity_complete' | 'complete' | 'error';

export interface SyncProgressEvent {
    type: ProgressEventType;
    /** เปอร์เซ็นต์รวม 0–100 */
    percent: number;
    /** entity ที่กำลัง sync อยู่ */
    entity?: string;
    /** ข้อความแสดงสถานะ */
    message: string;
    /** ผลลัพธ์ของ entity นั้นๆ (เมื่อ entity_complete) */
    result?: SyncResult;
    /** ผลลัพธ์ทั้งหมด (เมื่อ complete) */
    results?: SyncResult[];
    /** department ที่กำลัง sync (เฉพาะ employees) */
    currentDept?: string;
    /** จำนวน dept ที่เสร็จแล้ว */
    completedDepts?: number;
    /** จำนวน dept ทั้งหมด */
    totalDepts?: number;
}

export type ProgressCallback = (event: SyncProgressEvent) => void;

@Injectable()
export class SyncService {
    private readonly logger = new Logger(SyncService.name);

    private readonly BASE_URL: string;
    private readonly ENDPOINTS: Record<string, string>;

    constructor(
        private readonly http: HttpService,
        private readonly prisma: PrismaService,
        private readonly hrmAuth: HrmAuthService,
        private readonly config: ConfigService,
    ) {
        this.BASE_URL = this.config.get<string>('HRM_API_URL') || 'https://api-test.edl.com.la/hrm/api/hrms';

        this.ENDPOINTS = {
            department: `${this.BASE_URL}/department`,
            division: `${this.BASE_URL}/division`,
            unit: `${this.BASE_URL}/unit`,
            office: `${this.BASE_URL}/office`,
            positionGroup: `${this.BASE_URL}/positiongroup`,
            positionCode: `${this.BASE_URL}/positioncode`,
            position: `${this.BASE_URL}/position`,
        };
    }

    // ================================================================
    // HELPER: Fetch from HRM API
    // ================================================================
    private async fetchFromHrm<T>(url: string, entityName: string): Promise<T[]> {
        const token = await this.hrmAuth.getToken();

        try {
            const response = await firstValueFrom(
                this.http.get<any>(url, {
                    headers: { Authorization: `Bearer ${token}` },
                    validateStatus: () => true,
                }),
            );

            if (response.status === 401) {
                this.logger.warn(`🔄 Got 401 on ${entityName} — refreshing token...`);
                const newToken = await this.hrmAuth.refreshToken();
                const retryRes = await firstValueFrom(
                    this.http.get<any>(url, {
                        headers: { Authorization: `Bearer ${newToken}` },
                    }),
                );
                return this.extractArray<T>(retryRes.data, entityName);
            }

            if (response.status === 500) {
                this.logger.warn(`⚠️  HRM 500 on ${entityName} — skipping`);
                return [];
            }

            return this.extractArray<T>(response.data, entityName);

        } catch (error: any) {
            this.logger.error(`❌ Failed to fetch ${entityName}: ${error.message}`);
            throw new Error(`HRM API Error [${entityName}]: ${error.message}`);
        }
    }

    private extractArray<T>(data: any, entityName: string): T[] {
        if (!data) return [];
        if (Array.isArray(data)) return data as T[];
        if (Array.isArray(data.data)) return data.data as T[];
        if (Array.isArray(data.result)) return data.result as T[];
        if (Array.isArray(data.items)) return data.items as T[];
        if (Array.isArray(data.list)) return data.list as T[];
        if (Array.isArray(data.data?.employees)) return data.data.employees as T[];
        if (Array.isArray(data.employees)) return data.employees as T[];

        this.logger.warn(`⚠️  [${entityName}] Unknown structure: ${JSON.stringify(data).slice(0, 200)}`);
        return [];
    }

    // ================================================================
    // HELPER: Generic upsert loop
    // ================================================================
    private async upsertMany<T>(
        entityName: string,
        items: T[],
        upsertFn: (item: T) => Promise<void>,
        /** optional: callback ทุก N items เพื่อ report progress ย่อย */
        onItemProgress?: (done: number, total: number) => void,
    ): Promise<SyncResult> {
        let synced = 0;
        let errors = 0;
        const failedItems: { item: T; reason: string }[] = [];
        const total = items.length;

        for (let i = 0; i < total; i++) {
            const item = items[i];
            try {
                await upsertFn(item);
                synced++;
            } catch (error: any) {
                errors++;
                failedItems.push({ item, reason: error.message });
            }

            // ส่ง progress ทุก 10 items หรือ item สุดท้าย
            if (onItemProgress && (i % 10 === 9 || i === total - 1)) {
                onItemProgress(i + 1, total);
            }
        }

        if (failedItems.length > 0) {
            console.error(`\n📋 [${entityName}] FAILED SUMMARY (${failedItems.length} items):`);
            failedItems.forEach((f, i) => {
                console.error(`  ${i + 1}. Reason: ${f.reason}`);
            });
        }

        this.logger.log(`[${entityName}] Synced: ${synced} | Errors: ${errors}`);
        return { entity: entityName, synced, errors };
    }

    // ================================================================
    // 1. SYNC DEPARTMENT
    // ================================================================
    async syncDepartments(): Promise<SyncResult> {
        const data = await this.fetchFromHrm<HrmDepartment>(this.ENDPOINTS.department, 'Departments');

        return this.upsertMany('Department', data, async (dept) => {
            await this.prisma.department.upsert({
                where: { id: dept.department_id },
                update: {
                    code: dept.department_code || null,
                    name: dept.department_name,
                    status: dept.department_status ?? 'A',
                },
                create: {
                    id: dept.department_id,
                    code: dept.department_code || null,
                    name: dept.department_name,
                    status: dept.department_status ?? 'A',
                },
            });
        });
    }

    // ================================================================
    // 2. SYNC DIVISION
    // ================================================================
    async syncDivisions(): Promise<SyncResult> {
        const data = await this.fetchFromHrm<HrmDivision>(this.ENDPOINTS.division, 'Divisions');

        const validDeptIds = new Set(
            (await this.prisma.department.findMany({ select: { id: true } })).map(d => d.id)
        );

        return this.upsertMany('Division', data, async (div) => {
            const resolvedDeptId = validDeptIds.has(div.department_id) ? div.department_id : null;

            if (div.division_code) {
                const existingByCode = await this.prisma.division.findUnique({
                    where: { code: div.division_code },
                    select: { id: true }
                });
                if (existingByCode && existingByCode.id !== div.division_id) {
                    await this.prisma.division.update({
                        where: { id: existingByCode.id },
                        data: { code: null },
                    });
                }
            }

            await this.prisma.division.upsert({
                where: { id: div.division_id },
                update: {
                    code: div.division_code || null,
                    name: div.division_name,
                    status: div.division_status ?? 'A',
                    department_id: resolvedDeptId,
                },
                create: {
                    id: div.division_id,
                    code: div.division_code || null,
                    name: div.division_name,
                    status: div.division_status ?? 'A',
                    department_id: resolvedDeptId,
                },
            });
        });
    }

    // ================================================================
    // 3. SYNC UNIT
    // ================================================================
    async syncUnits(): Promise<SyncResult> {
        const data = await this.fetchFromHrm<HrmUnit>(this.ENDPOINTS.unit, 'Units');

        const validDivIds = new Set(
            (await this.prisma.division.findMany({ select: { id: true } })).map(d => d.id)
        );

        return this.upsertMany('Unit', data, async (unit) => {
            const resolvedDivId = validDivIds.has(unit.division_id) ? unit.division_id : null;

            if (unit.unit_code) {
                const existingByCode = await this.prisma.unit.findUnique({
                    where: { code: unit.unit_code }, select: { id: true }
                });
                if (existingByCode && existingByCode.id !== unit.unit_id) {
                    await this.prisma.unit.update({
                        where: { id: existingByCode.id }, data: { code: null },
                    });
                }
            }

            await this.prisma.unit.upsert({
                where: { id: unit.unit_id },
                update: {
                    code: unit.unit_code || null,
                    name: unit.unit_name,
                    status: unit.unit_status ?? 'A',
                    division_id: resolvedDivId,
                },
                create: {
                    id: unit.unit_id,
                    code: unit.unit_code || null,
                    name: unit.unit_name,
                    status: unit.unit_status ?? 'A',
                    division_id: resolvedDivId,
                },
            });
        });
    }

    // ================================================================
    // 4, 5, 6. SYNC POSITIONS & GROUPS
    // ================================================================
    async syncPositionGroups(): Promise<SyncResult> {
        const data = await this.fetchFromHrm<HrmPositionGroup>(this.ENDPOINTS.positionGroup, 'PositionGroups');
        return this.upsertMany('PositionGroup', data, async (pg) => {
            await this.prisma.positionGroup.upsert({
                where: { id: pg.pos_group_id },
                update: { name: pg.pos_group_name },
                create: { id: pg.pos_group_id, name: pg.pos_group_name },
            });
        });
    }

    async syncPositionCodes(): Promise<SyncResult> {
        const data = await this.fetchFromHrm<HrmPositionCode>(this.ENDPOINTS.positionCode, 'PositionCodes');
        const validGroupIds = new Set((await this.prisma.positionGroup.findMany({ select: { id: true } })).map(g => g.id));

        return this.upsertMany('PositionCode', data, async (pc) => {
            await this.prisma.positionCode.upsert({
                where: { id: pc.pos_code_id },
                update: {
                    name: pc.pos_code_name,
                    status: pc.pos_code_status ?? 'A',
                    group_id: validGroupIds.has(pc.pos_group_id) ? pc.pos_group_id : null,
                },
                create: {
                    id: pc.pos_code_id,
                    name: pc.pos_code_name,
                    status: pc.pos_code_status ?? 'A',
                    group_id: validGroupIds.has(pc.pos_group_id) ? pc.pos_group_id : null,
                },
            });
        });
    }

    async syncPositions(): Promise<SyncResult> {
        const data = await this.fetchFromHrm<HrmPosition>(this.ENDPOINTS.position, 'Positions');
        return this.upsertMany('Position', data, async (pos) => {
            await this.prisma.position.upsert({
                where: { id: pos.pos_id },
                update: { name: pos.pos_name, status: pos.pos_status ?? 'A' },
                create: { id: pos.pos_id, name: pos.pos_name, status: pos.pos_status ?? 'A' },
            });
        });
    }

    async syncOfficeAsDivisionRef(): Promise<SyncResult> {
        const data = await this.fetchFromHrm<HrmOffice>(this.ENDPOINTS.office, 'Offices');
        return { entity: 'Office (HRM ref)', synced: data.length, errors: 0 };
    }

    // ================================================================
    // MAPPERS
    // ================================================================
    private mapGender(gender?: string): Gender {
        const g = gender?.toLowerCase();
        return g === 'female' ? Gender.FEMALE : g === 'male' ? Gender.MALE : Gender.OTHER;
    }

    private mapEmployeeStatus(status?: string): EmployeeStatus {
        return status === 'A' ? EmployeeStatus.ACTIVE : EmployeeStatus.INACTIVE;
    }

    // ================================================================
    // SYNC EMPLOYEES BY DEPARTMENT (with optional progress callback)
    // ================================================================
    async syncEmployeesByDepartment(
        departmentId: number,
        onProgress?: (done: number, total: number, page: number) => void,
    ): Promise<SyncResult> {
        this.logger.log(`🔄 Syncing employees for department_id=${departmentId}`);

        const validUnitIds = new Set(
            (await this.prisma.unit.findMany({ select: { id: true } })).map(u => u.id)
        );

        const PAGE_SIZE = 70;
        let page = 1;
        let totalSynced = 0;
        let totalErrors = 0;
        let hasMore = true;
        // ประมาณ total จาก first page
        let estimatedTotal: number | null = null;

        while (hasMore) {
            const url = `${this.BASE_URL}/employee?page=${page}&limit=${PAGE_SIZE}&department_id=${departmentId}`;

            try {
                const token = await this.hrmAuth.getToken();
                const response = await firstValueFrom(
                    this.http.get<any>(url, {
                        headers: { Authorization: `Bearer ${token}` },
                        validateStatus: () => true,
                        timeout: 30000,
                    }),
                );

                if (response.status === 401) {
                    this.logger.warn(`🔄 401 — refreshing token, retrying page ${page}...`);
                    await this.hrmAuth.refreshToken();
                    continue;
                }

                if (response.status === 500) {
                    this.logger.warn(`⚠️  HRM 500 on dept=${departmentId} page=${page} — skipping dept`);
                    break;
                }

                const data = response.data;

                // ดึง total count จาก response ถ้ามี
                if (page === 1 && data?.total != null) {
                    estimatedTotal = data.total;
                }

                const employees = this.extractArray<HrmEmployee>(data, `Employee[dept=${departmentId}]`);

                if (employees.length > 0) {
                    const result = await this.upsertMany(
                        `Employee[dept=${departmentId}|page=${page}]`,
                        employees,
                        async (emp) => this.processSingleEmployee(emp, validUnitIds),
                        (done, total) => {
                            if (onProgress) {
                                const approxDone = totalSynced + done;
                                const approxTotal = estimatedTotal ?? (totalSynced + total);
                                onProgress(approxDone, approxTotal, page);
                            }
                        },
                    );
                    totalSynced += result.synced;
                    totalErrors += result.errors;
                }

                if (employees.length < PAGE_SIZE) {
                    hasMore = false;
                } else {
                    page++;
                    await new Promise(r => setTimeout(r, 300));
                }

            } catch (error: any) {
                this.logger.error(`❌ Failed dept=${departmentId} page=${page}: ${error.message}`);
                break;
            }
        }

        this.logger.log(`✅ dept=${departmentId} done | Pages: ${page} | Synced: ${totalSynced} | Errors: ${totalErrors}`);
        return { entity: `Employee[dept=${departmentId}]`, synced: totalSynced, errors: totalErrors };
    }

    private async processSingleEmployee(emp: HrmEmployee, validUnitIds: Set<number>) {
        await this.prisma.$transaction(async (tx) => {
            const specialSubjectData = emp.office?.specialSubject ?? emp.placeOffice?.specialSubject;
            if (specialSubjectData) {
                await tx.specialSubject.upsert({
                    where: { special_subject_id: specialSubjectData.special_subject_id },
                    update: { special_subject_name: specialSubjectData.special_subject_name },
                    create: {
                        special_subject_id: specialSubjectData.special_subject_id,
                        special_subject_name: specialSubjectData.special_subject_name,
                    },
                });
            }

            let safeEmail = emp.email?.trim() || null;
            if (safeEmail) {
                const conflict = await tx.employee.findUnique({ where: { email: safeEmail }, select: { emp_id_ref: true } });
                if (conflict && conflict.emp_id_ref !== emp.emp_id) safeEmail = null;
            }

            const getSafeUnit = (uId?: number | null) => uId && validUnitIds.has(uId) ? uId : null;
            const empUnitId = getSafeUnit(emp.office?.unit_id);

            const employeeData = {
                employee_code: emp.emp_code,
                first_name_la: emp.first_name_la,
                last_name_la: emp.last_name_la,
                email: safeEmail,
                phone: emp.phone || null,
                gender: this.mapGender(emp.gender),
                status: this.mapEmployeeStatus(emp.status),
                image: emp.image || null,
                department_id: emp.office?.department_id || null,
                division_id: emp.office?.division_id || null,
                unit_id: empUnitId,
                position_id: emp.office?.pos_id || null,
                pos_code_id: emp.positionCode?.pos_code_id ?? null,
                special_subject_id: specialSubjectData?.special_subject_id ?? null,
            };

            const savedEmployee = await tx.employee.upsert({
                where: { emp_id_ref: emp.emp_id },
                update: employeeData,
                create: { emp_id_ref: emp.emp_id, ...employeeData },
            });

            if (emp.office) {
                const o = emp.office;
                const officeData = {
                    department_id: o.department_id || null,
                    division_id: o.division_id || null,
                    unit_id: getSafeUnit(o.unit_id),
                    pos_id: o.pos_id || null,
                    special_subject_id: o.special_subject_id || null,
                    revolution_date: o.revolution_date ? new Date(o.revolution_date) : null,
                    state_date: o.state_date ? new Date(o.state_date) : null,
                    remark: o.remark !== 'undefined' ? o.remark : null,
                };
                await tx.office.upsert({
                    where: { employee_id: savedEmployee.id },
                    update: officeData,
                    create: { employee_id: savedEmployee.id, ...officeData },
                });
            }

            if (emp.placeOffice) {
                const p = emp.placeOffice;
                const placeData = {
                    department_id: p.department_id || null,
                    division_id: p.division_id || null,
                    unit_id: getSafeUnit(p.unit_id),
                    pos_id: p.pos_id || null,
                    special_subject_id: p.special_subject_id || null,
                    revolution_date: p.revolution_date ? new Date(p.revolution_date) : null,
                    state_date: p.state_date ? new Date(p.state_date) : null,
                };
                await tx.placeOffice.upsert({
                    where: { employee_id: savedEmployee.id },
                    update: placeData,
                    create: { employee_id: savedEmployee.id, ...placeData },
                });
            }
        });
    }

    // ================================================================
    // SYNC ALL EMPLOYEES — WITH PROGRESS STREAMING
    // ================================================================
    async syncAllEmployees(): Promise<SyncResult[]> {
        const departments = await this.prisma.department.findMany({ select: { id: true, name: true } });
        this.logger.log(`📋 Found ${departments.length} departments to process`);

        const results: SyncResult[] = [];
        for (const dept of departments) {
            this.logger.log(`\n--- Syncing dept: ${dept.name} (${dept.id}) ---`);
            results.push(await this.syncEmployeesByDepartment(dept.id));
            await new Promise((r) => setTimeout(r, 1000));
        }
        return results;
    }

    /**
     * syncAllEmployees พร้อม SSE progress callback
     * percent คำนวณจาก: (completedDepts / totalDepts) * 100
     * + progress ภายใน dept แต่ละอัน
     */
    async syncAllEmployeesWithProgress(onProgress: ProgressCallback): Promise<SyncResult[]> {
        const departments = await this.prisma.department.findMany({
            select: { id: true, name: true },
            orderBy: { id: 'asc' },
        });
        const totalDepts = departments.length;

        onProgress({
            type: 'start',
            percent: 0,
            message: `ເລີ່ມ Sync ພະນັກງານ — ທັງໝົດ ${totalDepts} ພະແນກ`,
            totalDepts,
            completedDepts: 0,
        });

        const results: SyncResult[] = [];

        for (let i = 0; i < totalDepts; i++) {
            const dept = departments[i];
            const basePercent = Math.round((i / totalDepts) * 100);
            const nextPercent = Math.round(((i + 1) / totalDepts) * 100);

            onProgress({
                type: 'progress',
                percent: basePercent,
                entity: `Employee[dept=${dept.id}]`,
                currentDept: dept.name,
                completedDepts: i,
                totalDepts,
                message: `ກຳລັງ Sync ພະແນກ: ${dept.name} (${i + 1}/${totalDepts})`,
            });

            const result = await this.syncEmployeesByDepartment(
                dept.id,
                (done, total, page) => {
                    // progress ภายใน dept: interleave ระหว่าง basePercent → nextPercent
                    const innerFraction = total > 0 ? done / total : 0;
                    const interpolated = Math.round(basePercent + innerFraction * (nextPercent - basePercent));
                    onProgress({
                        type: 'progress',
                        percent: Math.min(interpolated, nextPercent - 1),
                        entity: `Employee[dept=${dept.id}]`,
                        currentDept: dept.name,
                        completedDepts: i,
                        totalDepts,
                        message: `${dept.name}: ດຶງຂໍ້ມູນ ${done}/${total} ຄົນ (ໜ້າ ${page})`,
                    });
                },
            );

            results.push(result);

            onProgress({
                type: 'entity_complete',
                percent: nextPercent,
                entity: `Employee[dept=${dept.id}]`,
                currentDept: dept.name,
                completedDepts: i + 1,
                totalDepts,
                result,
                message: `ພະແນກ ${dept.name} ສຳເລັດ: ${result.synced} ຄົນ`,
            });

            await new Promise((r) => setTimeout(r, 500));
        }

        const totalSynced = results.reduce((s, r) => s + r.synced, 0);
        const totalErrors = results.reduce((s, r) => s + r.errors, 0);

        onProgress({
            type: 'complete',
            percent: 100,
            message: `Sync ພະນັກງານທັງໝົດສຳເລັດ! ທັງໝົດ ${totalSynced} ຄົນ`,
            results,
            completedDepts: totalDepts,
            totalDepts,
        });

        return results;
    }

    // ================================================================
    // SYNC ALL STRUCTURE — WITH PROGRESS STREAMING
    // ================================================================
    async syncAll(): Promise<SyncResult[]> {
        this.logger.log('🚀 Starting FULL sync...');
        const results: SyncResult[] = [];

        results.push(await this.syncDepartments());
        results.push(await this.syncDivisions());
        results.push(await this.syncUnits());
        results.push(await this.syncPositionGroups());
        results.push(await this.syncPositionCodes());
        results.push(await this.syncPositions());
        results.push(await this.syncOfficeAsDivisionRef());

        this.logger.log('✅ FULL sync complete!');
        return results;
    }

    /**
     * syncAll (โครงสร้าง) พร้อม SSE progress
     * แบ่งเป็น 6 entities ให้แต่ละ entity = ~16.7%
     */
    async syncAllWithProgress(onProgress: ProgressCallback): Promise<SyncResult[]> {
        const steps: Array<{
            label: string;
            entityKey: string;
            fn: () => Promise<SyncResult>;
        }> = [
            { label: 'ພະແນກ (Departments)', entityKey: 'Department', fn: () => this.syncDepartments() },
            { label: 'ຝ່າຍ (Divisions)', entityKey: 'Division', fn: () => this.syncDivisions() },
            { label: 'ໜ່ວຍງານ (Units)', entityKey: 'Unit', fn: () => this.syncUnits() },
            { label: 'ກຸ່ມຕຳແໜ່ງ (Position Groups)', entityKey: 'PositionGroup', fn: () => this.syncPositionGroups() },
            { label: 'ລະຫັດຕຳແໜ່ງ (Position Codes)', entityKey: 'PositionCode', fn: () => this.syncPositionCodes() },
            { label: 'ຕຳແໜ່ງ (Positions)', entityKey: 'Position', fn: () => this.syncPositions() },
        ];

        const total = steps.length;
        const results: SyncResult[] = [];

        onProgress({
            type: 'start',
            percent: 0,
            message: 'ເລີ່ມ Sync ໂຄງສ້າງທັງໝົດ...',
        });

        for (let i = 0; i < total; i++) {
            const step = steps[i];
            const basePercent = Math.round((i / total) * 100);
            const nextPercent = Math.round(((i + 1) / total) * 100);

            onProgress({
                type: 'progress',
                percent: basePercent,
                entity: step.entityKey,
                message: `ກຳລັງ Sync ${step.label} (${i + 1}/${total})`,
            });

            try {
                const result = await step.fn();
                results.push(result);

                onProgress({
                    type: 'entity_complete',
                    percent: nextPercent,
                    entity: step.entityKey,
                    result,
                    message: `${step.label} ສຳເລັດ: ${result.synced} ລາຍການ`,
                });
            } catch (err: any) {
                onProgress({
                    type: 'error',
                    percent: basePercent,
                    entity: step.entityKey,
                    message: `${step.label} ຜິດພາດ: ${err.message}`,
                });
            }
        }

        onProgress({
            type: 'complete',
            percent: 100,
            message: 'Sync ໂຄງສ້າງທັງໝົດສຳເລັດ!',
            results,
        });

        return results;
    }
}