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

@Injectable()
export class SyncService {
    private readonly logger = new Logger(SyncService.name);
    
    // ✅ ປະກາດ Type ໄວ້ກ່ອນ
    private readonly BASE_URL: string;
    private readonly ENDPOINTS: Record<string, string>;

    constructor(
        private readonly http: HttpService,
        private readonly prisma: PrismaService,
        private readonly hrmAuth: HrmAuthService,
        private readonly config: ConfigService,
    ) { 
        // ✅ ກຳນົດຄ່າໃນ constructor ເພາະ config ຈະພ້ອມໃຊ້ງານຢູ່ບ່ອນນີ້
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
    ): Promise<SyncResult> {
        let synced = 0;
        let errors = 0;
        const failedItems: { item: T; reason: string }[] = [];

        for (const item of items) {
            try {
                await upsertFn(item);
                synced++;
            } catch (error: any) {
                errors++;
                failedItems.push({ item, reason: error.message });
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

        // ✅ Caching: ດຶງ Department ID ທີ່ມີທັງໝົດມາໄວ້ໃນ Set (Query ຄັ້ງດຽວປະຢັດ DB)
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

        // ✅ Caching: ດຶງ Division ID
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
    // SYNC EMPLOYEES BY DEPARTMENT ID (WITH PAGINATION & TRANSACTIONS)
    // ================================================================
    async syncEmployeesByDepartment(departmentId: number): Promise<SyncResult> {
        this.logger.log(`🔄 Syncing employees for department_id=${departmentId}`);

        // ✅ Caching: ໂຫຼດ Unit ທີ່ມີໃນລະບົບມາໄວ້ ເພື່ອກວດສອບແບບໄວໆ ໂດຍບໍ່ຕ້ອງ Query ທຸກຄົນ
        const validUnitIds = new Set(
            (await this.prisma.unit.findMany({ select: { id: true } })).map(u => u.id)
        );

        const PAGE_SIZE = 50;
        let page = 1;
        let totalSynced = 0;
        let totalErrors = 0;
        let hasMore = true;

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
                const employees = this.extractArray<HrmEmployee>(data, `Employee[dept=${departmentId}]`);

                if (employees.length > 0) {
                    const result = await this.upsertMany(
                        `Employee[dept=${departmentId}|page=${page}]`,
                        employees,
                        async (emp) => this.processSingleEmployee(emp, validUnitIds)
                    );
                    totalSynced += result.synced;
                    totalErrors += result.errors;
                }

                if (employees.length < PAGE_SIZE) {
                    hasMore = false;
                } else {
                    page++;
                    await new Promise(r => setTimeout(r, 300)); // Rate limiting
                }

            } catch (error: any) {
                this.logger.error(`❌ Failed dept=${departmentId} page=${page}: ${error.message}`);
                break;
            }
        }

        this.logger.log(`✅ dept=${departmentId} done | Pages: ${page} | Synced: ${totalSynced} | Errors: ${totalErrors}`);
        return { entity: `Employee[dept=${departmentId}]`, synced: totalSynced, errors: totalErrors };
    }

    /**
     * ✅ ຂຽນແຍກອອກມາ ແລະ ໃຊ້ Prisma $transaction 
     * ເພື່ອໃຫ້ຂໍ້ມູນທັງໝົດລົງ DB ພ້ອມກັນ, ຖ້າມີຕາຕະລາງໃດ Error ມັນຈະຍົກເລີກທັງໝົດ
     */
    private async processSingleEmployee(emp: HrmEmployee, validUnitIds: Set<number>) {
        await this.prisma.$transaction(async (tx) => {
            // 1. ຈັດການ Special Subject ຖ້າມີ
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

            // 2. ກວດອີເມວຊໍ້າຊ້ອນ
            let safeEmail = emp.email?.trim() || null;
            if (safeEmail) {
                const conflict = await tx.employee.findUnique({ where: { email: safeEmail }, select: { emp_id_ref: true } });
                if (conflict && conflict.emp_id_ref !== emp.emp_id) safeEmail = null;
            }

            // 3. ກວດສອບ Unit (ໃຊ້ Set Memory ທີ່ໂຫຼດມາແລ້ວ ປະຢັດການດຶງ DB)
            const getSafeUnit = (uId?: number | null) => uId && validUnitIds.has(uId) ? uId : null;
            const empUnitId = getSafeUnit(emp.office?.unit_id);

            // 4. Upsert Employee (ໃຊ້ `saved` ເລີຍ ບໍ່ຕ້ອງໄປ Query ໃໝ່)
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

            // 5. Upsert Office
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

            // 6. Upsert PlaceOffice
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
    // SYNC ALL EMPLOYEES 
    // ================================================================
    async syncAllEmployees(): Promise<SyncResult[]> {
        const departments = await this.prisma.department.findMany({ select: { id: true, name: true } });
        this.logger.log(`📋 Found ${departments.length} departments to process`);

        const results: SyncResult[] = [];
        for (const dept of departments) {
            this.logger.log(`\n--- Syncing dept: ${dept.name} (${dept.id}) ---`);
            results.push(await this.syncEmployeesByDepartment(dept.id));
            await new Promise((r) => setTimeout(r, 1000)); // ພັກ 1 ວິນາທີ ລະຫວ່າງພະແນກ
        }
        return results;
    }

    // ================================================================
    // MASTER SYNC
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
}