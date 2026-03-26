import { Model } from 'sequelize-typescript';
import { Role } from './app.modelRoles';
export declare class Permission extends Model {
    id: number;
    name: string;
    roleId: number;
    Role: Role;
}
