import {CanActivate, ExecutionContext, Injectable, ForbiddenException,} from '@nestjs/common';
import { Reflector  } from "@nestjs/core";


@Injectable()
export class PermissionGuard implements CanActivate{
    constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.get<string[]>(
      'permissions',
      context.getHandler(),
    );

    if (!requiredPermissions) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (user?.role === 'admin') {
      return true;
    }

    const userPermissions = user.permissions || [];
    const hasPermission = requiredPermissions.some((required) => {

      // ví dụ required = GET.USER
      const [action, resource] = required.split('.');

      return (
        userPermissions.includes(required) ||        // exact permission
        userPermissions.includes(`${resource}.*`)    // wildcard permission
      );
    });

    if (!hasPermission) {
      throw new ForbiddenException('Permission denied');
    }

    return true;
  }
}