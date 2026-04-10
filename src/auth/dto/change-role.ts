// src/auth/dto/change-role.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsEnum } from 'class-validator';
import { Role } from '@prisma/client';

export class ChangeRoleDto {
  @ApiProperty({
    description: 'ລະຫັດພະນັກງານ (Employee Code)',
    example: 'E001',
  })
  @IsString()
  @IsNotEmpty({ message: 'ກະລຸນາປ້ອນລະຫັດພະນັກງານ' })
  employee_code: string;

  @ApiProperty({
    description: 'ບົດບາດໃໝ່ (New Role)',
    enum: Role,
    example: Role.ADMIN,
  })
  @IsEnum(Role, { message: 'ບົດບາດບໍ່ຖືກຕ້ອງ' })
  new_role: Role;
}