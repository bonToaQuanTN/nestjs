export declare class CreateUserDto {
    name: string;
    email: string;
    password: string;
    designation: string;
    roleId?: number;
}
export declare class LoginDto {
    email: string;
    password: string;
}
export declare class createRoleDto {
    name: string;
    RoleId: string;
}
export declare class PermissionDto {
    name: string;
    roleId: string;
}
export declare const multerConfig: {
    storage: import("multer").StorageEngine;
};
