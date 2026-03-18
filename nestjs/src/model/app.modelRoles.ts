import {Table, Column, Model, DataType, AllowNull, PrimaryKey} from "sequelize-typescript";
@Table({
    tableName: 'Roles',
    timestamps: true
})
export class Role extends Model {
    @PrimaryKey
    @Column({ type: DataType.INTEGER, autoIncrement: true })
    declare id: string;

    @Column({ type: DataType.STRING, allowNull: false, unique: true })
    declare name: string;

    @Column({ type: DataType.STRING })
    declare description: string;
    
}