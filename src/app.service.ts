import { Injectable, ConflictException, NotFoundException, ForbiddenException ,UnauthorizedException  } from '@nestjs/common';
import {Users} from "./app.model";
import {CreateUserDto, LoginDto} from "./dto/user.dto";
import { InjectModel} from "@nestjs/sequelize";
import * as bcrypt from "bcrypt";
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AppService {
  getHello(): string {
    return 'MinWan Hello World!';
  }

  constructor(
  @InjectModel(Users)
  private userModel: typeof Users,
  private readonly jwtService: JwtService,
) {}

  async generateUserId(){
    const lastUser = await this.userModel.findOne({
    order: [['id', 'DESC']]
  });
    if (!lastUser) return '221CTT001';
    const lastNumber = parseInt(lastUser.id.slice(-3));
    const newNumber = lastNumber + 1;
    return `221CTT${String(newNumber).padStart(3, '0')}`;
  }
  
  async createUser(data: CreateUserDto){
    const hashedPassword = await bcrypt.hash(data.password, 10);

    const id=await this.generateUserId();

    const existUser = await this.userModel.findOne({
    where: { email: data.email }
    });
    if (existUser) {
    throw new ConflictException('Email already exists');
  }
    return await this.userModel.create({
      ...data,
      password: hashedPassword,
      id
    });
  }
  
  async getUser(page: number = 1, limit: number = 5){
    const offset = (page - 1) * limit;

  const { count, rows } = await this.userModel.findAndCountAll({
    attributes: { exclude: ['password'] },
    limit,
    offset,
    order: [['id', 'ASC']]
  });

  if (rows.length === 0) {
    throw new NotFoundException('No employees found');
  }

  return {
    totalUsers: count,
    currentPage: page,
    totalPages: Math.ceil(count / limit),
    users: rows
  };
  }
  
  async getByUserId(id: string) {

  const user = await this.userModel.findOne({
    where: { id },
    attributes: { exclude: ['password'] }
  });

  if (!user) {
    throw new NotFoundException('User not found');
  }

  return user;
  }

  async updateUser(id: string, data: CreateUserDto, currentUser: any) {

    const user = await this.userModel.findOne({
      where: { id }
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // kiểm tra quyền update
    if (currentUser.role !== 'admin' && currentUser.id !== String(id)) {
      throw new ForbiddenException('You can only update your own profile');
    }

    const updateData: any = {
      name: data.name,
      email: data.email,
      designation: data.designation
    };

    if (data.role) {
    if (currentUser.role !== 'admin') {
      throw new ForbiddenException('Only admin can update role');
    }
    updateData.role = data.role;
  }

    // hash password nếu có
    if (data.password) {
      const hashedPassword = await bcrypt.hash(data.password, 10);
      updateData.password = hashedPassword;
    }

    await user.update(updateData);

    return { message: 'User updated successfully' };
  }

  async deleteUser(id: string) {

    const user = await this.userModel.findOne({
      where: { id }
    });

    if (!user) {
      throw new NotFoundException('Employee not found');
    }

    await user.destroy();

    return {
      message: 'Deleted successfully'
    };
  }

  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;
    const user = await this.userModel.findOne({ where: { email } });
    if (!user) {
      throw new NotFoundException('Not found');
    } 
  const Match = await bcrypt.compare(password, user.password);
    if (!Match) {
      throw new UnauthorizedException('Wrong password');
    }

  const token = { id: user.id, email: user.email, role: user.role };
    return {
      message: 'Login success',
      token: this.jwtService.sign(token),
    }
    
  }
  
}
