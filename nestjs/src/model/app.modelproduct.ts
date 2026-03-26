import {Table,Column,Model,DataType,PrimaryKey,Default} from 'sequelize-typescript';
import { v4 as uuidv4 } from 'uuid';

@Table
export class Product extends Model<Product> {
    
    @PrimaryKey
    @Default(uuidv4)
    @Column({type: DataType.UUID})declare code: string;

    @Column({type: DataType.STRING,allowNull: false})declare name: string;

    @Column({type: DataType.STRING})declare unit: string;

    @Column({type: DataType.FLOAT})declare price: number;

    @Column({type: DataType.STRING})declare origin: string;

    @Column({type: DataType.TEXT})declare note: string;

}
