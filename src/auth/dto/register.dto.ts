import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsString,
  MinLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Gender, Role } from '@prisma/client';

/**
 * Data Transfer Object for user registration
 */
export class RegisterDto {
  @ApiProperty({
    description: 'รหัสพนักงาน (Employee Code) - ใช้สำหรับ Login',
    example: 'EMP001',
  })
  @IsString()
  @IsNotEmpty({ message: 'Employee code is required' })
  employee_code: string;

  @ApiProperty({
    description: 'Employee first name (Lao)',
    example: 'ຈອນ',
  })
  @IsString()
  @IsNotEmpty({ message: 'First name is required' })
  first_name_la: string;

  @ApiProperty({
    description: 'Employee last name (Lao)',
    example: 'ໂດ',
  })
  @IsString()
  @IsNotEmpty({ message: 'Last name is required' })
  last_name_la: string;

  @ApiProperty({
    description: 'Employee email address',
    example: 'john.doe@company.com',
  })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @IsNotEmpty({ message: 'Email is required' })
  email: string;

  @ApiProperty({
    description: 'Account password',
    example: 'SecurePass123!',
    minLength: 6,
  })
  @IsString()
  @IsNotEmpty({ message: 'Password is required' })
  @MinLength(6, { message: 'Password must be at least 6 characters long' })
  password: string;

  @ApiProperty({
    description: 'Position ID',
    example: 1,
  })
  @IsNotEmpty({ message: 'Position ID is required' })
  position_id?: number;

  @ApiProperty({
    description: 'Department ID',
    example: 1,
  })
  @IsNotEmpty({ message: 'Department ID is required' })
  department_id?: number;

  @ApiProperty({
    description: 'Gender',
    enum: Gender,
    example: Gender.MALE,
  })
  @IsEnum(Gender, { message: 'Gender must be either MALE or FEMALE' })
  @IsNotEmpty({ message: 'Gender is required' })
  gender: Gender;

  @ApiProperty({
    description: 'User role',
    enum: Role,
    example: Role.EMPLOYEE,
    default: Role.EMPLOYEE,
  })
  @IsEnum(Role, { message: 'Role must be either ADMIN or EMPLOYEE' })
  role?: Role;
}
