// src/employees/employees.service.ts
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { EnrollmentStatus, CourseStatus, Prisma } from '@prisma/client';

@Injectable()
export class EmployeeService {
  private readonly logger = new Logger(EmployeeService.name);

  constructor(private readonly prisma: PrismaService) { }

  // ==================================================================
  // 1. BASIC PROFILE & ORGANIZATION READ OPERATIONS
  // ==================================================================

  /**
   * ດຶງຂໍ້ມູນພະນັກງານແບບລະອຽດທີ່ສຸດ ລວມເຖິງຂໍ້ມູນສັງກັດຍ່ອຍໃນ Office ແລະ PlaceOffice
   */
  async findOne(id: number) {
    const employee = await this.prisma.employee.findUnique({
      where: { id },
      include: {
        // --- 1. Main Organization Affiliation ---
        department: true,
        division: true,
        unit: true,
        position: true,

        // --- 2. Position Code & Group ---
        positionCode: {
          include: {
            group: true, // ດຶງເອົາ PositionGroup ມາພ້ອມ
          }
        },

        // --- 3. Special Subject ---
        specialSubject: true, // ເພີ່ມອັນທີ່ຂາດໄປ

        // --- 4. Deep fetch for Office ---
        office: {
          include: {
            department: true,
            division: true,
            unit: true,
            position: true,
          }
        },

        // --- 5. Deep fetch for PlaceOffice ---
        placeOffice: {
          include: {
            department: true,
            division: true,
            unit: true,
            position: true,
          }
        },
      },
    });

    if (!employee) {
      throw new NotFoundException(`Employee with ID ${id} not found`);
    }

    // Security: Remove password before returning
    const { password, ...employeeWithoutPassword } = employee;
    return employeeWithoutPassword;
  }

  async findByCode(employee_code: string) {
    const employee = await this.prisma.employee.findUnique({
      where: { employee_code },
      select: {
        id: true,
        employee_code: true,
        first_name_la: true,
        last_name_la: true,
        email: true,
        phone: true,
        image: true,
        gender: true,
        status: true,
        department: { select: { name: true } },
        division: { select: { name: true } },
        unit: { select: { name: true } },
        position: { select: { name: true } },
        specialSubject: { select: { special_subject_name: true } },
      },
    });

    if (!employee) {
      throw new NotFoundException(`Employee with code ${employee_code} not found`);
    }

    return employee;
  }

