import { Users } from "../model/app.model";
import { Role } from "../model/app.modelRoles";
import { createRoleDto, CreateUserDto, LoginDto, PermissionDto } from "../dto/user.dto";
import { JwtService } from '@nestjs/jwt';
import { Permission } from '../model/app.permissions';
import type { Cache } from 'cache-manager';
export declare class AppService {
    private userModel;
    private roleModel;
    private permissionModel;
    private cacheManager;
    private readonly jwtService;
    private readonly logger;
    constructor(userModel: typeof Users, roleModel: typeof Role, permissionModel: typeof Permission, cacheManager: Cache, jwtService: JwtService);
    generateUserId(): Promise<string>;
    createUser(data: CreateUserDto): Promise<Users>;
    getUser(page?: number, limit?: number): Promise<{}>;
    getByUserId(id: string): Promise<{}>;
    updateUser(id: string, data: CreateUserDto, currentUser: any): Promise<{
        message: string;
    }>;
    deleteUser(id: string): Promise<{
        message: string;
    }>;
    searchUserByName(name: string): Promise<Users[]>;
    login(loginDto: LoginDto): Promise<{
        message: string;
        access_token: string;
    }>;
    getRoles(): Promise<{}>;
    createRole(name: string, RoleId?: string): Promise<Role | undefined>;
    deleteRole(id: string): Promise<{
        message: string;
    }>;
    updateRole(id: string, dto: createRoleDto): Promise<{
        message: string;
        data: Role;
    }>;
    getAllPermissions(): Promise<Record<string, string[]>>;
    getPermissionById(id: number): Promise<any>;
    createPermission(name: string, roleId: string): Promise<Permission>;
    updatePermission(id: number, dto: PermissionDto): Promise<{
        message: string;
        data: Permission;
    }>;
    deletePermission(id: number): Promise<{
        message: string;
    }>;
    private handleError;
}
