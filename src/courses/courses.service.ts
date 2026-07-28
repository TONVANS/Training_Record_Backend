// src/courses/courses.service.ts
import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { CreateMaterialDto } from './dto/create-material.dto';
import { CourseFilterDto } from './dto/course-filter.dto';
import {
  TrainingFormat,
  LocationType,
  Prisma,
  CourseStatus,
  EnrollmentStatus,
  MaterialType,
} from '@prisma/client';
import { CreateCategoryDto } from 'src/categories/dto/create-category.dto';
import { join } from 'path';
import * as fs from 'fs';

export interface PaginatedCoursesResult {
  data: Prisma.CourseGetPayload<{
    include: {
      category: true;
      _count: { select: { enrollments: true; materials: true } };
    };
  }>[];
  total: number;
  page: number;
  limit: number;
}

@Injectable()
export class CoursesService {
  private readonly logger = new Logger(CoursesService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ========== CATEGORY OPERATIONS ==========

  async createCategory(createCategoryDto: CreateCategoryDto) {
    const { name } = createCategoryDto;
    const existingCategory = await this.prisma.trainingCategory.findUnique({
      where: { name },
    });
    if (existingCategory)
      throw new ConflictException(`Category '${name}' already exists`);

    const category = await this.prisma.trainingCategory.create({
      data: { name },
    });
    this.logger.log(`Created new category: ${name}`);
    return category;
  }

  async getCategories() {
    return this.prisma.trainingCategory.findMany({
      include: { _count: { select: { courses: true } } },
      orderBy: { name: 'asc' },
    });
  }

  // ========== COURSE OPERATIONS ==========

  async createCourse(
    createCourseDto: CreateCourseDto,
    documents?: Express.Multer.File[],
  ) {
    const {
      title,
      description,
      category_id,
      start_date,
      end_date,
      format,
      location_type,
      location,
      country,
      budget,
      trainer,
      institution,
      organization,
      employee_ids,
    } = createCourseDto;

    const category = await this.prisma.trainingCategory.findUnique({
      where: { id: category_id },
    });

    if (!category) {
      throw new NotFoundException(`Category with ID ${category_id} not found`);
    }

    const startDate = new Date(start_date);
    const endDate = new Date(end_date);

    if (endDate <= startDate) {
      throw new BadRequestException('End date must be after start date');
    }

    this.validateLocationLogic(
      format ?? TrainingFormat.ONLINE,
      location_type ?? null,
      location ?? null,
      country ?? null,
    );

    const now = new Date();
    let calculatedStatus: CourseStatus = CourseStatus.SCHEDULED;
    if (now > endDate) {
      calculatedStatus = CourseStatus.COMPLETED;
    } else if (now >= startDate && now <= endDate) {
      calculatedStatus = CourseStatus.ACTIVE;
    }

    const materialsData =
      documents?.map((doc) => ({
        type: MaterialType.PDF,
        file_path_or_link: `/uploads/courses/${doc.filename}`,
      })) || [];

    const enrollmentsData =
      employee_ids?.map((empId) => ({
        employee_id: empId,
        status: EnrollmentStatus.ENROLLED,
      })) || [];

    const course = await this.prisma.course.create({
      data: {
        title,
        description,
        category_id,
        start_date: startDate,
        end_date: endDate,
        format,
        location_type,
        location,
        country,
        budget: budget || 0,
        status: calculatedStatus,
        trainer,
        institution,
        organization,
        materials:
          materialsData.length > 0 ? { create: materialsData } : undefined,
        enrollments:
          enrollmentsData.length > 0 ? { create: enrollmentsData } : undefined,
      },
      include: {
        category: true,
        materials: true,
        enrollments: {
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
          },
        },
      },
    });

    this.logger.log(`Created new course: ${title} (${format})`);
    return course;
  }

