import {Table, Column, Model, DataType, AllowNull, PrimaryKey, HasMany} from "sequelize-typescript";
import {Permission} from "./app.permissions"

@Table({
    tableName: 'Roles',
    paranoid: true
})
export class Role extends Model {
    @PrimaryKey
    @Column({ type: DataType.INTEGER, autoIncrement: true })
    declare id: string;

    @Column({ type: DataType.STRING, allowNull: false, unique: true })
    declare name: string;

    @HasMany(() => Permission) declare permissions: Permission[];
}