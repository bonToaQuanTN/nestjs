import {Table, Column, Model, DataType, AllowNull, PrimaryKey, ForeignKey, BelongsTo } from "sequelize-typescript";
import {Role} from "./app.modelRoles";

@Table({ 
    tableName: "Users",
    version: true,
    paranoid: true
})
export class Users extends Model{
    @PrimaryKey
    @Column({type: DataType.STRING, defaultValue:'user'}) declare id: string;

    @Column({type: DataType.STRING, allowNull: false}) declare  name: string;

    @Column({type: DataType.STRING, allowNull: false, unique: true}) declare email: string;

    @Column({ type: DataType.STRING, allowNull: false }) declare  password: string;

    @Column({ type: DataType.STRING, allowNull: false }) declare  designation: string;

    @ForeignKey(() => Role)
    @Column({ type: DataType.INTEGER }) declare roleId: string;
    
    @BelongsTo(() => Role) declare role: Role;

    @Column({type: DataType.STRING,allowNull: true}) declare refreshToken: string;
}
