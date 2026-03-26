import { Model } from "sequelize-typescript";
import { Role } from "./app.modelRoles";
export declare class Users extends Model {
    id: string;
    name: string;
    email: string;
    password: string;
    designation: string;
    roleId: string;
    role: Role;
}
