import {Table, Column, Model, DataType, AllowNull, PrimaryKey, HasMany} from "sequelize-typescript";
import {Permission} from "./app.permissions"

@Table({
    tableName: 'Roles'
})
export class Role extends Model {
    @PrimaryKey
    @Column({ type: DataType.INTEGER, autoIncrement: true })
    declare id: string;

    @Column({ type: DataType.STRING, allowNull: false, unique: true })
    declare name: string;

    @Column({ type: DataType.STRING })
    declare RoleId: string;
    @HasMany(() => Permission) declare permissions: Permission[];
}