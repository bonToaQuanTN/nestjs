import {Table, Column, Model, DataType, PrimaryKey, HasMany } from "sequelize-typescript";
import {Order} from './app.modelOrder'

@Table({
    tableName: 'Discounts',
    paranoid: true,
    version: true
})
export class Discount extends Model {

    @PrimaryKey
    @Column(DataType.STRING)
    declare id: string;

    @Column(DataType.FLOAT)
    discountRate!: number;

    @HasMany(() => Order)
    declare orders: Order[];
} 