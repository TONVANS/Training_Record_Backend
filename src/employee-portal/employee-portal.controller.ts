/* eslint-disable @typescript-eslint/no-unsafe-member-access */
// src/employee-portal/employee-portal.controller.ts
import {
  Controller,
  Get,
  Post,
  Param,
  ParseIntPipe,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  StreamableFile,
  NotFoundException,
  Res,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join, basename } from 'path';
import * as fs from 'fs';
import { EmployeePortalService } from './employee-portal.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('employee-portal')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.EMPLOYEE, Role.ADMIN)
export class EmployeePortalController {
  constructor(private readonly portalService: EmployeePortalService) { }

  @Get('courses')
  getAvailableCourses(@CurrentUser() user: any) {
    return this.portalService.getAvailableCourses(user.sub || user.id);
  }

  @Get('enrollments')
  getMyEnrollments(@CurrentUser() user: any) {
    return this.portalService.getMyEnrollments(user.sub || user.id);
  }

  @Get('profile')
  getMyProfile(@CurrentUser() user: any) {
    return this.portalService.getMyProfile(user.sub || user.id);
  }

  // ✅ GET: ດຶງ certificates ທັງໝົດຂອງຕົນເອງ
  @Get('certificates')
  getMyCertificates(@CurrentUser() user: any) {
    return this.portalService.getMyCertificates(user.sub || user.id);
  }

  // ✅ GET: ດຶງ certificate ຂອງ enrollment ໜຶ່ງ
  @Get('enrollments/:id/certificate')
  getCertificate(
    @Param('id', ParseIntPipe) enrollmentId: number,
    @CurrentUser() user: any,
  ) {
    return this.portalService.getCertificate(enrollmentId, user.sub || user.id);
  }

  // POST: Upload certificate (ເກົ່າ — ຍັງຄົງໄວ້)
  @Post('enrollments/:id/certificate')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (req, file, cb) => {
          // ✅ ใช้ absolute path เหมือนกับที่ useStaticAssets ชี้ไป
          const uploadPath = join(process.cwd(), '..', 'uploads', 'certificates');
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
  uploadCertificate(
    @Param('id', ParseIntPipe) enrollmentId: number,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: any,
  ) {
    if (!file) throw new BadRequestException('No file uploaded');
    const fileUrl = `/uploads/certificates/${file.filename}`;
    return this.portalService.uploadCertificate(
      enrollmentId,
      user.sub || user.id,
      fileUrl,
    );
  }

  @Get('enrollments/:id/certificate/file')
  async streamCertificate(
    @Param('id', ParseIntPipe) enrollmentId: number,
    @CurrentUser() user: any,
    @Res({ passthrough: true }) res: import('express').Response, // ✅ แก้ error ที่ 3
  ): Promise<StreamableFile> {
    const enrollment = await this.portalService.getCertificate(
      enrollmentId,
      user.sub || user.id,
    );

    // ✅ แก้ error ที่ 1 และ 2 — guard ก่อนใช้
    if (!enrollment.certificate_url) {
      throw new NotFoundException('No certificate for this enrollment');
    }

    const filePath = join(process.cwd(), '..', enrollment.certificate_url);

    if (!fs.existsSync(filePath)) {
      throw new NotFoundException('Certificate file not found on disk');
    }

    const isPdf = enrollment.certificate_url.endsWith('.pdf'); // ✅ ปลอดภัยแล้ว

    res.set({
      'Content-Type': isPdf ? 'application/pdf' : 'image/jpeg',
      'Content-Disposition': `attachment; filename="${basename(filePath)}"`,
    });

    return new StreamableFile(fs.createReadStream(filePath));
  }


  @Get('courses/materials/:materialId/file')
  async streamMaterial(
    @Param('materialId', ParseIntPipe) materialId: number,
    @CurrentUser() user: any,
    @Res({ passthrough: true }) res: import('express').Response,
  ): Promise<StreamableFile> {
    const material = await this.portalService.getMaterialForEmployee(
      materialId,
      user.sub || user.id,
    );

    // ✅ material.file_path_or_link = "/uploads/courses/xxx.pdf"
    const filePath = join(process.cwd(), '..', material.file_path_or_link);

    if (!fs.existsSync(filePath)) {
      throw new NotFoundException('Material file not found on disk');
    }

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${basename(filePath)}"`,
    });

    return new StreamableFile(fs.createReadStream(filePath));
  }
}