  async getCourses(filters?: CourseFilterDto): Promise<PaginatedCoursesResult> {
    const page = filters?.page ?? 1;
    const limit = filters?.limit ?? 10;
    const skip = (page - 1) * limit;

    const where: Prisma.CourseWhereInput = {};

    if (filters?.title) {
      where.title = { contains: filters.title, mode: 'insensitive' };
    }
    if (filters?.category_id) where.category_id = filters.category_id;
    if (filters?.status) where.status = filters.status;
    if (filters?.format) where.format = filters.format;
    if (filters?.start_date_from || filters?.start_date_to) {
      where.start_date = {
        ...(filters.start_date_from && { gte: new Date(filters.start_date_from) }),
        ...(filters.start_date_to && { lte: new Date(filters.start_date_to) }),
      };
    }
    if (filters?.end_date_from || filters?.end_date_to) {
      where.end_date = {
        ...(filters.end_date_from && { gte: new Date(filters.end_date_from) }),
        ...(filters.end_date_to && { lte: new Date(filters.end_date_to) }),
      };
    }

    const [total, data] = await Promise.all([
      this.prisma.course.count({ where }),
      this.prisma.course.findMany({
        where,
        include: {
          category: true,
          _count: { select: { enrollments: true, materials: true } },
        },
        orderBy: { start_date: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    return { data, total, page, limit };
  }

  async getCourse(id: number) {
    const course = await this.prisma.course.findUnique({
      where: { id },
      include: {
        category: true,
        materials: true,
        enrollments: {
          include: {
            employee: {
              select: {
                id: true,
                employee_code: true,
                first_name_la: true,
                last_name_la: true,
                email: true,
                position_id: true,
                department_id: true,
              },
            },
          },
        },
      },
    });

    if (!course) {
      throw new NotFoundException(`Course with ID ${id} not found`);
    }

    return course;
  }

  async updateCourse(id: number, updateCourseDto: UpdateCourseDto) {
    const existingCourse = await this.prisma.course.findUnique({ where: { id } });

    if (!existingCourse) {
      throw new NotFoundException(`Course with ID ${id} not found`);
    }

    if (updateCourseDto.format || updateCourseDto.location_type) {
      const format = updateCourseDto.format ?? existingCourse.format;
      const location_type = updateCourseDto.location_type ?? existingCourse.location_type;
      const location =
        updateCourseDto.location !== undefined
          ? updateCourseDto.location
          : existingCourse.location;
      const country =
        updateCourseDto.country !== undefined
          ? updateCourseDto.country
          : existingCourse.country;
      this.validateLocationLogic(format, location_type, location, country);
    }

    if (updateCourseDto.start_date || updateCourseDto.end_date) {
      const startDate = updateCourseDto.start_date
        ? new Date(updateCourseDto.start_date)
        : existingCourse.start_date;
      const endDate = updateCourseDto.end_date
        ? new Date(updateCourseDto.end_date)
        : existingCourse.end_date;
      if (endDate <= startDate) {
        throw new BadRequestException('End date must be after start date');
      }
    }

    const { start_date, end_date, ...rest } = updateCourseDto;

    const updateData: Prisma.CourseUpdateInput = {
      ...rest,
      ...(start_date && { start_date: new Date(start_date) }),
      ...(end_date && { end_date: new Date(end_date) }),
    };

    let updatedCourse;
    const newStatus = updateCourseDto.status;

    if (newStatus && newStatus !== existingCourse.status) {
      let mappedEnrollmentStatus: EnrollmentStatus | undefined;
      switch (newStatus) {
        case CourseStatus.SCHEDULED:
          mappedEnrollmentStatus = EnrollmentStatus.ENROLLED;
          break;
        case CourseStatus.ACTIVE:
          mappedEnrollmentStatus = EnrollmentStatus.IN_PROGRESS;
          break;
        case CourseStatus.COMPLETED:
          mappedEnrollmentStatus = EnrollmentStatus.COMPLETED;
          break;
      }

      updatedCourse = await this.prisma.$transaction(async (prisma) => {
        const course = await prisma.course.update({
          where: { id },
          data: updateData,
        });

        if (mappedEnrollmentStatus) {
          await prisma.enrollment.updateMany({
            where: { course_id: id },
            data: { status: mappedEnrollmentStatus },
          });
        }
        return course;
      });

      // Refetch with includes
      updatedCourse = await this.prisma.course.findUnique({
        where: { id },
        include: {
          category: true,
          materials: true,
          enrollments: {
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
            },
          },
        },
      });
    } else {
      updatedCourse = await this.prisma.course.update({
        where: { id },
        data: updateData,
        include: {
          category: true,
          materials: true,
          enrollments: {
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
            },
          },
        },
      });
    }

    this.logger.log(`Updated course: ${updatedCourse.title}`);
    return updatedCourse;
  }

  async deleteCourse(id: number) {
    const course = await this.prisma.course.findUnique({
      where: { id },
      include: {
        enrollments: true,
        materials: true,
      },
    });
    if (!course) throw new NotFoundException(`Course with ID ${id} not found`);

    // 1. Clean up certificate files from disk
    for (const enrollment of course.enrollments) {
      if (enrollment.certificate_url) {
        try {
          const certPath = join(process.cwd(), '..', enrollment.certificate_url);
          if (fs.existsSync(certPath)) {
            fs.unlinkSync(certPath);
            this.logger.log(`Deleted certificate file: ${certPath}`);
          }
        } catch (e) {
          this.logger.warn(`Failed to delete certificate file for enrollment ${enrollment.id}: ${e}`);
        }
      }
    }

    // 2. Clean up material files from disk
    for (const material of course.materials) {
      if (material.type === MaterialType.PDF) {
        try {
          const matPath = join(process.cwd(), '..', material.file_path_or_link);
          if (fs.existsSync(matPath)) {
            fs.unlinkSync(matPath);
            this.logger.log(`Deleted material file: ${matPath}`);
          }
        } catch (e) {
          this.logger.warn(`Failed to delete material file ${material.id}: ${e}`);
        }
      }
    }

    // 3. Delete enrollments, materials, then the course in a transaction
    await this.prisma.$transaction([
      this.prisma.enrollment.deleteMany({ where: { course_id: id } }),
      this.prisma.courseMaterial.deleteMany({ where: { course_id: id } }),
      this.prisma.course.delete({ where: { id } }),
    ]);

    this.logger.log(`Deleted course: ${course.title} (with ${course.enrollments.length} enrollments, ${course.materials.length} materials)`);
    return { message: 'Course deleted successfully' };
  }

  // ========== MATERIAL OPERATIONS ==========

  async addMaterials(
    courseId: number,
    urls?: { type: string; file_path_or_link: string }[],
    files?: Express.Multer.File[],
  ) {
    const course = await this.prisma.course.findUnique({ where: { id: courseId } });
    if (!course)
      throw new NotFoundException(`Course with ID ${courseId} not found`);

    const materialsToCreate: any[] = [];

    if (urls && Array.isArray(urls)) {
      urls.forEach((u) => {
        if (u.file_path_or_link) {
          materialsToCreate.push({
            course_id: courseId,
            type: (u.type as any) || MaterialType.URL,
            file_path_or_link: u.file_path_or_link,
          });
        }
      });
    }

    if (files && Array.isArray(files)) {
      files.forEach((file) => {
        materialsToCreate.push({
          course_id: courseId,
          type: MaterialType.PDF,
          file_path_or_link: `/uploads/courses/${file.filename}`,
        });
      });
    }

    if (materialsToCreate.length === 0) {
      throw new BadRequestException('No materials provided');
    }

    await this.prisma.courseMaterial.createMany({ data: materialsToCreate });
    this.logger.log(`Added ${materialsToCreate.length} materials to course ${courseId}`);

    return { message: 'Materials added successfully', count: materialsToCreate.length };
  }

  async getCourseMaterials(courseId: number) {
    const course = await this.prisma.course.findUnique({ where: { id: courseId } });
    if (!course)
      throw new NotFoundException(`Course with ID ${courseId} not found`);
    return this.prisma.courseMaterial.findMany({
      where: { course_id: courseId },
      orderBy: { created_at: 'desc' },
    });
  }

  // ✅ สำหรับ Admin — เข้าถึง material ได้โดยไม่ต้อง check enrollment
  async getMaterialById(materialId: number) {
    const material = await this.prisma.courseMaterial.findUnique({
      where: { id: materialId },
    });
    if (!material) {
      throw new NotFoundException(`Material with ID ${materialId} not found`);
    }
    return material;
  }

  // สำหรับ Employee — ต้อง enroll course ที่มี material นี้
  async getMaterialForEmployee(materialId: number, employeeId: number) {
    const material = await this.prisma.courseMaterial.findUnique({
      where: { id: materialId },
      include: {
        course: {
          include: {
            enrollments: { where: { employee_id: employeeId } },
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

  // ✅ ลบ material — ถ้าเป็น PDF ลบไฟล์จาก disk ด้วย
  async deleteMaterial(courseId: number, materialId: number) {
    const course = await this.prisma.course.findUnique({ where: { id: courseId } });
    if (!course)
      throw new NotFoundException(`Course with ID ${courseId} not found`);

    const material = await this.prisma.courseMaterial.findFirst({
      where: { id: materialId, course_id: courseId },
    });
    if (!material) {
      throw new NotFoundException(
        `Material with ID ${materialId} not found in course ${courseId}`,
      );
    }

    if (material.type === MaterialType.PDF) {
      const filePath = join(process.cwd(), '..', material.file_path_or_link);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        this.logger.log(`Deleted file from disk: ${filePath}`);
      }
    }

    await this.prisma.courseMaterial.delete({ where: { id: materialId } });
    this.logger.log(`Deleted material ${materialId} from course ${courseId}`);

    return { message: 'Material deleted successfully' };
  }

  // ========== HELPER ==========

  private validateLocationLogic(
    format: TrainingFormat,
    location_type: LocationType | null,
    location: string | null,
    country: string | null,
  ): void {
    if (format === TrainingFormat.ONLINE) {
      if (!location)
        throw new BadRequestException(
          'Meeting link (location) is required for ONLINE training',
        );
    } else if (format === TrainingFormat.ONSITE) {
      if (!location_type)
        throw new BadRequestException(
          'Location type is required for ONSITE training',
        );
      if (location_type === LocationType.DOMESTIC && !location) {
        throw new BadRequestException(
          'Venue name (location) is required for ONSITE DOMESTIC training',
        );
      }
      if (location_type === LocationType.INTERNATIONAL && !country) {
        throw new BadRequestException(
          'Country name is required for ONSITE INTERNATIONAL training',
        );
      }
    }
  }
}