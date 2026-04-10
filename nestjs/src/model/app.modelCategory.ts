import {Table, Column, Model, DataType, PrimaryKey, AutoIncrement, HasMany} from 'sequelize-typescript';
import { Product } from "./temp";

@Table({
    tableName: 'Categories',
    paranoid: true,
    version: true
})
export class Category extends Model{
    @PrimaryKey
    @AutoIncrement
    @Column({ type: DataType.INTEGER })
    declare id: number;

    @Column({ type: DataType.STRING })
    declare name: string;

    @HasMany(() => Product)
    declare products: Product[];
}