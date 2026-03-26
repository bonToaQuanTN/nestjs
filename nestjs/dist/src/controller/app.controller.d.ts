import { AppService } from '../service/app.service';
import { CreateUserDto, LoginDto } from "../dto/user.dto";
export declare class AppController {
    private readonly userService;
    constructor(userService: AppService);
    getAll(page: number, limit: number): Promise<{}>;
    create(data: CreateUserDto): Promise<import("../model/app.model").Users>;
    searchUser(name: string): Promise<import("../model/app.model").Users[]>;
    getOne(id: string): Promise<{}>;
    updateUser(id: string, data: CreateUserDto, req: any): Promise<{
        message: string;
    }>;
    deleteUser(id: string): Promise<{
        message: string;
    }>;
    login(data: LoginDto): Promise<{
        message: string;
        access_token: string;
    }>;
}
