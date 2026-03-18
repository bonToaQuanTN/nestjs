import { Injectable, ConflictException, NotFoundException, ForbiddenException , UnauthorizedException, BadRequestException  } from '@nestjs/common';
import {Users} from "./model/app.model";
import {Role} from "./model/app.modelRoles";
import {createRoleDto, CreateUserDto, LoginDto} from "./dto/user.dto";
import { InjectModel} from "@nestjs/sequelize";
import * as bcrypt from "bcrypt";
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AppService {
  constructor(
    @InjectModel(Users) private userModel: typeof Users,

    @InjectModel(Role) private roleModel: typeof Role,

    private readonly jwtService: JwtService
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
  
  //Register 
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
      throw new NotFoundException('No user found');
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

    // kiem tra quyen
    // if (currentUser.role !== 'admin' && currentUser.id !== String(id)) {
    //   throw new ForbiddenException('You can only update your own profile');
    // }

    const updateData: any = {
      name: data.name,
      email: data.email,
      designation: data.designation
    };

    // if (data.roleId) {
    //   if (currentUser.role !== 'admin') {
    //     throw new ForbiddenException('Only admin can update role');
    //   }
      // updateData.role = data.roleId;
    // }

    //ty them login xoa gium t dong nay
    updateData.role = data.roleId;

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
    
    const user = await this.userModel.findOne({where: { email }});
    console.log(user)
    if (!user) {
      throw new NotFoundException('Not found');
    }
  const match = await bcrypt.compare(password, user.password);
    if (!match) {
      throw new UnauthorizedException('Wrong password');
    }

  const token = { id: user.id, email: user.email, roleID: user.roleId };
    return {
      message: 'Login success',
      token: this.jwtService.sign(token),
    }
  }

  async getRoles() {
    const roles = await this.roleModel.findAll({
      attributes: ['id', 'name', 'createdAt', 'updatedAt'],
      order: [['createdAt', 'DESC']]
    });

    if (!roles || roles.length === 0) {
      throw new NotFoundException('No roles found');
    }

    return roles;
  }

  async createRole(name: string, RoleId?: string) {
  const existing = await this.roleModel.findOne({ where: { name } });

  if (existing) {
    throw new BadRequestException('Role already exists');
  }
  return this.roleModel.create({ name, RoleId });
  }

  async deleteRole(id: string) {

    const Role = await this.roleModel.findOne({
      where: { id }
    });

    if (!Role) {
      throw new NotFoundException('Employee not found');
    }

    await Role.destroy();

    return {
      message: 'Deleted successfully'
    };
  }

  async updateRole(id: string, dto: createRoleDto) {
    const role = await this.roleModel.findOne({ where: { id } });

    if (!role) {
      throw new NotFoundException('Role not found');
    }

    await role.update(dto);

    return {
      message: 'Update role success',
      data: role,
    };
  }
}
