// src/courses/courses.controller.ts
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
  UseGuards,
  UseInterceptors,
  UploadedFiles,
  BadRequestException,
  NotFoundException,
  Res,
  StreamableFile,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join, basename } from 'path';
import * as fs from 'fs';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
} from '@nestjs/swagger';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { AddMaterialsDto } from './dto/create-material.dto';
import { CourseFilterDto } from './dto/course-filter.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { CreateCategoryDto } from 'src/categories/dto/create-category.dto';
import { CoursesService, PaginatedCoursesResult } from './courses.service';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';

@ApiTags('Training Management')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('training')
export class CoursesController {
  constructor(private readonly trainingService: CoursesService) {}

  // ========== CATEGORY ENDPOINTS ==========

  @Post('categories')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Create a new training category (Admin only)' })
  async createCategory(@Body() createCategoryDto: CreateCategoryDto) {
    return this.trainingService.createCategory(createCategoryDto);
  }

  @Get('categories')
  @ApiOperation({ summary: 'Get all training categories' })
  async getCategories() {
    return this.trainingService.getCategories();
  }

  // ========== COURSE ENDPOINTS ==========

  @Post('courses')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Create a new course (Admin only)' })
  @UseInterceptors(
    FilesInterceptor('documents', 10, {
      storage: diskStorage({
        destination: (req, file, cb) => {
          const uploadPath = join(process.cwd(), '..', 'uploads', 'courses');
          if (!fs.existsSync(uploadPath))
            fs.mkdirSync(uploadPath, { recursive: true });
          cb(null, uploadPath);
        },
        filename: (req, file, cb) => {
          const uniqueSuffix =
            Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, `${uniqueSuffix}${extname(file.originalname)}`);
        },
      }),
    }),
  )
  async createCourse(
    @Body() createCourseDto: CreateCourseDto,
    @UploadedFiles() documents?: Express.Multer.File[],
  ) {
    return this.trainingService.createCourse(createCourseDto, documents);
  }

  @Get('courses')
  @ApiOperation({ summary: 'Get all courses with optional filters' })
  async getCourses(
    @Query() filters: CourseFilterDto,
  ): Promise<PaginatedCoursesResult> {
    return this.trainingService.getCourses(filters);
  }

  // ✅ FIX: specific static routes MUST come BEFORE parameterized routes
  // เดิม GET courses/materials/:materialId/file จะถูก :id ดักก่อน
  // แก้โดยใช้ path /materials/:materialId/download ที่ระดับ /training
  @Get('materials/:materialId/download')
  @ApiOperation({ summary: 'Stream/download a material file (enrolled employees or Admin)' })
  @ApiResponse({ status: 200, description: 'File streamed successfully' })
  @ApiResponse({ status: 403, description: 'No permission' })
  @ApiResponse({ status: 404, description: 'File not found' })
  async streamMaterial(
    @Param('materialId', ParseIntPipe) materialId: number,
    @CurrentUser() user: any,
    @Res({ passthrough: true }) res: import('express').Response,
  ): Promise<StreamableFile> {
    const employeeId = user.sub || user.id;
    const userRole: Role = user.role;

    // Admin เข้าถึงได้ทุก material โดยไม่ต้อง check enrollment
    const material =
      userRole === Role.ADMIN
        ? await this.trainingService.getMaterialById(materialId)
        : await this.trainingService.getMaterialForEmployee(materialId, employeeId);

    const filePath = join(process.cwd(), '..', material.file_path_or_link);

    if (!fs.existsSync(filePath)) {
      throw new NotFoundException('Material file not found on disk');
    }

    // หา extension จาก filename เพื่อกำหนด Content-Type ที่ถูกต้อง
    const ext = extname(filePath).toLowerCase();
    const contentTypeMap: Record<string, string> = {
      '.pdf': 'application/pdf',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.ppt': 'application/vnd.ms-powerpoint',
      '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
    };
    const contentType = contentTypeMap[ext] ?? 'application/octet-stream';

    res.set({
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${basename(filePath)}"`,
    });

    return new StreamableFile(fs.createReadStream(filePath));
  }

  @Get('courses/:id')
  @ApiOperation({ summary: 'Get a single course by ID' })
  @ApiResponse({ status: 200, description: 'Course retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Course not found' })
  async getCourse(@Param('id', ParseIntPipe) id: number) {
    return this.trainingService.getCourse(id);
  }

  @Put('courses/:id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Update a course (Admin only)' })
  async updateCourse(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateCourseDto: UpdateCourseDto,
  ) {
    return this.trainingService.updateCourse(id, updateCourseDto);
  }

  @Delete('courses/:id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Delete a course (Admin only)' })
  async deleteCourse(@Param('id', ParseIntPipe) id: number) {
    return this.trainingService.deleteCourse(id);
  }

  // ========== MATERIAL ENDPOINTS ==========

  @Post('courses/:id/materials')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Add materials to a course (Admin only)' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FilesInterceptor('files', 10, {
      storage: diskStorage({
        destination: (req, file, cb) => {
          const uploadPath = join(process.cwd(), '..', 'uploads', 'courses');
          if (!fs.existsSync(uploadPath))
            fs.mkdirSync(uploadPath, { recursive: true });
          cb(null, uploadPath);
        },
        filename: (req, file, cb) => {
          const uniqueSuffix =
            Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, `${uniqueSuffix}${extname(file.originalname)}`);
        },
      }),
    }),
  )
  async addMaterials(
    @Param('id', ParseIntPipe) id: number,
    @Body() addMaterialsDto: AddMaterialsDto,
    @UploadedFiles() files?: Express.Multer.File[],
  ) {
    let urls: any[] = [];
    if (addMaterialsDto.urls_json) {
      try {
        urls = JSON.parse(addMaterialsDto.urls_json);
      } catch (e) {
        throw new BadRequestException('Invalid urls_json format');
      }
    }
    return this.trainingService.addMaterials(id, urls, files);
  }

  @Get('courses/:id/materials')
  @ApiOperation({ summary: 'Get all materials for a course' })
  async getCourseMaterials(@Param('id', ParseIntPipe) id: number) {
    return this.trainingService.getCourseMaterials(id);
  }

  // ✅ DELETE material endpoint
  @Delete('courses/:courseId/materials/:materialId')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Delete a material from a course (Admin only)' })
  @ApiResponse({ status: 200, description: 'Material deleted successfully' })
  @ApiResponse({ status: 404, description: 'Material not found' })
  async deleteMaterial(
    @Param('courseId', ParseIntPipe) courseId: number,
    @Param('materialId', ParseIntPipe) materialId: number,
  ) {
    return this.trainingService.deleteMaterial(courseId, materialId);
  }
}