import { IsNotEmpty, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Data Transfer Object for user login
 */
export class LoginDto {
  @ApiProperty({
    description: 'ລະຫັດພະນັກງານ (Employee Code)',
    example: 'EMP001',
  })
  @IsString()
  @IsNotEmpty({ message: 'ລະຫັດພະນັກງານບໍ່ຖືກຕ້ອງ' })
  employee_code: string;

  @ApiProperty({
    description: 'ລະຫັດຜ່ານ (Password)',
    example: 'SecurePass123!',
    minLength: 6,
  })
  @IsString()
  @IsNotEmpty({ message: 'ລະຫັດຜ່ານບໍ່ຖືກຕ້ອງ' })
  @MinLength(6, { message: 'ລະຫັດຜ່ານຕ້ອງມີຢ່າງໜ້ອຍ 6 ຕົວອັກສອນ' })
  password: string;
}
