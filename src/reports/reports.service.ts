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

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  // ==========================================
  // 1. ລາຍງານລວມ (ຂອງເກົ່າ)
  // ==========================================
  async getTrainingReport(year: number, type: ReportPeriodType, value: number) {
    // ... (ໂຄ້ດເກົ່າຂອງທ່ານຍັງຄົງເດີມ ບໍ່ປ່ຽນແປງ) ...
    const { startDate, endDate } = this.getDateRange(year, type, value);

    const courses = await this.prisma.course.findMany({
      where: {
        start_date: { gte: startDate, lte: endDate },
        status: { not: CourseStatus.CANCELLED },
      },
      select: {
        id: true, title: true, start_date: true, end_date: true, location_type: true, location: true,
        country: true, institution: true, organization: true, format: true, budget: true,
        enrollments: {
          select: {
            employee: { select: { special_subject_id: true, gender: true } },
          },
        },
      },
      orderBy: { start_date: 'asc' },
    });

    const reportData = courses.map((course, index) => {
      const attendees = {
        technical: { male: 0, female: 0, total: 0 },
        administrative: { male: 0, female: 0, total: 0 },
        total: { male: 0, female: 0, total: 0 },
      };

      course.enrollments.forEach((enrollment) => {
        const subjectId = enrollment.employee?.special_subject_id;
        const gender = enrollment.employee?.gender;
        const isMale = gender === Gender.MALE;
        const isFemale = gender === Gender.FEMALE;

        if (subjectId === 1) {
          if (isMale) attendees.technical.male++;
          else if (isFemale) attendees.technical.female++;
          attendees.technical.total++;
        } else if (subjectId === 2) {
          if (isMale) attendees.administrative.male++;
          else if (isFemale) attendees.administrative.female++;
          attendees.administrative.total++;
        }

        if (isMale) attendees.total.male++;
        else if (isFemale) attendees.total.female++;
        attendees.total.total++;
      });

      const diffTime = Math.abs(course.end_date.getTime() - course.start_date.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

      return {
        no: index + 1, course_title: course.title, budget: Number(course.budget),
        attendees, duration: { start_date: course.start_date, end_date: course.end_date, total_days: diffDays },
        location: { is_domestic: course.location_type === LocationType.DOMESTIC, is_international: course.location_type === LocationType.INTERNATIONAL, detail: course.location || course.country || 'N/A' },
        institution: course.institution || course.organization || 'N/A', format: course.format,
      };
    });

    const summary = this.calculateSummary(reportData);
    return { report_info: { year, period_type: type, period_value: type === ReportPeriodType.YEARLY ? null : value, report_date: new Date() }, summary, data: reportData };
  }

  // ==========================================
  // 2. ລາຍງານແຍກຕາມຝ່າຍ (ເພີ່ມໃໝ່)
  // ==========================================
  async getDepartmentTrainingReport(departmentId: number, year: number, type: ReportPeriodType, value: number) {
    const { startDate, endDate } = this.getDateRange(year, type, value);

    // ກວດສອບວ່າມີ Department ນີ້ຫຼືບໍ່
    const dept = await this.prisma.department.findUnique({ where: { id: departmentId } });
    if (!dept) throw new BadRequestException('ບໍ່ພົບຂໍ້ມູນຝ່າຍທີ່ລະບຸ');

    const courses = await this.prisma.course.findMany({
      where: {
        start_date: { gte: startDate, lte: endDate },
        status: { not: CourseStatus.CANCELLED },
        // ເງື່ອນໄຂ: Course ນີ້ຕ້ອງມີພະນັກງານຂອງຝ່າຍນີ້ເຂົ້າຮ່ວມຢ່າງໜ້ອຍ 1 ຄົນ
        enrollments: {
          some: { employee: { department_id: departmentId } },
        },
      },
      select: {
        id: true, title: true, start_date: true, end_date: true,
        location_type: true, location: true, country: true,
        institution: true, organization: true, format: true,
        enrollments: {
          // ເງື່ອນໄຂ: ດຶງມາສະເພາະຂໍ້ມູນ Enrollment ທີ່ເປັນຂອງພະນັກງານໃນຝ່າຍນີ້ເທົ່ານັ້ນ
          where: { employee: { department_id: departmentId } },
          select: {
            employee: {
              select: {
                employee_code: true,
                first_name_la: true,
                last_name_la: true,
                gender: true,
                special_subject_id: true,
                position: { select: { name: true } },
                department: { select: { name: true } },
              },
            },
          },
        },
      },
      orderBy: { start_date: 'asc' },
    });

    const reportData = courses.map((course, index) => {
      const attendees = {
        technical: { male: 0, female: 0, total: 0 },
        administrative: { male: 0, female: 0, total: 0 },
        total: { male: 0, female: 0, total: 0 },
      };

      // ປັບໂຄງສ້າງເພື່ອເກັບລາຍຊື່ຜູ້ເຂົ້າຮ່ວມ
      const attendee_list = course.enrollments.map((enrollment) => {
        const emp = enrollment.employee;
        const isMale = emp.gender === Gender.MALE;
        const isFemale = emp.gender === Gender.FEMALE;

        // ຄິດໄລ່ຈຳນວນ
        if (emp.special_subject_id === 1) {
          if (isMale) attendees.technical.male++;
          else if (isFemale) attendees.technical.female++;
          attendees.technical.total++;
        } else if (emp.special_subject_id === 2) {
          if (isMale) attendees.administrative.male++;
          else if (isFemale) attendees.administrative.female++;
          attendees.administrative.total++;
        }

        if (isMale) attendees.total.male++;
        else if (isFemale) attendees.total.female++;
        attendees.total.total++;

        // ສົ່ງຂໍ້ມູນພະນັກງານອອກໄປ
        return {
          employee_code: emp.employee_code,
          full_name: `${emp.first_name_la} ${emp.last_name_la}`,
          position: emp.position?.name || '-',
          department: emp.department?.name || '-',
        };
      });

      const diffTime = Math.abs(course.end_date.getTime() - course.start_date.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

      return {
        no: index + 1,
        course_title: course.title,
        attendee_list, // ✅ ລາຍຊື່ພະນັກງານທີ່ເຂົ້າຮ່ວມ
        attendees,     // ✅ ສະຫຼຸບຈຳນວນ ຊາຍ-ຍິງ
        duration: {
          start_date: course.start_date,
          end_date: course.end_date,
          total_days: diffDays,
        },
        location: {
          is_domestic: course.location_type === LocationType.DOMESTIC,
          is_international: course.location_type === LocationType.INTERNATIONAL,
          detail: course.location || course.country || 'N/A',
        },
        institution: course.institution || course.organization || 'N/A',
        format: course.format,
      };
    });

    const summary = this.calculateSummary(reportData);

    return {
      report_info: {
        department: { id: dept.id, name: dept.name }, // ບອກວ່າລາຍງານນີ້ຂອງຝ່າຍໃດ
        year,
        period_type: type,
        period_value: type === ReportPeriodType.YEARLY ? null : value,
        report_date: new Date(),
      },
      summary,
      data: reportData,
    };
  }

  // ==========================================
  // Helper Methods
  // ==========================================
  private calculateSummary(reportData: any[]) {
    return reportData.reduce(
      (acc, curr) => {
        acc.total_technical_male += curr.attendees.technical.male;
        acc.total_technical_female += curr.attendees.technical.female;
        acc.total_technical += curr.attendees.technical.total;

        acc.total_administrative_male += curr.attendees.administrative.male;
        acc.total_administrative_female += curr.attendees.administrative.female;
        acc.total_administrative += curr.attendees.administrative.total;

        acc.total_male += curr.attendees.total.male;
        acc.total_female += curr.attendees.total.female;
        acc.total_attendees += curr.attendees.total.total;

        acc.total_courses++;
        acc.total_days += curr.duration.total_days;
        if (curr.budget) acc.total_budget += curr.budget; // ກັນ Error ຖ້າລາຍງານຝ່າຍບໍ່ມີ Budget

        if (curr.location.is_domestic) acc.total_domestic++;
        if (curr.location.is_international) acc.total_international++;
        if (curr.format === 'ONLINE') acc.total_online++;
        if (curr.format === 'ONSITE') acc.total_onsite++;

        return acc;
      },
      {
        total_technical_male: 0, total_technical_female: 0, total_technical: 0,
        total_administrative_male: 0, total_administrative_female: 0, total_administrative: 0,
        total_male: 0, total_female: 0, total_attendees: 0,
        total_courses: 0, total_days: 0, total_domestic: 0, total_international: 0,
        total_online: 0, total_onsite: 0, total_budget: 0,
      },
    );
  }

  private getDateRange(year: number, type: ReportPeriodType, value: number) {
    let startDate: Date; let endDate: Date;
    switch (type) {
      case ReportPeriodType.MONTHLY:
        if (value < 1 || value > 12) throw new BadRequestException('Month must be between 1 and 12');
        startDate = new Date(year, value - 1, 1);
        endDate = new Date(year, value, 0);
        endDate.setHours(23, 59, 59, 999);
        break;
      case ReportPeriodType.QUARTERLY:
        if (value < 1 || value > 4) throw new BadRequestException('Quarter must be between 1 and 4');
        const startMonthQuarter = (value - 1) * 3;
        startDate = new Date(year, startMonthQuarter, 1);
        endDate = new Date(year, startMonthQuarter + 3, 0);
        endDate.setHours(23, 59, 59, 999);
        break;
      case ReportPeriodType.HALF_YEARLY:
        if (value < 1 || value > 2) throw new BadRequestException('Half year must be 1 or 2');
        const startMonthHalf = value === 1 ? 0 : 6;
        startDate = new Date(year, startMonthHalf, 1);
        endDate = new Date(year, startMonthHalf + 6, 0);
        endDate.setHours(23, 59, 59, 999);
        break;
      case ReportPeriodType.YEARLY:
        startDate = new Date(year, 0, 1);
        endDate = new Date(year, 11, 31);
        endDate.setHours(23, 59, 59, 999);
        break;
      default:
        throw new BadRequestException('Invalid report period type');
    }
    return { startDate, endDate };
  }
}