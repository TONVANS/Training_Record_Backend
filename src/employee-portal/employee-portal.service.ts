// src/employee-portal/employee-portal.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EmployeePortalFilterDto } from './dto/employee-portal-filter.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class EmployeePortalService {
  constructor(private readonly prisma: PrismaService) { }

  async getAvailableCourses(employeeId: number, filters?: EmployeePortalFilterDto) {
    const page = filters?.page ?? 1;
    const limit = filters?.limit ?? 10;
    const skip = (page - 1) * limit;

    const where: Prisma.CourseWhereInput = {
      status: {
        in: ['SCHEDULED', 'ACTIVE', 'COMPLETED'],
      },
    };

    if (filters?.title) {
      where.title = { contains: filters.title, mode: 'insensitive' };
    }
    if (filters?.category_id) {
      where.category_id = Number(filters.category_id);
    }
    if (filters?.format) {
      where.format = filters.format;
    }
    if (filters?.location_type) {
      where.location_type = filters.location_type;
    }
    if (filters?.start_date) {
      where.start_date = { gte: new Date(filters.start_date) };
    }
    if (filters?.end_date) {
      where.end_date = { lte: new Date(filters.end_date) };
    }

    const [total, data] = await Promise.all([
      this.prisma.course.count({ where }),
      this.prisma.course.findMany({
        where,
        select: {
          id: true,
          title: true,
          description: true,
          category: true,
          start_date: true,
          end_date: true,
          format: true,
          location_type: true,
          location: true,
          country: true,
          status: true,
          trainer: true,
          institution: true,
          organization: true,
          materials: {
            select: {
              id: true,
              type: true,
              file_path_or_link: true,
              created_at: true,
            },
          },
          enrollments: {
            where: { employee_id: employeeId },
          },
        },
        orderBy: {
          start_date: 'asc',
        },
        skip,
        take: limit,
      }),
    ]);

    return { data, total, page, limit };
  }

  async getCourseById(courseId: number, employeeId: number) {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      select: {
        id: true,
        title: true,
        description: true,
        category: true,
        start_date: true,
        end_date: true,
        format: true,
        location_type: true,
        location: true,
        country: true,
        status: true,
        trainer: true,
        institution: true,
        organization: true,
        materials: {
          select: {
            id: true,
            type: true,
            file_path_or_link: true,
            created_at: true,
          },
        },
        enrollments: {
          where: { employee_id: employeeId },
        },
      },
    });

    if (!course) {
      throw new NotFoundException(`Course with ID ${courseId} not found`);
    }

    return course;
  }

  async getMyEnrollments(employeeId: number, filters?: EmployeePortalFilterDto) {
    const page = filters?.page ?? 1;
    const limit = filters?.limit ?? 10;
    const skip = (page - 1) * limit;

    const courseWhere: Prisma.CourseWhereInput = {};
    if (filters?.title) {
      courseWhere.title = { contains: filters.title, mode: 'insensitive' };
    }
    if (filters?.category_id) {
      courseWhere.category_id = Number(filters.category_id);
    }
    if (filters?.format) courseWhere.format = filters.format;
    if (filters?.location_type) courseWhere.location_type = filters.location_type;
    if (filters?.start_date) {
      courseWhere.start_date = { gte: new Date(filters.start_date) };
    }
    if (filters?.end_date) {
      courseWhere.end_date = { lte: new Date(filters.end_date) };
    }

    const where: Prisma.EnrollmentWhereInput = {
      employee_id: employeeId,
      ...(Object.keys(courseWhere).length > 0 && { course: courseWhere }),
    };

    const [total, data] = await Promise.all([
      this.prisma.enrollment.count({ where }),
      this.prisma.enrollment.findMany({
        where,
        include: {
          course: {
            select: {
              id: true,
              title: true,
              description: true,
              category: true,
              start_date: true,
              end_date: true,
              format: true,
              location_type: true,
              location: true,
              country: true,
              status: true,
              trainer: true,
              institution: true,
              organization: true,
              materials: true,
            },
          },
        },
        orderBy: {
          enrolled_at: 'desc',
        },
        skip,
        take: limit,
      }),
    ]);

    return { data, total, page, limit };
  }

  async getMyProfile(employeeId: number) {
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      select: {
        id: true,
        emp_id_ref: true,
        employee_code: true,
        first_name_la: true,
        last_name_la: true,
        email: true,
        phone: true,
        image: true,
        gender: true,
        status: true,
        role: true,
        department: true,
        division: true,
        unit: true,
        position: true,
        positionCode: true,
        specialSubject: true,
      },
    });

    if (!employee) {
      throw new NotFoundException(`Employee with ID ${employeeId} not found`);
    }

    return employee;
  }

  // ✅ ດຶງ certificates ທັງໝົດຂອງ employee (ສະເພາະ enrollment ທີ່ມີ certificate)
  async getMyCertificates(employeeId: number, filters?: EmployeePortalFilterDto) {
    const page = filters?.page ?? 1;
    const limit = filters?.limit ?? 10;
    const skip = (page - 1) * limit;

    const courseWhere: Prisma.CourseWhereInput = {};
    if (filters?.title) {
      courseWhere.title = { contains: filters.title, mode: 'insensitive' };
    }
    if (filters?.category_id) {
      courseWhere.category_id = Number(filters.category_id);
    }
    if (filters?.format) courseWhere.format = filters.format;
    if (filters?.location_type) courseWhere.location_type = filters.location_type;
    if (filters?.start_date) {
      courseWhere.start_date = { gte: new Date(filters.start_date) };
    }
    if (filters?.end_date) {
      courseWhere.end_date = { lte: new Date(filters.end_date) };
    }

    const where: Prisma.EnrollmentWhereInput = {
      employee_id: employeeId,
      certificate_url: { not: null },
      ...(Object.keys(courseWhere).length > 0 && { course: courseWhere }),
    };

    const [total, data] = await Promise.all([
      this.prisma.enrollment.count({ where }),
      this.prisma.enrollment.findMany({
        where,
        select: {
          id: true,
          certificate_url: true,
          enrolled_at: true,
          status: true,
          course: {
            select: {
              id: true,
              title: true,
              category: true,
              start_date: true,
              end_date: true,
              trainer: true,
              institution: true,
              organization: true,
            },
          },
        },
        orderBy: {
          enrolled_at: 'desc',
        },
        skip,
        take: limit,
      }),
    ]);

    return { data, total, page, limit };
  }

  // ✅ ດຶງ certificate ຂອງ enrollment ໜຶ່ງ (ກວດສອບສິດ)
  async getCertificate(enrollmentId: number, employeeId: number) {
    const enrollment = await this.prisma.enrollment.findUnique({
      where: { id: enrollmentId },
      select: {
        id: true,
        employee_id: true,
        certificate_url: true,
        enrolled_at: true,
        status: true,
        course: {
          select: {
            id: true,
            title: true,
            category: true,
            start_date: true,
            end_date: true,
            trainer: true,
            institution: true,
            organization: true,
          },
        },
      },
    });

    if (!enrollment || enrollment.employee_id !== employeeId) {
      throw new NotFoundException(
        `Enrollment with ID ${enrollmentId} not found or no permission`,
      );
    }

    if (!enrollment.certificate_url) {
      throw new NotFoundException(
        `No certificate uploaded for enrollment ID ${enrollmentId}`,
      );
    }

    return enrollment;
  }

  async uploadCertificate(
    enrollmentId: number,
    employeeId: number,
    fileUrl: string,
  ) {
    const enrollment = await this.prisma.enrollment.findUnique({
      where: { id: enrollmentId },
    });

    if (!enrollment || enrollment.employee_id !== employeeId) {
      throw new NotFoundException(
        `Enrollment with ID ${enrollmentId} not found or no permission`,
      );
    }

    return this.prisma.enrollment.update({
      where: { id: enrollmentId },
      data: { certificate_url: fileUrl },
    });
  }


  async getMaterialForEmployee(materialId: number, employeeId: number) {
    const material = await this.prisma.courseMaterial.findUnique({
      where: { id: materialId },
      include: {
        course: {
          include: {
            enrollments: {
              where: { employee_id: employeeId },
            },
          },
        },
      },
    });

    if (!material) {
      throw new NotFoundException(`Material with ID ${materialId} not found`);
    }

    if (material.course.enrollments.length === 0) {
      throw new NotFoundException(`No permission to access this material`);
    }

    return material;
  }
}
