import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '../entities/user.entity';
import { JwtPayload } from './auth.service';
import { ROLES_KEY } from './roles.decorator';

/**
 * Runs after JwtAuthGuard: routes carrying @Roles(...) require a matching
 * role. Unannotated routes are open to any authenticated account.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<UserRole[] | undefined>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) {
      return true;
    }

    const payload = context.switchToHttp().getRequest().user as JwtPayload | undefined;
    if (!payload) {
      throw new UnauthorizedException('Missing bearer token');
    }

    const role = payload.role as UserRole;
    if (role === 'admin' || required.includes(role)) {
      return true;
    }

    throw new ForbiddenException(`This action requires the role: ${required.join(' or ')}`);
  }
}
