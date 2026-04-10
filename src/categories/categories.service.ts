// categories.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  create(createCategoryDto: CreateCategoryDto) {
    return this.prisma.trainingCategory.create({
      data: createCategoryDto,
    });
  }

  findAll() {
    return this.prisma.trainingCategory.findMany();
  }

  findOne(id: number) {
    return this.prisma.trainingCategory.findUnique({
      where: { id },
    });
  }

  async update(id: number, updateCategoryDto: UpdateCategoryDto) {
    // ตรวจสอบก่อนว่ามี category นี้อยู่จริงไหม
    const category = await this.prisma.trainingCategory.findUnique({
      where: { id },
    });

    if (!category) {
      throw new NotFoundException(`Category #${id} not found`);
    }

    return this.prisma.trainingCategory.update({
      where: { id },
      data: updateCategoryDto,
    });
  }

  async remove(id: number) {
    const category = await this.prisma.trainingCategory.findUnique({
      where: { id },
    });

    if (!category) {
      throw new NotFoundException(`Category #${id} not found`);
    }

    return this.prisma.trainingCategory.delete({
      where: { id },
    });
  }
}
