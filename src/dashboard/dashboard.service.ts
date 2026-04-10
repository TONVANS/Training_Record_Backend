// src/dashboard/dashboard.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CourseStatus, EnrollmentStatus } from '@prisma/client';

/**
 * DashboardService provides aggregated metrics and analytics
 */
@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get comprehensive dashboard metrics
   * Uses efficient Prisma queries with aggregations and groupBy
   * Can filter by date range (startDate and endDate)
   */
  async getMetrics(startDate?: string, endDate?: string) {
    // Parse and validate date inputs
    const dateFilter: { gte?: Date; lte?: Date } = {};

    if (startDate) {
      const parsedStart = new Date(startDate);
      if (!isNaN(parsedStart.getTime())) {
        dateFilter.gte = parsedStart;
      }
    }

    if (endDate) {
      const parsedEnd = new Date(endDate);
      if (!isNaN(parsedEnd.getTime())) {
        // Set end date to end of day
        parsedEnd.setHours(23, 59, 59, 999);
        dateFilter.lte = parsedEnd;
      }
    }

    // If no date filters provided, use current year
    if (!startDate && !endDate) {
      const currentYear = new Date().getFullYear();
      dateFilter.gte = new Date(currentYear, 0, 1);
      dateFilter.lte = new Date(currentYear, 11, 31, 23, 59, 59, 999);
    }

    // Execute all queries in parallel for better performance
    const [
      totalEmployees,
      activeCourses,
      totalCourses,
      totalEnrollments,
      enrollmentsByStatus,
      completionStats,
      coursesByFormat,
      upcomingCoursesCount,
      totalAnnualBudget,
    ] = await Promise.all([
      // Total number of employees
      this.prisma.employee.count(),

      // Active courses (currently running)
      this.prisma.course.count({
        where: {
          status: CourseStatus.ACTIVE,
          start_date: { lte: new Date() },
          end_date: { gte: new Date() },
        },
      }),

      // Total courses (filtered by date range)
      this.prisma.course.count({
        where: {
          start_date: dateFilter,
        },
      }),

      // Total enrollments
      this.prisma.enrollment.count(),

      // Enrollments grouped by status
      this.prisma.enrollment.groupBy({
        by: ['status'],
        _count: {
          status: true,
        },
      }),

      // Completion statistics
      this.getCompletionStatistics(),

      // Courses by format (filtered by date range)
      this.prisma.course.groupBy({
        by: ['format'],
        _count: {
          format: true,
        },
        where: {
          start_date: dateFilter,
        },
      }),

      // Upcoming courses (next 30 days)
      this.prisma.course.count({
        where: {
          start_date: {
            gte: new Date(),
            lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          },
          status: CourseStatus.SCHEDULED,
        },
      }),

      // Total budget used (filtered by date range)
      this.prisma.course.aggregate({
        where: {
          start_date: dateFilter,
        },
        _sum: {
          budget: true,
        },
      }),
    ]);

    // Calculate total annual budget
    const totalBudgetUsed = totalAnnualBudget._sum.budget
      ? parseFloat(totalAnnualBudget._sum.budget.toString())
      : 0;

    // Calculate completed enrollments for breakdown
    const completedEnrollments =
      enrollmentsByStatus.find((e) => e.status === EnrollmentStatus.COMPLETED)
        ?._count.status || 0;

    // Format enrollments by status
    const enrollmentStatusBreakdown = {
      enrolled:
        enrollmentsByStatus.find((e) => e.status === EnrollmentStatus.ENROLLED)
          ?._count.status || 0,
      in_progress:
        enrollmentsByStatus.find(
          (e) => e.status === EnrollmentStatus.IN_PROGRESS,
        )?._count.status || 0,
      completed: completedEnrollments,
      failed:
        enrollmentsByStatus.find((e) => e.status === EnrollmentStatus.FAILED)
          ?._count.status || 0,
    };

    // Format courses by format
    const courseFormatBreakdown = {
      online:
        coursesByFormat.find((c) => c.format === 'ONLINE')?._count.format || 0,
      onsite:
        coursesByFormat.find((c) => c.format === 'ONSITE')?._count.format || 0,
    };

    return {
      overview: {
        total_employees: totalEmployees,
        total_courses: totalCourses,
        active_courses: activeCourses,
        upcoming_courses: upcomingCoursesCount,
        total_enrollments: totalEnrollments,
        total_annual_budget_used: totalBudgetUsed,
      },
      enrollments: {
        total: totalEnrollments,
        by_status: enrollmentStatusBreakdown,
      },
      courses: {
        total: totalCourses,
        by_format: courseFormatBreakdown,
        active: activeCourses,
        upcoming: upcomingCoursesCount,
      },
      completion: completionStats,
    };
  }

  /**
   * Get upcoming courses (next 7-30 days)
   * This serves as the notification/display system
   * Can filter by date range (startDate and endDate)
   */
  async getUpcomingCourses(
    daysAhead: number = 30,
    startDate?: string,
    endDate?: string,
  ) {
    const now = new Date();
    const futureDate = new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000);

    // Parse date filters if provided
    let customStart: Date | undefined;
    let customEnd: Date | undefined;

    if (startDate) {
      const parsed = new Date(startDate);
      if (!isNaN(parsed.getTime())) {
        customStart = parsed;
      }
    }

    if (endDate) {
      const parsed = new Date(endDate);
      if (!isNaN(parsed.getTime())) {
        parsed.setHours(23, 59, 59, 999);
        customEnd = parsed;
      }
    }

    // Determine date range: use custom dates if provided, otherwise use futureDate
    const startFilter = customStart || now;
    const endFilter = customEnd || futureDate;

    const upcomingCourses = await this.prisma.course.findMany({
      where: {
        start_date: {
          gte: startFilter,
          lte: endFilter,
        },
        status: {
          in: [CourseStatus.SCHEDULED, CourseStatus.ACTIVE],
        },
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: {
            enrollments: true,
          },
        },
      },
      orderBy: {
        start_date: 'asc',
      },
    });

    // Calculate days until start for each course
    const coursesWithCountdown = upcomingCourses.map((course) => {
      const daysUntilStart = Math.ceil(
        (course.start_date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
      );

      return {
        ...course,
        days_until_start: daysUntilStart,
        enrolled_count: course._count.enrollments,
      };
    });

    return {
      total: coursesWithCountdown.length,
      courses: coursesWithCountdown,
    };
  }

  /**
   * Get top performing courses by completion rate
   * Can filter by date range (startDate and endDate)
   */
  async getTopPerformingCourses(
    limit: number = 10,
    startDate?: string,
    endDate?: string,
  ) {
    // Parse date filters if provided
    const dateFilter: { gte?: Date; lte?: Date } = {};

    if (startDate) {
      const parsed = new Date(startDate);
      if (!isNaN(parsed.getTime())) {
        dateFilter.gte = parsed;
      }
    }

    if (endDate) {
      const parsed = new Date(endDate);
      if (!isNaN(parsed.getTime())) {
        parsed.setHours(23, 59, 59, 999);
        dateFilter.lte = parsed;
      }
    }

    const courses = await this.prisma.course.findMany({
      where: {
        enrollments: {
          some: {},
        },
        ...(Object.keys(dateFilter).length > 0 && {
          start_date: dateFilter,
        }),
      },
      select: {
        id: true,
        title: true,
        category: {
          select: {
            name: true,
          },
        },
        enrollments: {
          select: {
            status: true,
          },
        },
      },
    });

    // Calculate completion rate for each course
    const coursesWithStats = courses
      .map((course) => {
        const totalEnrollments = course.enrollments.length;
        const completedEnrollments = course.enrollments.filter(
          (e) => e.status === EnrollmentStatus.COMPLETED,
        ).length;
        const completionRate =
          totalEnrollments > 0
            ? (completedEnrollments / totalEnrollments) * 100
            : 0;

        return {
          id: course.id,
          title: course.title,
          category: course.category.name,
          total_enrollments: totalEnrollments,
          completed_enrollments: completedEnrollments,
          completion_rate: parseFloat(completionRate.toFixed(2)),
        };
      })
      .sort((a, b) => b.completion_rate - a.completion_rate)
      .slice(0, limit);

    return coursesWithStats;
  }

  /**
   * Get department-wise training statistics
   */
  async getDepartmentStatistics() {
    // Get all employees with their enrollments
    const employeesWithEnrollments = await this.prisma.employee.findMany({
      select: {
        department_id: true,
        enrollments: {
          select: {
            status: true,
          },
        },
      },
    });

    // Group by department
    const departmentMap = new Map<
      number | null,
      {
        total_employees: number;
        total_enrollments: number;
        completed_enrollments: number;
      }
    >();

    employeesWithEnrollments.forEach((employee) => {
      const dept = employee.department_id;
      if (!departmentMap.has(dept)) {
        departmentMap.set(dept, {
          total_employees: 0,
          total_enrollments: 0,
          completed_enrollments: 0,
        });
      }

      const stats = departmentMap.get(dept)!;
      stats.total_employees++;
      stats.total_enrollments += employee.enrollments.length;
      stats.completed_enrollments += employee.enrollments.filter(
        (e) => e.status === EnrollmentStatus.COMPLETED,
      ).length;
    });

    // Convert to array and calculate rates
    const departmentStats = Array.from(departmentMap.entries()).map(
      ([department_id, stats]) => ({
        department_id,
        total_employees: stats.total_employees,
        total_enrollments: stats.total_enrollments,
        completed_enrollments: stats.completed_enrollments,
        completion_rate:
          stats.total_enrollments > 0
            ? parseFloat(
                (
                  (stats.completed_enrollments / stats.total_enrollments) *
                  100
                ).toFixed(2),
              )
            : 0,
        avg_enrollments_per_employee: parseFloat(
          (stats.total_enrollments / stats.total_employees).toFixed(2),
        ),
      }),
    );

    return departmentStats.sort(
      (a, b) => b.total_enrollments - a.total_enrollments,
    );
  }

  // ========== HELPER METHODS ==========

  /**
   * Get detailed completion statistics
   */
  private async getCompletionStatistics() {
    const totalEnrollments = await this.prisma.enrollment.count();
    const completedEnrollments = await this.prisma.enrollment.count({
      where: { status: EnrollmentStatus.COMPLETED },
    });
    const inProgressEnrollments = await this.prisma.enrollment.count({
      where: { status: EnrollmentStatus.IN_PROGRESS },
    });
    const failedEnrollments = await this.prisma.enrollment.count({
      where: { status: EnrollmentStatus.FAILED },
    });

    const completionRate =
      totalEnrollments > 0
        ? (completedEnrollments / totalEnrollments) * 100
        : 0;
    const failureRate =
      totalEnrollments > 0 ? (failedEnrollments / totalEnrollments) * 100 : 0;

    return {
      total_enrollments: totalEnrollments,
      completed: completedEnrollments,
      in_progress: inProgressEnrollments,
      failed: failedEnrollments,
      completion_rate: parseFloat(completionRate.toFixed(2)),
      failure_rate: parseFloat(failureRate.toFixed(2)),
    };
  }
}
