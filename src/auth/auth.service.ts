// src/auth/auth.service.ts
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import * as bcrypt from 'bcrypt';
import { JwtPayload } from '../common/interfaces/jwt-payload.interface';
import { Role } from '@prisma/client';

/**
 * AuthService handles user authentication and registration
 */
@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly SALT_ROUNDS = 10;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * Register a new employee account
   *
   * @param registerDto - Registration data
   * @returns Created employee object and access token
   */
  async register(registerDto: RegisterDto) {
    const {
      employee_code,
      email,
      password,
      first_name_la,
      last_name_la,
      position_id,
      department_id,
      gender,
      role,
    } = registerDto;

    // Check if employee_code already exists
    const existingByCode = await this.prisma.employee.findUnique({
      where: { employee_code },
    });

    if (existingByCode) {
      throw new ConflictException('Employee code already exists');
    }

    // Check if email already exists
    const existingByEmail = await this.prisma.employee.findUnique({
      where: { email },
    });

    if (existingByEmail) {
      throw new ConflictException('Email already exists');
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, this.SALT_ROUNDS);

    // Create the employee
    const employee = await this.prisma.employee.create({
      data: {
        employee_code,
        email,
        password: hashedPassword,
        first_name_la,
        last_name_la,
        position_id,
        department_id,
        gender,
        role: role || Role.EMPLOYEE,
      },
      select: {
        id: true,
        employee_code: true,
        email: true,
        first_name_la: true,
        last_name_la: true,
        gender: true,
        role: true,
        created_at: true,
      },
    });

    // Generate access token
    const accessToken = this.generateToken(
      employee.id,
      employee.employee_code,
      employee.role,
    );

    this.logger.log(`New employee registered: ${employee.employee_code}`);

    return {
      employee,
      accessToken,
    };
  }

  /**
   * Login with employee_code and password
   *
   * @param loginDto - Login credentials
   * @returns Employee object and access token
   */
  async login(loginDto: LoginDto) {
    const { employee_code, password } = loginDto;

    // Find the employee by employee_code
    const employee = await this.prisma.employee.findUnique({
      where: { employee_code },
    });

    if (!employee) {
      throw new UnauthorizedException('ລະຫັດພະນັກງານ ຫຼື ລະຫັດຜ່ານບໍ່ຖືກຕ້ອງ');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, employee.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('ລະຫັດພະນັກງານ ຫຼື ລະຫັດຜ່ານບໍ່ຖືກຕ້ອງ');
    }

    // Generate access token
    const accessToken = this.generateToken(
      employee.id,
      employee.employee_code,
      employee.role,
    );

    this.logger.log(`Employee logged in: ${employee.employee_code}`);

    return {
      employee: {
        id: employee.id,
        employee_code: employee.employee_code,
        email: employee.email,
        first_name_la: employee.first_name_la,
        last_name_la: employee.last_name_la,
        gender: employee.gender,
        role: employee.role,
      },
      accessToken,
    };
  }

  /**
   * Generate JWT access token
   *
   * @param employeeId - Employee ID
   * @param employeeCode - Employee code
   * @param role - Employee role
   * @returns JWT access token
   */
  private generateToken(
    employeeId: number,
    employeeCode: string,
    role: Role,
  ): string {
    const payload: JwtPayload = {
      sub: employeeId,
      email: employeeCode, // Using 'email' field for employee_code to maintain JWT structure
      role,
    };

    return this.jwtService.sign(payload);
  }

  /**
   * Validate a user by ID (used by JWT strategy)
   *
   * @param employeeId - Employee ID from JWT payload
   * @returns Employee object without password
   */
  async validateUser(employeeId: number) {
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      select: {
        id: true,
        email: true,
        first_name_la: true,
        last_name_la: true,
        gender: true,
        role: true,
      },
    });

    if (!employee) {
      throw new UnauthorizedException('User not found');
    }

    return employee;
  }

  /**
   * Reset Password by Employee Code (Admin function)
   *
   * @param employeeCode - Employee code
   * @returns Success message
   */
  async resetPassword(employeeCode: string) {
    // Find employee
    const employee = await this.prisma.employee.findUnique({
      where: { employee_code: employeeCode },
    });

    if (!employee) {
      throw new UnauthorizedException('ບໍ່ພົບພະນັກງານ');
    }

    // Default password from schema: EDL@123456
    const defaultPassword = 'EDL@123456';
    const hashedPassword = await bcrypt.hash(defaultPassword, this.SALT_ROUNDS);

    // Update password
    await this.prisma.employee.update({
      where: { id: employee.id },
      data: { password: hashedPassword },
    });

    this.logger.log(`Password reset for employee: ${employeeCode} to default`);
    return { message: 'Reset password successful to default' };
  }

  /**
   * Reset Password for ALL Employees (Admin function)
   *
   * @returns Success message with affected rows count
   */
  async resetPasswordAll() {
    // 1. กำหนดລະຫັດຜ່ານ Default
    const defaultPassword = 'EDL@123456';
    
    // 2. Hash ລະຫັດຜ່ານ (Hash ບາດດຽວ ແລ້ວເອົາໄປໃຊ້ກັບທຸກຄົນເລີຍ ເພື່ອຄວາມໄວ)
    const hashedPassword = await bcrypt.hash(defaultPassword, this.SALT_ROUNDS);

    // 3. ອັບເດດລະຫັດຜ່ານຂອງທຸກຄົນໃນ Database
    const result = await this.prisma.employee.updateMany({
      data: { password: hashedPassword },
    });

    this.logger.log(`Password reset for ALL employees (${result.count} records) to default`);
    
    return { 
      message: 'ຣີເຊັດລະຫັດຜ່ານຂອງພະນັກງານທຸກຄົນສຳເລັດແລ້ວ',
      affected_rows: result.count 
    };
  }

  /**
   * Change Password (User self-service)
   *
   * @param employeeId - Current logged in user ID
   * @param oldPassword - Current password
   * @param newPassword - New password
   * @returns Success message
   */
  async changePassword(
    employeeId: number, // รับจาก JWT Guard ใน Controller (@Request() req)
    oldPassword: string,
    newPassword: string,
  ) {
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
    });

    if (!employee) {
      throw new UnauthorizedException('User not found');
    }

    const isPasswordValid = await bcrypt.compare(
      oldPassword,
      employee.password,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException('ລະຫັດຜ່ານເກົ່າບໍ່ຖືກຕ້ອງ');
    }

    const hashedPassword = await bcrypt.hash(newPassword, this.SALT_ROUNDS);

    await this.prisma.employee.update({
      where: { id: employeeId },
      data: { password: hashedPassword },
    });

    this.logger.log(`Password changed for employee ID: ${employeeId}`);
    return { message: 'Change password successful' };
  }

  /**
   * Change Role by Employee Code (Admin function)
   *
   * @param employeeCode - Employee code
   * @param newRole - New role
   * @returns Success message
   */
  async changeRole(employeeCode: string, newRole: Role) {
    // 1. ຄົ້ນຫາພະນັກງານຈາກລະຫັດ
    const employee = await this.prisma.employee.findUnique({
      where: { employee_code: employeeCode },
    });

    if (!employee) {
      throw new UnauthorizedException('ບໍ່ພົບພະນັກງານ'); // ຫຼືໃຊ້ NotFoundException ກໍໄດ້
    }

    // 2. ອັບເດດບົດບາດ (Role)
    await this.prisma.employee.update({
      where: { id: employee.id },
      data: { role: newRole },
    });

    this.logger.log(`Role changed for employee: ${employeeCode} to ${newRole}`);
    
    return { 
      message: 'ປ່ຽນສິດການເຂົ້າເຖິງສຳເລັດແລ້ວ', 
      employee_code: employeeCode, 
      new_role: newRole 
    };
  }
}
