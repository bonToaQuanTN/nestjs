import { AppService } from '../service/app.service';
import { PermissionDto } from "../dto/user.dto";
export declare class permissionController {
    private readonly permissionService;
    constructor(permissionService: AppService);
    getAll(): Promise<Record<string, string[]>>;
    getById(id: number): Promise<any>;
    create(dto: PermissionDto): Promise<import("../model/app.permissions").Permission>;
    updatePermission(id: number, dto: PermissionDto): Promise<{
        message: string;
        data: import("../model/app.permissions").Permission;
    }>;
    deletePermission(id: number): Promise<{
        message: string;
    }>;
}
