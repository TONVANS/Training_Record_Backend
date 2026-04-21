// src/reports/reports.service.ts
import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LocationType, CourseStatus, Gender } from '@prisma/client';

export enum ReportPeriodType {
  MONTHLY = 'MONTHLY',
  QUARTERLY = 'QUARTERLY',
  HALF_YEARLY = 'HALF_YEARLY',
  YEARLY = 'YEARLY',
}

// Helper: คำนำหน้าตามเพศ
function getPrefix(gender: Gender | null | undefined): string {
  if (gender === Gender.FEMALE) return 'ທ່ານ ນາງ';
  return 'ທ່ານ'; // MALE หรือ unknown
}

// DTO สำหรับ Pagination
export interface PaginatedReportQuery {
  year: number;
  type: ReportPeriodType;
  value: number;
  page?: number;       // default 1
  pageSize?: number;   // default 50
}

export interface PaginatedDeptReportQuery extends PaginatedReportQuery {
  departmentId: number;
}

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  // ==========================================
  // 1. ລາຍງານລວມ (พร้อม Pagination)
  // ==========================================
  async getTrainingReport(
    year: number,
    type: ReportPeriodType,
    value: number,
    page = 1,
    pageSize = 50,
  ) {
    const { startDate, endDate } = this.getDateRange(year, type, value);

    const skip = (page - 1) * pageSize;

    // นับจำนวน course ทั้งหมดก่อน (สำหรับ pagination meta)
    const totalCourses = await this.prisma.course.count({
      where: {
        start_date: { gte: startDate, lte: endDate },
        status: { not: CourseStatus.CANCELLED },
      },
    });

    const courses = await this.prisma.course.findMany({
      where: {
        start_date: { gte: startDate, lte: endDate },
        status: { not: CourseStatus.CANCELLED },
      },
      select: {
        id: true,
        title: true,
        start_date: true,
        end_date: true,
        location_type: true,
        location: true,
        country: true,
        institution: true,
        organization: true,
        format: true,
        budget: true,
        enrollments: {
          select: {
            employee: {
              select: {
                special_subject_id: true,
                gender: true,
              },
            },
          },
        },
      },
      orderBy: { start_date: 'asc' },
      skip,
      take: pageSize,
    });

    const reportData = courses.map((course, index) => {
      const attendees = {
        technical:     { male: 0, female: 0, total: 0 },
        administrative:{ male: 0, female: 0, total: 0 },
        total:         { male: 0, female: 0, total: 0 },
      };

      course.enrollments.forEach((enrollment) => {
        const subjectId = enrollment.employee?.special_subject_id;
        const gender    = enrollment.employee?.gender;
        const isMale    = gender === Gender.MALE;
        const isFemale  = gender === Gender.FEMALE;

        if (subjectId === 1) {
          if (isMale)   attendees.technical.male++;
          else if (isFemale) attendees.technical.female++;
          attendees.technical.total++;
        } else if (subjectId === 2) {
          if (isMale)   attendees.administrative.male++;
          else if (isFemale) attendees.administrative.female++;
          attendees.administrative.total++;
        }
        if (isMale)   attendees.total.male++;
        else if (isFemale) attendees.total.female++;
        attendees.total.total++;
      });

      const diffTime = Math.abs(
        course.end_date.getTime() - course.start_date.getTime(),
      );
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

      return {
        no: skip + index + 1, // เลขลำดับต่อเนื่องข้ามหน้า
        course_title: course.title,
        budget: Number(course.budget),
        attendees,
        duration: {
          start_date: course.start_date,
          end_date:   course.end_date,
          total_days: diffDays,
        },
        location: {
          is_domestic:     course.location_type === LocationType.DOMESTIC,
          is_international: course.location_type === LocationType.INTERNATIONAL,
          detail: course.location || course.country || 'N/A',
        },
        institution: course.institution || course.organization || 'N/A',
        format: course.format,
      };
    });

    // Summary คำนวณจากทุก course ในช่วงเวลา (ไม่ใช่แค่หน้าปัจจุบัน)
    const summary = await this.calculateGlobalSummary(startDate, endDate);

    return {
      report_info: {
        year,
        period_type: type,
        period_value: type === ReportPeriodType.YEARLY ? null : value,
        report_date: new Date(),
      },
      pagination: {
        page,
        pageSize,
        total: totalCourses,
        totalPages: Math.ceil(totalCourses / pageSize),
        hasNextPage: page * pageSize < totalCourses,
        hasPrevPage: page > 1,
      },
      summary,
      data: reportData,
    };
  }

  // ==========================================
  // 2. ລາຍງານແຍກຕາມຝ່າຍ (พร้อม Pagination + คำนำหน้า)
  // ==========================================
  async getDepartmentTrainingReport(
    departmentId: number,
    year: number,
    type: ReportPeriodType,
    value: number,
    page = 1,
    pageSize = 30, // dept report มีแถว employee เยอะ ลดขนาดหน้า
  ) {
    const { startDate, endDate } = this.getDateRange(year, type, value);

    const dept = await this.prisma.department.findUnique({
      where: { id: departmentId },
    });
    if (!dept) throw new BadRequestException('ບໍ່ພົບຂໍ້ມູນຝ່າຍທີ່ລະບຸ');

    const skip = (page - 1) * pageSize;

    const totalCourses = await this.prisma.course.count({
      where: {
        start_date: { gte: startDate, lte: endDate },
        status: { not: CourseStatus.CANCELLED },
        enrollments: {
          some: { employee: { department_id: departmentId } },
        },
      },
    });

    const courses = await this.prisma.course.findMany({
      where: {
        start_date: { gte: startDate, lte: endDate },
        status: { not: CourseStatus.CANCELLED },
        enrollments: {
          some: { employee: { department_id: departmentId } },
        },
      },
      select: {
        id: true,
        title: true,
        start_date: true,
        end_date: true,
        location_type: true,
        location: true,
        country: true,
        institution: true,
        organization: true,
        format: true,
        enrollments: {
          where: { employee: { department_id: departmentId } },
          select: {
            employee: {
              select: {
                employee_code:    true,
                first_name_la:    true,
                last_name_la:     true,
                gender:           true,
                special_subject_id: true,
                position:   { select: { name: true } },
                department: { select: { name: true } },
              },
            },
          },
        },
      },
      orderBy: { start_date: 'asc' },
      skip,
      take: pageSize,
    });

    const reportData = courses.map((course, index) => {
      const attendees = {
        technical:     { male: 0, female: 0, total: 0 },
        administrative:{ male: 0, female: 0, total: 0 },
        total:         { male: 0, female: 0, total: 0 },
      };

      const attendee_list = course.enrollments.map((enrollment) => {
        const emp      = enrollment.employee;
        const isMale   = emp.gender === Gender.MALE;
        const isFemale = emp.gender === Gender.FEMALE;

        if (emp.special_subject_id === 1) {
          if (isMale)   attendees.technical.male++;
          else if (isFemale) attendees.technical.female++;
          attendees.technical.total++;
        } else if (emp.special_subject_id === 2) {
          if (isMale)   attendees.administrative.male++;
          else if (isFemale) attendees.administrative.female++;
          attendees.administrative.total++;
        }
        if (isMale)   attendees.total.male++;
        else if (isFemale) attendees.total.female++;
        attendees.total.total++;

        // ✅ เพิ่มคำนำหน้าชื่อตามเพศ
        const prefix   = getPrefix(emp.gender);
        const fullName = `${prefix} ${emp.first_name_la} ${emp.last_name_la}`;

        return {
          employee_code: emp.employee_code,
          full_name:     fullName,         // ← มีคำนำหน้าแล้ว
          prefix,                          // ← ส่งแยกไว้ใช้ใน PDF ได้
          first_name:    emp.first_name_la,
          last_name:     emp.last_name_la,
          gender:        emp.gender,
          position:      emp.position?.name   || '-',
          department:    emp.department?.name || '-',
        };
      });

      const diffTime = Math.abs(
        course.end_date.getTime() - course.start_date.getTime(),
      );
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

      return {
        no: skip + index + 1,
        course_title: course.title,
        attendee_list,
        attendees,
        duration: {
          start_date: course.start_date,
          end_date:   course.end_date,
          total_days: diffDays,
        },
        location: {
          is_domestic:      course.location_type === LocationType.DOMESTIC,
          is_international: course.location_type === LocationType.INTERNATIONAL,
          detail: course.location || course.country || 'N/A',
        },
        institution: course.institution || course.organization || 'N/A',
        format: course.format,
      };
    });

    // Summary จากทุก course ของ dept ในช่วงเวลา
    const summary = await this.calculateDeptGlobalSummary(
      departmentId,
      startDate,
      endDate,
    );

    return {
      report_info: {
        department: { id: dept.id, name: dept.name },
        year,
        period_type: type,
        period_value: type === ReportPeriodType.YEARLY ? null : value,
        report_date: new Date(),
      },
      pagination: {
        page,
        pageSize,
        total: totalCourses,
        totalPages: Math.ceil(totalCourses / pageSize),
        hasNextPage: page * pageSize < totalCourses,
        hasPrevPage: page > 1,
      },
      summary,
      data: reportData,
    };
  }

 // ==========================================
  // Helper: Summary จากทุก course 
  // (ปรับปรุงใหม่: ให้ PostgreSQL คำนวณให้ ไม่ดึงข้อมูลลง RAM)
  // ==========================================
  private async calculateGlobalSummary(startDate: Date, endDate: Date) {
    const baseCourseWhere = {
      start_date: { gte: startDate, lte: endDate },
      status: { not: CourseStatus.CANCELLED },
    };

    // 🚀 ยิง Query แบบ Parallel 10 เส้นพร้อมกัน (ใช้เวลาแค่เสี้ยววินาที เพราะ DB คำนวณให้)
    const [
      courseAgg,
      courseDates, // ดึงเฉพาะวันที่มาเพื่อหาผลรวมวัน (เพราะ Database Date Diff ทำยากใน Prisma)
      techMale, techFemale, adminMale, adminFemale,
      domCount, intCount, onlineCount, onsiteCount
    ] = await Promise.all([
      // 1. นับจำนวน Course ทั้งหมด และ ยอดรวมงบประมาณ
      this.prisma.course.aggregate({
        where: baseCourseWhere,
        _count: { id: true },
        _sum: { budget: true },
      }),
      // 2. ดึงแค่วันที่ (น้ำหนักเบามากๆ แค่ Array เล็กๆ)
      this.prisma.course.findMany({
        where: baseCourseWhere,
        select: { start_date: true, end_date: true },
      }),
      // 3. นับคนเข้าอบรม (แยกตามแผนกและเพศ)
      this.prisma.enrollment.count({ where: { course: baseCourseWhere, employee: { special_subject_id: 1, gender: Gender.MALE } } }),
      this.prisma.enrollment.count({ where: { course: baseCourseWhere, employee: { special_subject_id: 1, gender: Gender.FEMALE } } }),
      this.prisma.enrollment.count({ where: { course: baseCourseWhere, employee: { special_subject_id: 2, gender: Gender.MALE } } }),
      this.prisma.enrollment.count({ where: { course: baseCourseWhere, employee: { special_subject_id: 2, gender: Gender.FEMALE } } }),
      // 4. นับสถานที่ และ รูปแบบ
      this.prisma.course.count({ where: { ...baseCourseWhere, location_type: LocationType.DOMESTIC } }),
      this.prisma.course.count({ where: { ...baseCourseWhere, location_type: LocationType.INTERNATIONAL } }),
      this.prisma.course.count({ where: { ...baseCourseWhere, format: 'ONLINE' as any } }),
      this.prisma.course.count({ where: { ...baseCourseWhere, format: 'ONSITE' as any } }),
    ]);

    // คำนวณจำนวนวันใน Node.js (เพราะได้ข้อมูลแค่ {start, end} มา ซึ่งเบามาก)
    const total_days = courseDates.reduce((acc, course) => {
      const diffTime = Math.abs(course.end_date.getTime() - course.start_date.getTime());
      return acc + Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    }, 0);

    const total_technical = techMale + techFemale;
    const total_administrative = adminMale + adminFemale;

    return {
      total_technical_male: techMale,
      total_technical_female: techFemale,
      total_technical,
      total_administrative_male: adminMale,
      total_administrative_female: adminFemale,
      total_administrative,
      total_male: techMale + adminMale,
      total_female: techFemale + adminFemale,
      total_attendees: total_technical + total_administrative,
      total_courses: courseAgg._count.id,
      total_days,
      total_domestic: domCount,
      total_international: intCount,
      total_online: onlineCount,
      total_onsite: onsiteCount,
      total_budget: Number(courseAgg._sum.budget || 0),
    };
  }

  // ==========================================
  // Helper: Summary ของ Department
  // ==========================================
  private async calculateDeptGlobalSummary(
    departmentId: number,
    startDate: Date,
    endDate: Date,
  ) {
    const baseCourseWhere = {
      start_date: { gte: startDate, lte: endDate },
      status: { not: CourseStatus.CANCELLED },
      enrollments: { some: { employee: { department_id: departmentId } } }, // เฉพาะคอร์สที่แผนกนี้เข้า
    };

    const baseEnrollWhere = {
      course: {
        start_date: { gte: startDate, lte: endDate },
        status: { not: CourseStatus.CANCELLED },
      },
      employee: { department_id: departmentId } // เฉพาะคนในแผนกนี้
    };

    const [
      courseAgg,
      courseDates,
      techMale, techFemale, adminMale, adminFemale,
      domCount, intCount, onlineCount, onsiteCount
    ] = await Promise.all([
      this.prisma.course.aggregate({
        where: baseCourseWhere,
        _count: { id: true },
      }),
      this.prisma.course.findMany({
        where: baseCourseWhere,
        select: { start_date: true, end_date: true },
      }),
      // นับ Enrollment เฉพาะคนที่อยู่แผนกที่ระบุ
      this.prisma.enrollment.count({ where: { ...baseEnrollWhere, employee: { ...baseEnrollWhere.employee, special_subject_id: 1, gender: Gender.MALE } } }),
      this.prisma.enrollment.count({ where: { ...baseEnrollWhere, employee: { ...baseEnrollWhere.employee, special_subject_id: 1, gender: Gender.FEMALE } } }),
      this.prisma.enrollment.count({ where: { ...baseEnrollWhere, employee: { ...baseEnrollWhere.employee, special_subject_id: 2, gender: Gender.MALE } } }),
      this.prisma.enrollment.count({ where: { ...baseEnrollWhere, employee: { ...baseEnrollWhere.employee, special_subject_id: 2, gender: Gender.FEMALE } } }),
      // นับ Course สถานที่
      this.prisma.course.count({ where: { ...baseCourseWhere, location_type: LocationType.DOMESTIC } }),
      this.prisma.course.count({ where: { ...baseCourseWhere, location_type: LocationType.INTERNATIONAL } }),
      this.prisma.course.count({ where: { ...baseCourseWhere, format: 'ONLINE' as any } }),
      this.prisma.course.count({ where: { ...baseCourseWhere, format: 'ONSITE' as any } }),
    ]);

    const total_days = courseDates.reduce((acc, course) => {
      const diffTime = Math.abs(course.end_date.getTime() - course.start_date.getTime());
      return acc + Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    }, 0);

    const total_technical = techMale + techFemale;
    const total_administrative = adminMale + adminFemale;

    return {
      total_technical_male: techMale,
      total_technical_female: techFemale,
      total_technical,
      total_administrative_male: adminMale,
      total_administrative_female: adminFemale,
      total_administrative,
      total_male: techMale + adminMale,
      total_female: techFemale + adminFemale,
      total_attendees: total_technical + total_administrative,
      total_courses: courseAgg._count.id,
      total_days,
      total_domestic: domCount,
      total_international: intCount,
      total_online: onlineCount,
      total_onsite: onsiteCount,
      total_budget: 0, // ตาม Logic เดิม Department Summary ไม่มี Budget
    };
  }

  // ==========================================
  // Helper: Date Range
  // ==========================================
  private getDateRange(year: number, type: ReportPeriodType, value: number) {
    let startDate: Date;
    let endDate: Date;

    switch (type) {
      case ReportPeriodType.MONTHLY:
        if (value < 1 || value > 12)
          throw new BadRequestException('Month must be between 1 and 12');
        startDate = new Date(year, value - 1, 1);
        endDate   = new Date(year, value, 0);
        endDate.setHours(23, 59, 59, 999);
        break;

      case ReportPeriodType.QUARTERLY:
        if (value < 1 || value > 4)
          throw new BadRequestException('Quarter must be between 1 and 4');
        startDate = new Date(year, (value - 1) * 3, 1);
        endDate   = new Date(year, (value - 1) * 3 + 3, 0);
        endDate.setHours(23, 59, 59, 999);
        break;

      case ReportPeriodType.HALF_YEARLY:
        if (value < 1 || value > 2)
          throw new BadRequestException('Half year must be 1 or 2');
        startDate = new Date(year, value === 1 ? 0 : 6, 1);
        endDate   = new Date(year, value === 1 ? 6 : 12, 0);
        endDate.setHours(23, 59, 59, 999);
        break;

      case ReportPeriodType.YEARLY:
        startDate = new Date(year, 0, 1);
        endDate   = new Date(year, 11, 31);
        endDate.setHours(23, 59, 59, 999);
        break;

      default:
        throw new BadRequestException('Invalid report period type');
    }

    return { startDate, endDate };
  }
}