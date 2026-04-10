import { SetMetadata } from '@nestjs/common';
import { Role } from '@prisma/client';
import { ROLES_KEY } from '../guards/roles.guard';

/**
 * Roles Decorator
 *
 * Use this decorator to specify which roles are allowed to access a route.
 * Must be used in conjunction with RolesGuard.
 *
 * @param roles - Array of allowed roles
 *
 * Example:
 * @Roles(Role.ADMIN)
 * @UseGuards(JwtAuthGuard, RolesGuard)
 * async adminOnlyRoute() { ... }
 */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
