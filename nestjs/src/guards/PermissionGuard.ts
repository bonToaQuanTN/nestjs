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

    const userPermissions = user.permissions || [];

    const hasPermission = requiredPermissions.some(p =>
      userPermissions.includes(p),
    );

    if (!hasPermission) {
      throw new ForbiddenException('Permission denied');
    }

    return true;
  }
}