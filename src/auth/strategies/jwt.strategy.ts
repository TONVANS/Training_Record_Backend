/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtPayload } from '../../common/interfaces/jwt-payload.interface';

/**
 * JWT Strategy for validating JWT tokens and extracting user information.
 * This strategy is used by the JwtAuthGuard to protect routes.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET'),
    });
  }

  /**
   * Validate the JWT payload and return the user object.
   * This method is called automatically by Passport after the token is verified.
   *
   * @param payload - The decoded JWT payload
   * @returns The employee object if valid, throws UnauthorizedException otherwise
   */
  async validate(payload: JwtPayload) {
    const { sub: employeeId } = payload;

    // Fetch the employee from the database
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      select: {
        id: true,
        employee_code: true,
        email: true,
        first_name_la: true,
        last_name_la: true,
        role: true,
        gender: true,
      },
    });

    if (!employee) {
      throw new UnauthorizedException('User not found or token is invalid');
    }

    // Return the employee object - this will be attached to request.user
    return employee;
  }
}
