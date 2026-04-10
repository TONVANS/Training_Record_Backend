import { Role } from '@prisma/client';

/**
 * Interface for JWT token payload
 */
export interface JwtPayload {
  sub: number; // Employee ID
  email: string; // Employee email
  role: Role; // Employee role (ADMIN or EMPLOYEE)
  iat?: number; // Issued at
  exp?: number; // Expiration time
}