  async findAll(filters?: {
    page?: number;
    limit?: number;
    search?: string;
    department_id?: number;
    division_id?: number;
    unit_id?: number;
    position_id?: number;
  }) {
    // --- ຈັດການຄ່າ Pagination ---
    const page = Math.max(1, filters?.page ?? 1);
    const limit = Math.min(100, Math.max(1, filters?.limit ?? 10)); // Default ໜ້າລະ 10, ສູງສຸດ 100
    const skip = (page - 1) * limit;

    // --- ສ້າງເງື່ອນໄຂການຄົ້ນຫາ (Where Clause) ---
    const whereClause: Prisma.EmployeeWhereInput = {};

    if (filters?.department_id) whereClause.department_id = filters.department_id;
    if (filters?.division_id) whereClause.division_id = filters.division_id;
    if (filters?.unit_id) whereClause.unit_id = filters.unit_id;
    if (filters?.position_id) whereClause.position_id = filters.position_id;

    // ຖ້າມີການພິມຄົ້ນຫາ (Search) ໃຫ້ຄົ້ນຈາກລະຫັດ ຫຼື ຊື່
    if (filters?.search) {
      whereClause.OR = [
        { employee_code: { contains: filters.search, mode: 'insensitive' } },
        { first_name_la: { contains: filters.search, mode: 'insensitive' } },
        { last_name_la: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    // --- Query ດຶງຂໍ້ມູນ ແລະ ນັບຈຳນວນພ້ອມກັນ (Performance ດີຂຶ້ນ) ---
    const [employees, total] = await Promise.all([
      this.prisma.employee.findMany({
        where: whereClause,
        skip, // ຂ້າມຂໍ້ມູນຕາມໜ້າ
        take: limit, // ຈຳກັດຂໍ້ມູນ
        include: {
          department: true,
          division: true,
          unit: true,
          position: true,
          positionCode: true,
          specialSubject: true,
          office: {
            select: { department_id: true, division_id: true }
          },
          placeOffice: {
            select: { department_id: true, division_id: true }
          }
        },
        orderBy: [
          { employee_code: 'asc' }, // ລຽງຕາມລະຫັດພະນັກງານ
          { department_id: 'asc' },
          { division_id: 'asc' },
        ],
      }),
      this.prisma.employee.count({
        where: whereClause,
      }),
    ]);

    const totalPages = Math.ceil(total / limit);

    // Security: ຕັດ password ອອກກ່ອນສົ່ງໃຫ້ Frontend
    const mappedEmployees = employees.map(emp => {
      const { password, ...empData } = emp;
      return empData;
    });

    // --- ສົ່ງອອກໃນຮູບແບບ Pagination ---
    return {
      meta: {
        total,
        page,
        limit,
        totalPages,
      },
      data: mappedEmployees,
    };
  }

  // ==================================================================
  // 2. UPDATE OPERATIONS (MERGED)
  // ==================================================================

  async update(id: number, updateDto: UpdateEmployeeDto) {
    await this.checkEmployeeExists(id);

    // 1. Validate Organization IDs if they are present in the update request
    if (updateDto.department_id) await this.validateEntity('department', updateDto.department_id);
    if (updateDto.division_id) await this.validateEntity('division', updateDto.division_id);
    if (updateDto.unit_id) await this.validateEntity('unit', updateDto.unit_id);
    if (updateDto.position_id) await this.validateEntity('position', updateDto.position_id);

    // 2. Perform the update
    const updatedEmployee = await this.prisma.employee.update({
      where: { id },
      data: {
        // Personal Info
        first_name_la: updateDto.first_name_la,
        last_name_la: updateDto.last_name_la,
        email: updateDto.email,
        phone: updateDto.phone,
        gender: updateDto.gender,

        // Organization Info (Merged logic)
        department_id: updateDto.department_id,
        division_id: updateDto.division_id,
        unit_id: updateDto.unit_id,
        position_id: updateDto.position_id,
        pos_code_id: updateDto.pos_code_id,
      },
      // ດຶງຂໍ້ມູນທີ່ Update ແລ້ວກັບມາໃຫ້ລະອຽດຄືກັບຕອນ findOne
      include: {
        department: true,
        division: true,
        unit: true,
        position: true,
        positionCode: { include: { group: true } },
        specialSubject: true,
        office: { include: { department: true, division: true } },
        placeOffice: { include: { department: true, division: true } }
      },
    });

    this.logger.log(`Updated employee ${id}`);
    const { password, ...employeeWithoutPassword } = updatedEmployee;
    return employeeWithoutPassword;
  }

  // ==================================================================
  // 3. COURSE & ENROLLMENT LOGIC
  // ==================================================================

  async getMyCourses(employeeId: number) {
    const now = new Date();

    const enrollments = await this.prisma.enrollment.findMany({
      where: { employee_id: employeeId },
      include: {
        course: {
          include: { category: true },
        },
      },
      orderBy: {
        course: { start_date: 'asc' },
      },
    });

    const upcoming = enrollments.filter(
      (e) =>
        e.course.start_date > now &&
        e.course.status === CourseStatus.SCHEDULED &&
        e.status === EnrollmentStatus.ENROLLED,
    );

    const active = enrollments.filter(
      (e) =>
        e.course.start_date <= now &&
        e.course.end_date >= now &&
        e.course.status === CourseStatus.ACTIVE &&
        (e.status === EnrollmentStatus.ENROLLED ||
          e.status === EnrollmentStatus.IN_PROGRESS),
    );

    const completed = enrollments.filter(
      (e) =>
        e.status === EnrollmentStatus.COMPLETED ||
        (e.course.end_date < now && e.course.status === CourseStatus.COMPLETED),
    );

    const failed = enrollments.filter(
      (e) => e.status === EnrollmentStatus.FAILED,
    );

    return {
      summary: {
        total: enrollments.length,
        upcoming: upcoming.length,
        active: active.length,
        completed: completed.length,
        failed: failed.length,
      },
      courses: {
        upcoming: upcoming.map((e) => this.formatEnrollment(e)),
        active: active.map((e) => this.formatEnrollment(e)),
        completed: completed.map((e) => this.formatEnrollment(e)),
        failed: failed.map((e) => this.formatEnrollment(e)),
      },
    };
  }

  // ==================================================================
  // 4. STATISTICS
  // ==================================================================

  async getOrganizationSummary() {
    const [departments, divisions, units, positions, totalEmployees] =
      await Promise.all([
        this.prisma.department.findMany({
          include: { _count: { select: { employees: true } } },
        }),
        this.prisma.division.findMany({
          include: {
            department: true,
            _count: { select: { employees: true } },
          },
        }),
        this.prisma.unit.findMany({
          include: { division: true, _count: { select: { employees: true } } },
        }),
        this.prisma.position.findMany({
          include: { _count: { select: { employees: true } } },
        }),
        this.prisma.employee.count(),
      ]);

    return {
      departments,
      divisions,
      units,
      positions,
      totalEmployees,
    };
  }

  async getAllDepartments() {
    return this.prisma.department.findMany({
      orderBy: { name: 'asc' },
    });
  }

  // ==================================================================
  // 5. HELPER METHODS
  // ==================================================================

  private async checkEmployeeExists(id: number) {
    const employee = await this.prisma.employee.findUnique({ where: { id } });
    if (!employee) throw new NotFoundException(`Employee with ID ${id} not found`);
    return employee;
  }

  private async validateEntity(
    model: 'department' | 'division' | 'unit' | 'position',
    id: number,
  ) {
    let entity: any = null;
    switch (model) {
      case 'department':
        entity = await this.prisma.department.findUnique({ where: { id } });
        break;
      case 'division':
        entity = await this.prisma.division.findUnique({ where: { id } });
        break;
      case 'unit':
        entity = await this.prisma.unit.findUnique({ where: { id } });
        break;
      case 'position':
        entity = await this.prisma.position.findUnique({ where: { id } });
        break;
    }
    if (!entity) {
      throw new NotFoundException(`${model} with ID ${id} not found`);
    }
  }

  private formatEnrollment(enrollment: any) {
    return {
      enrollment_id: enrollment.id,
      enrollment_status: enrollment.status,
      enrolled_at: enrollment.enrolled_at,
      certificate_url: enrollment.certificate_url,
      course: {
        id: enrollment.course.id,
        title: enrollment.course.title,
        description: enrollment.course.description,
        category: enrollment.course.category?.name,
        start_date: enrollment.course.start_date,
        end_date: enrollment.course.end_date,
        format: enrollment.course.format,
        location: enrollment.course.location,
        location_type: enrollment.course.location_type,
        country: enrollment.course.country,
        status: enrollment.course.status,
      },
    };
  }

  // ==================================================================
  // TRAINING RECORDS (ADMIN VIEWS)
  // ==================================================================

  async getEmployeesCourseCount(params?: { page?: number; limit?: number; employee_code?: string }) {
    const page = Math.max(1, params?.page ?? 1);
    const limit = Math.min(100, Math.max(1, params?.limit ?? 10));
    const skip = (page - 1) * limit;

    const whereClause: Prisma.EmployeeWhereInput = {};
    if (params?.employee_code) {
      whereClause.employee_code = { contains: params.employee_code };
    }

    const [employees, total] = await Promise.all([
      this.prisma.employee.findMany({
        where: whereClause,
        skip,
        take: limit,
        select: {
          id: true,
          employee_code: true,
          first_name_la: true,
          last_name_la: true,
          gender: true,

          department_id: true,
          division_id: true,
          unit_id: true,

          department: { select: { name: true } },
          division: { select: { name: true } },
          unit: { select: { name: true } },
          position: { select: { name: true } },
          specialSubject: { select: { special_subject_name: true } },

          _count: {
            select: { enrollments: true },
          },
        },
        orderBy: { id: 'asc' },
      }),
      this.prisma.employee.count({
        where: whereClause,
      }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      meta: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
      data: employees.map((emp) => ({
        employee_id: emp.id,
        employee_code: emp.employee_code,
        full_name: `${emp.first_name_la} ${emp.last_name_la}`,
        gender: emp.gender,

        department_id: emp.department_id,
        department: emp.department?.name || 'N/A',

        division_id: emp.division_id,
        division: emp.division?.name || 'N/A',

        unit_id: emp.unit_id,
        unit: emp.unit?.name || 'N/A',

        position: emp.position?.name || 'N/A',
        special_subject: emp.specialSubject?.special_subject_name || 'N/A',
        total_courses_attended: emp._count.enrollments,
      })),
    };
  }

  async getEmployeeCourses(employeeId: number) {
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      include: {
        department: { select: { name: true } },
        division: { select: { name: true } },
        unit: { select: { name: true } },
        position: { select: { name: true } },
        specialSubject: { select: { special_subject_name: true } },

        enrollments: {
          include: {
            course: {
              include: {
                category: true,
              },
            },
          },
          orderBy: {
            course: { start_date: 'desc' },
          },
        },
      },
    });

    if (!employee) {
      throw new NotFoundException(`Employee with ID ${employeeId} not found`);
    }

    const currentDate = new Date();

    return {
      employee: {
        id: employee.id,
        employee_code: employee.employee_code,
        full_name: `${employee.first_name_la} ${employee.last_name_la}`,
        gender: employee.gender,
        email: employee.email,
        department: employee.department?.name || 'N/A',
        division: employee.division?.name || 'N/A',
        unit: employee.unit?.name || 'N/A',
        position: employee.position?.name || 'N/A',
        special_subject: employee.specialSubject?.special_subject_name || 'N/A',
        total_courses: employee.enrollments.length,
      },

      courses: employee.enrollments.map((e) => {
        let calculatedStatus: EnrollmentStatus = EnrollmentStatus.ENROLLED;

        const courseEndDate = new Date(e.course.end_date);
        courseEndDate.setHours(23, 59, 59, 999);

        const courseStartDate = new Date(e.course.start_date);
        courseStartDate.setHours(0, 0, 0, 0);

        if (currentDate < courseStartDate) {
          calculatedStatus = EnrollmentStatus.ENROLLED;
        } else if (
          currentDate >= courseStartDate &&
          currentDate <= courseEndDate
        ) {
          calculatedStatus = EnrollmentStatus.IN_PROGRESS;
        } else if (currentDate > courseEndDate) {
          calculatedStatus = EnrollmentStatus.COMPLETED;
        }

        return {
          enrollment_id: e.id,
          enrollment_status: calculatedStatus,
          enrolled_at: e.enrolled_at,
          certificate_url: e.certificate_url,
          course_id: e.course.id,
          title: e.course.title,
          category: e.course.category?.name || 'N/A',
          start_date: e.course.start_date,
          end_date: e.course.end_date,
          format: e.course.format,
          course_status: e.course.status,
        };
      }),
    };
  }
}