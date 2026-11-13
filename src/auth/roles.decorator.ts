import { SetMetadata } from '@nestjs/common';
import { UserRole } from '../entities/user.entity';

export const ROLES_KEY = 'roles';

/** Restricts a route to the listed roles. `admin` always passes. */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
