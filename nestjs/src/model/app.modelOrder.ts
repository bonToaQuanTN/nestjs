import {Table, Column, Model, DataType, PrimaryKey,Default,HasMany,BelongsTo,ForeignKey } from "sequelize-typescript";
import { v4 as uuidv4 } from 'uuid';
import { OrderItem } from "./app.modelItem";
import {Discount} from "./app.modelDiscount"
import {Users}from "./app.model"

@Table({
    tableName: 'Orders',
    paranoid: true,
    version: true
 })
export class Order extends Model {

    @PrimaryKey
    @Default(uuidv4)
    @Column ({type: DataType.UUID}) declare id: string;


    @ForeignKey(() => Users)
    @Column({type: DataType.STRING}) declare userId: string;
    @BelongsTo(() => Users)  declare user: Users;

    @HasMany(() => OrderItem) declare items: OrderItem[];

    @Default('pending')
    @Column({ type: DataType.STRING }) declare status: string;

    @ForeignKey(() => Discount)
    @Column({type: DataType.STRING,allowNull: true}) declare discountId: string;

    @BelongsTo(() => Discount) declare discount: Discount;
}