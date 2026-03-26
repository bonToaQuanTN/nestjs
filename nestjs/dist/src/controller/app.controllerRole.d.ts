import { AppService } from '../service/app.service';
import { createRoleDto } from "../dto/user.dto";
export declare class RoleController {
    private readonly roleService;
    constructor(roleService: AppService);
    getRoles(): Promise<{}>;
    createRole(dto: createRoleDto): Promise<import("../model/app.modelRoles").Role | undefined>;
    deleteRole(id: string): Promise<{
        message: string;
    }>;
    updateRole(id: string, dto: createRoleDto): Promise<{
        message: string;
        data: import("../model/app.modelRoles").Role;
    }>;
}
