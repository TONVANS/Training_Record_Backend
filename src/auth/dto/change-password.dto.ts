// src/auth/dto/change-password.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @ApiProperty({
    description: 'ລະຫັດຜ່ານເກົ່າ (Old Password)',
    example: 'OldPass123!',
  })
  @IsString()
  @IsNotEmpty({ message: 'ກະລຸນາປ້ອນລະຫັດຜ່ານເກົ່າ' })
  old_password: string;

  @ApiProperty({
    description: 'ລະຫັດຜ່ານໃໝ່ (New Password)',
    example: 'NewSecurePass123!',
    minLength: 6,
  })
  @IsString()
  @IsNotEmpty({ message: 'ກະລຸນາປ້ອນລະຫັດຜ່ານໃໝ່' })
  @MinLength(6, { message: 'ລະຫັດຜ່ານຕ້ອງມີຢ່າງໜ້ອຍ 6 ຕົວອັກສອນ' })
  new_password: string;
}
