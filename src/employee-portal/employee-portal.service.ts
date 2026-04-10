// src/employee-portal/employee-portal.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class EmployeePortalService {
  constructor(private readonly prisma: PrismaService) { }

  async getAvailableCourses(employeeId: number) {
    return this.prisma.course.findMany({
      where: {
        status: {
          in: ['SCHEDULED', 'ACTIVE', 'COMPLETED'],
        },
        enrollments: {
          some: {
            employee_id: employeeId,
          },
        },
      },
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
    });
  }

  async getMyEnrollments(employeeId: number) {
    return this.prisma.enrollment.findMany({
      where: { employee_id: employeeId },
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
    });
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
  async getMyCertificates(employeeId: number) {
    return this.prisma.enrollment.findMany({
      where: {
        employee_id: employeeId,
        certificate_url: { not: null },
      },
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
    });
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
