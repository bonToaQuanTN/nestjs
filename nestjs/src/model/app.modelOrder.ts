import {Table, Column, Model, DataType, PrimaryKey,Default,HasMany } from "sequelize-typescript";
import { v4 as uuidv4 } from 'uuid';
import { OrderItem } from "./app.modelItem";

@Table({
    tableName: 'Orders',
    paranoid: true,
    version: true
 })
export class Order extends Model {

    @PrimaryKey
    @Default(uuidv4)
    @Column ({type: DataType.UUID})declare id: string;

    @Column({type: DataType.STRING})declare userId: string;

    @HasMany(() => OrderItem)declare items: OrderItem[];
}