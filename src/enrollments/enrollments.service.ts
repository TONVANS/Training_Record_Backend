// enrollments.service.ts
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateEnrollmentDto,
  BulkEnrollmentDto,
} from './dto/create-enrollment.dto';
import { UpdateEnrollmentStatusDto } from './dto/update-enrollment-status.dto';
import { EnrollmentStatus } from '@prisma/client';

/**
 * EnrollmentService handles employee course enrollments
 */
@Injectable()
export class EnrollmentService {
  private readonly logger = new Logger(EnrollmentService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Enroll a single employee in a course
   */
  async createEnrollment(createEnrollmentDto: CreateEnrollmentDto) {
    const { employee_id, course_id } = createEnrollmentDto;

    // Verify employee exists
    const employee = await this.prisma.employee.findUnique({
      where: { id: employee_id },
    });

    if (!employee) {
      throw new NotFoundException(`Employee with ID ${employee_id} not found`);
    }

    // Verify course exists
    const course = await this.prisma.course.findUnique({
      where: { id: course_id },
    });

    if (!course) {
      throw new NotFoundException(`Course with ID ${course_id} not found`);
    }

    // Check if employee is already enrolled (unique constraint handles this, but we provide better error)
    const existingEnrollment = await this.prisma.enrollment.findUnique({
      where: {
        employee_id_course_id: {
          employee_id,
          course_id,
        },
      },
    });

    if (existingEnrollment) {
      const fullName = `${employee.first_name_la} ${employee.last_name_la}`;
      throw new ConflictException(
        `Employee ${fullName} is already enrolled in course ${course.title}`,
      );
    }

    // Create enrollment
    const enrollment = await this.prisma.enrollment.create({
      data: {
        employee_id,
        course_id,
        status: EnrollmentStatus.ENROLLED,
      },
      include: {
        employee: {
          select: {
            id: true,
            first_name_la: true,
            last_name_la: true,
            email: true,
            position_id: true,
            department_id: true,
          },
        },
        course: {
          select: {
            id: true,
            title: true,
            start_date: true,
            end_date: true,
            format: true,
          },
        },
      },
    });

    this.logger.log(
      `Enrolled ${enrollment.employee.first_name_la} ${enrollment.employee.last_name_la} in ${course.title}`,
    );
    return enrollment;
  }

  /**
   * Bulk enroll multiple employees in a course
   */
  async bulkEnrollment(bulkEnrollmentDto: BulkEnrollmentDto) {
    const { employee_ids, course_id } = bulkEnrollmentDto;

    // Verify course exists
    const course = await this.prisma.course.findUnique({
      where: { id: course_id },
    });

    if (!course) {
      throw new NotFoundException(`Course with ID ${course_id} not found`);
    }

    // Verify all employees exist
    const employees = await this.prisma.employee.findMany({
      where: {
        id: { in: employee_ids },
      },
    });

    if (employees.length !== employee_ids.length) {
      const foundIds = employees.map((e) => e.id);
      const missingIds = employee_ids.filter((id) => !foundIds.includes(id));
      throw new NotFoundException(
        `Employees not found: ${missingIds.join(', ')}`,
      );
    }

    // Check for existing enrollments
    const existingEnrollments = await this.prisma.enrollment.findMany({
      where: {
        course_id,
        employee_id: { in: employee_ids },
      },
      include: {
        employee: { select: { first_name_la: true, last_name_la: true } },
      },
    });

    if (existingEnrollments.length > 0) {
      const alreadyEnrolled = existingEnrollments.map(
        (e) => `${e.employee.first_name_la} ${e.employee.last_name_la}`,
      );
      throw new ConflictException(
        `Following employees are already enrolled: ${alreadyEnrolled.join(', ')}`,
      );
    }

    // Create enrollments in a transaction
    const enrollments = await this.prisma.$transaction(
      employee_ids.map((employee_id) =>
        this.prisma.enrollment.create({
          data: {
            employee_id,
            course_id,
            status: EnrollmentStatus.ENROLLED,
          },
          include: {
            employee: {
              select: {
                id: true,
                first_name_la: true,
                last_name_la: true,
                email: true,
              },
            },
          },
        }),
      ),
    );

    this.logger.log(
      `Bulk enrolled ${enrollments.length} employees in ${course.title}`,
    );

    return {
      message: `Successfully enrolled ${enrollments.length} employees`,
      enrollments,
    };
  }

  /**
   * Get all enrollments with optional filters
   */
  async getEnrollments(employeeId?: number, courseId?: number) {
    const where: any = {};

    if (employeeId) {
      where.employee_id = employeeId;
    }

    if (courseId) {
      where.course_id = courseId;
    }

    return this.prisma.enrollment.findMany({
      where,
      include: {
        employee: {
          select: {
            id: true,
            first_name_la: true,
            last_name_la: true,
            email: true,
            position_id: true,
            department_id: true,
          },
        },
        course: {
          select: {
            id: true,
            title: true,
            start_date: true,
            end_date: true,
            format: true,
            status: true,
          },
        },
      },
      orderBy: { enrolled_at: 'desc' },
    });
  }

  /**
   * Get a single enrollment by ID
   */
  async getEnrollment(id: number) {
    const enrollment = await this.prisma.enrollment.findUnique({
      where: { id },
      include: {
        employee: {
          select: {
            id: true,
            first_name_la: true,
            last_name_la: true,
            email: true,
            position_id: true,
            department_id: true,
          },
        },
        course: {
          include: {
            category: true,
            materials: true,
          },
        },
      },
    });

    if (!enrollment) {
      throw new NotFoundException(`Enrollment with ID ${id} not found`);
    }

    return enrollment;
  }

  /**
   * Update enrollment status
   */
  async updateEnrollmentStatus(
    id: number,
    updateDto: UpdateEnrollmentStatusDto,
  ) {
    const { status, certificate_url } = updateDto;

    // Verify enrollment exists
    const enrollment = await this.prisma.enrollment.findUnique({
      where: { id },
      include: {
        employee: { select: { first_name_la: true, last_name_la: true } },
        course: { select: { title: true } },
      },
    });

    if (!enrollment) {
      throw new NotFoundException(`Enrollment with ID ${id} not found`);
    }

    // Validate status transition
    this.validateStatusTransition(enrollment.status, status);

    // If status is COMPLETED, certificate_url should be provided
    if (
      status === EnrollmentStatus.COMPLETED &&
      !certificate_url &&
      !enrollment.certificate_url
    ) {
      throw new BadRequestException(
        'Certificate URL is required when marking as COMPLETED',
      );
    }

    // Update enrollment
    const updatedEnrollment = await this.prisma.enrollment.update({
      where: { id },
      data: {
        status,
        certificate_url: certificate_url || enrollment.certificate_url,
      },
      include: {
        employee: {
          select: {
            id: true,
            first_name_la: true,
            last_name_la: true,
            email: true,
          },
        },
        course: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });

    this.logger.log(
      `Updated enrollment status for ${enrollment.employee.first_name_la} ${enrollment.employee.last_name_la} in ${enrollment.course.title}: ${status}`,
    );

    return updatedEnrollment;
  }

  /**
   * Delete an enrollment
   */
  async deleteEnrollment(id: number) {
    const enrollment = await this.prisma.enrollment.findUnique({
      where: { id },
    });

    if (!enrollment) {
      throw new NotFoundException(`Enrollment with ID ${id} not found`);
    }

    await this.prisma.enrollment.delete({
      where: { id },
    });

    this.logger.log(`Deleted enrollment ${id}`);
    return { message: 'Enrollment deleted successfully' };
  }

  // ========== HELPER METHODS ==========

  /**
   * Validate enrollment status transitions
   */
  private validateStatusTransition(
    currentStatus: EnrollmentStatus,
    newStatus: EnrollmentStatus,
  ) {
    // Define valid transitions
    const validTransitions: Record<EnrollmentStatus, EnrollmentStatus[]> = {
      [EnrollmentStatus.ENROLLED]: [
        EnrollmentStatus.IN_PROGRESS,
        EnrollmentStatus.COMPLETED,
        EnrollmentStatus.FAILED,
      ],
      [EnrollmentStatus.IN_PROGRESS]: [
        EnrollmentStatus.COMPLETED,
        EnrollmentStatus.FAILED,
      ],
      [EnrollmentStatus.COMPLETED]: [], // Cannot change from COMPLETED
      [EnrollmentStatus.FAILED]: [], // Cannot change from FAILED
    };

    if (!validTransitions[currentStatus].includes(newStatus)) {
      throw new BadRequestException(
        `Invalid status transition from ${currentStatus} to ${newStatus}`,
      );
    }
  }
}
