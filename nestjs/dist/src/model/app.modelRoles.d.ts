import { Model } from "sequelize-typescript";
import { Permission } from "./app.permissions";
export declare class Role extends Model {
    id: string;
    name: string;
    RoleId: string;
    permissions: Permission[];
}
