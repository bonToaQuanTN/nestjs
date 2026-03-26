import { Model } from 'sequelize-typescript';
export declare class Product extends Model<Product> {
    code: string;
    name: string;
    unit: string;
    price: number;
    origin: string;
    note: string;
}
