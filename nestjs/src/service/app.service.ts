import { Injectable, ConflictException, NotFoundException, ForbiddenException , UnauthorizedException, BadRequestException, Inject, Logger } from '@nestjs/common';
import {Users} from "../model/app.model";
import {Role} from "../model/app.modelRoles";
import {createRoleDto, CreateUserDto, LoginDto,PermissionDto} from "../dto/user.dto";
import { InjectModel} from "@nestjs/sequelize";
import * as bcrypt from "bcrypt";
import { JwtService } from '@nestjs/jwt';
import {Permission} from '../model/app.permissions';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';

@Injectable()
export class AppService {
  private readonly logger = new Logger(AppService.name);

  constructor(
    @InjectModel(Users) private userModel: typeof Users,

    @InjectModel(Role) private roleModel: typeof Role,

    @InjectModel(Permission) private permissionModel: typeof Permission,

    @Inject(CACHE_MANAGER) private cacheManager: Cache,

    private readonly jwtService: JwtService
  ) {}

  //tu dong tao ma id theo mau
  async generateUserId(){
    const lastUser = await this.userModel.findOne({
    order: [['id', 'DESC']]
  });
    if (!lastUser) return '221CTT001';
    const lastNumber = parseInt(lastUser.id.slice(-3));
    const newNumber = lastNumber + 1;
    return `221CTT${String(newNumber).padStart(3, '0')}`;
  }
  
 //dang ky user
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
  
  //lay toan bo thong tin user
  async getUser(page: number = 1, limit: number = 5) {
    const cacheKey = `users_page_${page}_limit_${limit}`;
    this.logger.log('Fetching all users');

    try {
      const cached = await this.cacheManager.get(cacheKey);

      if (cached) {
        this.logger.log(`CACHE HIT: ${cacheKey}`);
        return cached;
      }         
      this.logger.warn(`CACHE MISS: ${cacheKey}`);

      const offset = (page - 1) * limit;

      const { count, rows } = await this.userModel.findAndCountAll({
        attributes: { exclude: ['password'] },limit, offset,order: [['id', 'ASC']]
      });

      const result = {
        totalUsers: count,currentPage: page,totalPages: Math.ceil(count / limit),users: rows.map(u => u.get({ plain: true }))
      };

      await this.cacheManager.set(cacheKey, result,60000);

      return result;
    }catch (error){
      this.handleError(error, 'Get error');
      throw error;
    }
  }
  
  //lay thong tin theo id user
  async getByUserId(id: string) {
    const key = `user_${id}`;

    try{
      const cached = await this.cacheManager.get(key);
      if (cached) {
        this.logger.log(`CACHE HIT: ${key}`);
        return cached;
      }
       this.logger.warn(`CACHE MISS: ${key}`);
       const user = await this.userModel.findOne({where: { id }, attributes: { exclude: ['password'] }});

       // Lấy dữ liệu từ DB

      if (!user) {
      this.logger.warn(`User not found: ${id}`);
      throw new NotFoundException('User not found');
    }
      // Lưu vào cache 60 giây
      await this.cacheManager.set(key, user, 60000);
      return user;

    }catch(error){
      this.handleError(error, 'Get error');
      throw error;
    }

  }

  // sua thong tin user
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

//xoa user
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
    this.logger.log(`Login attempt: ${email}`);

    try{
      const user = await this.userModel.findOne({where: { email },include: [{model: Role,include: [Permission]}]});
      if (!user) {
        this.logger.warn(`Login failed - user not found: ${email}`);
        throw new NotFoundException('Not found');
      }
      const match = await bcrypt.compare(password, user.password);

      if (!match) {
        this.logger.warn(`Login failed - wrong password: ${email}`);
        throw new UnauthorizedException('Wrong password');
      }

      const role = user.role;
      const permissions = role?.permissions?.map(p => p.name) || [];

      const payload = {id: user.id,email: user.email,role: role?.name,permissions: permissions};
      this.logger.log(`Login success: ${email}`);

      return {
        message: 'Login success',
        access_token: this.jwtService.sign(payload),
      };
    }catch(error){
      this.handleError(error, 'Login error');
      throw error;
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

  async getAllPermissions() {
    return this.permissionModel.findAll({include: [Role]});
  }

  async getPermissionById(id: number) {
    const permission = await this.permissionModel.findByPk(id, {
      include: [Role],
    });

    if (!permission) {
      throw new NotFoundException('Permission not found');
    }

    return permission;
  }

  async createPermission(name: string, roleId: string) {
    const role = await this.roleModel.findByPk(roleId);
    if (!role) {
      throw new NotFoundException('Role not found');
    }

    return this.permissionModel.create({name, roleId});
  }

  async updatePermission(id: number, dto: PermissionDto) {
    const permission = await this.permissionModel.findByPk(id);

    if (!permission) {
      throw new NotFoundException('Permission not found');
    }

    await permission.update(dto);

    return {
      message: 'Update permission success',
      data: permission
    };
  }

  async deletePermission(id: number) {
    const permission = await this.permissionModel.findByPk(id);

    if (!permission) {
      throw new NotFoundException('Permission not found');
    }

    await permission.destroy();

    return {
      message: 'Delete permission success'
    };
  }
  

  private handleError(error: unknown, context: string) {
    if (error instanceof Error) {
      this.logger.error(`${context}: ${error.message}`, error.stack);
    } else {
      this.logger.error(`${context}: Unknown error`, JSON.stringify(error));
    }
  }

}
