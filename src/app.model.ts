import { UserRole } from "./dto/user.dto"
import {Table, Column, Model, DataType, AllowNull, PrimaryKey} from "sequelize-typescript";

@Table({ 
    tableName: "User",
    version: true
})
export class Users extends Model{
    @PrimaryKey
    @Column({type: DataType.STRING, defaultValue:'user'}) declare id: string;

    @Column({type: DataType.STRING, allowNull: false}) declare  name: string;

    @Column({type: DataType.STRING, allowNull: false, unique: true}) declare email: string;

    @Column({ type: DataType.STRING, allowNull: false }) declare  password: string;

    @Column({ type: DataType.STRING, allowNull: false }) declare  designation: string;

    @Column({ type: DataType.ENUM("admin", "user"), defaultValue: "user" }) declare  role: UserRole;
}
