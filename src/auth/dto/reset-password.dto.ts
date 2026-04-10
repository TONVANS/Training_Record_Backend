import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class ResetPasswordDto {
  @ApiProperty({
    description: 'ລະຫັດພະນັກງານ (Employee Code)',
    example: 'EMP001',
  })
  @IsString()
  @IsNotEmpty({ message: 'ກະລຸນາປ້ອນລະຫັດພະນັກງານ' })
  employee_code: string;
}

