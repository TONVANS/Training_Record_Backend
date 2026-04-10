import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { CourseStatus } from '@prisma/client';

@Injectable()
export class CronService {
  private readonly logger = new Logger(CronService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ทำงานทุกวันเวลา 9:00 น.
  @Cron('0 9 * * *')
  async updateCourseStatuses() {
    this.logger.log('Running daily course status update cron job...');
    const now = new Date();

    try {
      // 1. อัปเดต Courses เป็น ACTIVE (ถ้างวดเวลาเรียนครอบคลุมถึงปัจจุบัน)
      const activeUpdateResult = await this.prisma.course.updateMany({
        where: {
          status: CourseStatus.SCHEDULED,
          start_date: { lte: now },
          end_date: { gte: now },
        },
        data: {
          status: CourseStatus.ACTIVE,
        },
      });

      if (activeUpdateResult.count > 0) {
        this.logger.log(
          `Updated ${activeUpdateResult.count} courses to ACTIVE status.`,
        );
      }

      // 2. อัปเดต Courses เป็น COMPLETED (ถ้าเวลาสิ้นสุดน้อยกว่าปัจจุบัน)
      const completedUpdateResult = await this.prisma.course.updateMany({
        where: {
          status: { in: [CourseStatus.SCHEDULED, CourseStatus.ACTIVE] },
          end_date: { lt: now },
        },
        data: {
          status: CourseStatus.COMPLETED,
        },
      });

      if (completedUpdateResult.count > 0) {
        this.logger.log(
          `Updated ${completedUpdateResult.count} courses to COMPLETED status.`,
        );
      }
    } catch (error) {
      this.logger.error('Error updating course statuses', error);
    }
  }
}
