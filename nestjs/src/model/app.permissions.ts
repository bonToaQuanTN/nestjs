import { Table, Column, Model, DataType, ForeignKey, BelongsTo, PrimaryKey } from 'sequelize-typescript';
import { Role } from './app.modelRoles';

@Table({
  tableName:'Permission',
  version:'true',
  paranoid: true
})

export class Permission extends Model {

  @PrimaryKey
  @Column({ type: DataType.INTEGER, autoIncrement: true })
  declare id: number;

  @Column({ type: DataType.STRING, allowNull: false })
  declare name: string;

  // Foreign Key
  @ForeignKey(() => Role)
  @Column({ type: DataType.INTEGER })
  declare roleId: number;

  // Quan hệ ngược lại
  @BelongsTo(() => Role)  declare Role: Role;
}