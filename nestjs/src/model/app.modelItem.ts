import {Table, Column, Model, DataType, PrimaryKey, ForeignKey, BelongsTo,Default } from "sequelize-typescript";
import { v4 as uuidv4 } from 'uuid';
import { Order } from "./app.modelOrder";
import { Product } from "./temp";

@Table({ 
    tableName: 'OrderItems',
    paranoid: true,
    version: true
 })
export class OrderItem extends Model {

    @PrimaryKey
    @Default(uuidv4)
    @Column({type: DataType.UUID})declare id: string;

    @ForeignKey(() => Order)
    @Column ({type: DataType.UUID})declare orderId: string;
    @ForeignKey(() => Product)

    @Default(DataType.UUIDV4)
    @Column({type: DataType.UUID })declare productId: string;

    @Column({type: DataType.INTEGER})declare quantity: number;

    @Column ({type: DataType.FLOAT})declare price: number;

    @Column({type: DataType.INTEGER})declare total: number;
    
    @BelongsTo(() => Product)declare product: Product;

}