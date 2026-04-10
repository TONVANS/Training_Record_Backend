// src/auth/auth.controller.ts
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { ChangeRoleDto } from './dto/change-role';

/**
 * AuthController handles authentication endpoints
 */
@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) { }

  /**
   * Register a new employee account
   */
  @Post('register')
  @ApiOperation({
    summary: 'Register a new employee account',
    description: 'Create a new employee with employee_code for login',
  })
  @ApiResponse({
    status: 201,
    description: 'Employee successfully registered',
  })
  @ApiResponse({
    status: 409,
    description: 'Employee code or email already exists',
  })
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  /**
   * Login with employee_code and password
   */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Login with employee code and password',
    description: 'Use employee_code (รหัสพนักงาน) instead of email for login',
  })
  @ApiResponse({
    status: 200,
    description: 'Login successful',
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid credentials',
  })
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  /**
   * Reset password (Admin or authorized user)
   * Note: For now open, but should be protected by Admin Role in production
   */
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Reset password for an employee',
    description: 'Reset password using employee_code. (Admin function)',
  })
  @ApiResponse({ status: 200, description: 'Password reset successful' })
  @ApiResponse({ status: 404, description: 'Employee not found' })
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return this.authService.resetPassword(resetPasswordDto.employee_code);
  }

  /**
   * Reset password for ALL employees (Admin Only)
   */
  @UseGuards(JwtAuthGuard, RolesGuard) // ຕ້ອງ Login ແລະ ກວດສອບສິດ
  @Roles(Role.ADMIN)                   // ຕ້ອງເປັນ ADMIN ເທົ່ານັ້ນ
  @ApiBearerAuth()
  @Post('reset-password-all')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Reset password for ALL employees (Admin only)',
    description: 'Reset password for everyone to default password "EDL@123456".',
  })
  @ApiResponse({ status: 200, description: 'All passwords reset successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admins only' })
  async resetPasswordAll() {
    return this.authService.resetPasswordAll();
  }

  /**
   * Change password (Logged in user)
   */
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Change password for logged in user',
    description: 'Change password using old password validation',
  })
  @ApiResponse({ status: 200, description: 'Password changed successful' })
  @ApiResponse({ status: 401, description: 'Invalid old password' })
  async changePassword(
    @Request() req,
    @Body() changePasswordDto: ChangePasswordDto,
  ) {
    return this.authService.changePassword(
      req.user.id,
      changePasswordDto.old_password,
      changePasswordDto.new_password,
    );
  }

  /**
     * Change role for an employee (Admin Only)
     */
  @UseGuards(JwtAuthGuard, RolesGuard) // ຕ້ອງ Login ແລະ ກວດສອບສິດ
  @Roles(Role.ADMIN)                   // ຕ້ອງເປັນ ADMIN ເທົ່ານັ້ນ
  @ApiBearerAuth()
  @Post('change-role')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Change employee role (Admin only)',
    description: 'Change the role (ADMIN or EMPLOYEE) using employee_code.',
  })
  @ApiResponse({ status: 200, description: 'Role changed successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admins only' })
  @ApiResponse({ status: 404, description: 'Employee not found' })
  async changeRole(@Body() changeRoleDto: ChangeRoleDto) {
    return this.authService.changeRole(
      changeRoleDto.employee_code,
      changeRoleDto.new_role,
    );
  }
}
