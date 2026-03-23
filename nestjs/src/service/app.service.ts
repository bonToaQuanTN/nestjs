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
    this.logger.log(`Create user attempt: ${data.email}`);
    
    try{
      const hashedPassword = await bcrypt.hash(data.password, 10);

      const id=await this.generateUserId();

      const existUser = await this.userModel.findOne({where: { email: data.email }});
      if (existUser) {
        this.logger.warn(`Create user failed - email exists: ${data.email}`);
        throw new ConflictException('Email already exists');
      }
      this.logger.log(`User created successfully: ${data.email}`);
      return await this.userModel.create({
        ...data,
        password: hashedPassword,
        id
      });
      
    }catch(error){
      this.handleError(error,'Create user error');
      throw error;
    }
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
    this.logger.log(`Update user attempt: ${id} by ${currentUser.id}`);
    try {
      const user = await this.userModel.findOne({where: { id }});

      if (!user) {
        this.logger.warn(`Update failed - user not found: ${id}`);
        throw new NotFoundException('User not found');
      }

      if (currentUser.role !== 'admin' && currentUser.role !=='manager' && currentUser.id !== String(id)) {
        this.logger.warn(`Unauthorized update attempt by ${currentUser.id} on user ${id}`);
        throw new ForbiddenException('You can only update your own profile');
      }
      const updateData: any = {name: data.name, email: data.email, designation: data.designation };

      if (data.roleId) {
        if (currentUser.role !== 'admin') {
          this.logger.warn( `Forbidden role update attempt by ${currentUser.id}`);
          throw new ForbiddenException('Only admin can update role');
        }
      updateData.roleId = data.roleId;
      }
      if (data.password) {
        updateData.password = await bcrypt.hash(data.password, 10);
      }

      await user.update(updateData);

      await this.cacheManager.del(`user_${id}`);
      this.logger.log(`CACHE INVALIDATED: user_${id}`);

      await this.cacheManager.del(`user_${id}`);

      this.logger.log(`User updated successfully: ${id}`);

      return { message: 'User updated successfully' };

    } catch (error) {
      this.handleError(error, 'Update user error');
      throw error;
    }
  }

//xoa user
  async deleteUser(id: string) {
    this.logger.log(`Delete user attempt: ${id}`);
    try{
      const user = await this.userModel.findOne({where: { id }});

      if (!user) {
        this.logger.warn(`Delete failed - user not found: ${id}`);
        throw new NotFoundException('Employee not found');
    }

      await user.destroy();

      await this.cacheManager.del(`user_${id}`);
      this.logger.log(`CACHE INVALIDATED: user_${id}`);
      this.logger.log(`User deleted successfully: ${id}`);

      return {
        message: 'Deleted successfully',
      };
    }catch(error){
      this.handleError(error, 'Delete user error');
      throw error;
    }
    
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
    const key = 'roles_all';
    this.logger.log('Fetching all roles');
    try{
      const cached = await this.cacheManager.get(key);
      if (cached) {
        this.logger.log(`CACHE HIT: ${key}`);
        return cached;
      }

    this.logger.warn(`CACHE MISS: ${key}`);

      const roles = await this.roleModel.findAll({
        attributes: ['id', 'name', 'createdAt', 'updatedAt'],
        order: [['createdAt', 'DESC']]
      });
      if (!roles || roles.length === 0) {
        this.logger.warn('No roles found');
        throw new NotFoundException('No roles found');
      }
      this.logger.log(`Fetched ${roles.length} roles successfully`);

      await this.cacheManager.set(key, roles, 60000);
      this.logger.log(`CACHE SET: ${key}`);

      return roles;

    }catch(error){
      this.handleError(error, 'Get roles error');
      throw error;
    }
  }

  async createRole(name: string, RoleId?: string) {
    this.logger.log(`Create role attempt: ${name}`);
    
    try {
      const existing = await this.roleModel.findOne({ where: { name } });
      if (existing) {
        this.logger.warn(`Create role failed - already exists: ${name}`);
        throw new BadRequestException('Role already exists');
      }
      await this.cacheManager.del('roles_all');
      this.logger.log('CACHE INVALIDATED: roles_all');

      this.logger.log(`Role created successfully: ${name}`);

      return this.roleModel.create({ name, RoleId });

    } catch (error) {
      
    }
    
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
    this.logger.log(`Update role attempt: ${id}`);
    try{
      const role = await this.roleModel.findOne({ where: { id } });
      if (!role) {
        this.logger.warn(`Update role failed - not found: ${id}`);
        throw new NotFoundException('Role not found');
      }
      if (dto.name) {
        const existing = await this.roleModel.findOne({where: { name: dto.name }});

        if (existing && existing.id !== id) {
          this.logger.warn(`Update role failed - name exists: ${dto.name}`);
          throw new BadRequestException('Role name already exists');
        }
      }
      await role.update(dto);

      await this.cacheManager.del('roles_all');
      this.logger.log('CACHE INVALIDATED: roles_all');
      this.logger.log(`Role updated successfully: ${id}`);

      return {
        message: 'Update role success',
        data: role,
      };
    }catch(error){
      this.handleError(error, 'Update role error');
      throw error;
    }
  }

  async getAllPermissions() {
    this.logger.log('Fetching all permissions grouped by role');

    try{
      const permissions =await this.permissionModel.findAll({
        include:[{ model: this.roleModel, attributes:['id','name']}]
      });
      const grouped = permissions.reduce((acc, perm) => {
      const role = perm.Role;

      if (!role) return acc;

      const roleName = role.name;

      if (!acc[roleName]) {
        acc[roleName] = [];
      }

      acc[roleName].push(perm.name);

      return acc;
    }, {} as Record<string, string[]>);

    this.logger.log('Permissions fetched successfully');
    return grouped;
    }catch(error){
      this.handleError(error,'Get permissions error');
      throw error;
    }
    
  }

  async getPermissionById(id: number) {
    const key = `permission_${id}`;
    this.logger.log(`Fetching permission: ${id}`);

    try {
      const cached = await this.cacheManager.get(key);
      if (cached) {
        this.logger.log(`CACHE HIT: ${key}`);
        return cached;
      }
      this.logger.warn(`CACHE MISS: ${key}`);

      const permission = await this.permissionModel.findByPk(id, {include: [Role]});

      if (!permission) {
        this.logger.warn(`Permission not found: ${id}`);
        throw new NotFoundException('Permission not found');
      }

      const result = permission.get({ plain: true });

      await this.cacheManager.set(key, result, 60000);
      this.logger.log(`CACHE SET: ${key}`);

      return result;

    } catch (error) {
      this.handleError(error, 'Get permission by ID error');
      throw error;
    }
  }

  async createPermission(name: string, roleId: string) {
    this.logger.log(`Create permission attempt: ${name} for role ${roleId}`);
    try {
      const role = await this.roleModel.findByPk(roleId);
      if (!role) {
      this.logger.warn(`Create permission failed - role not found: ${roleId}`);
      throw new NotFoundException('Role not found');
      }

      const existing = await this.permissionModel.findOne({where: { name, roleId }});

    if (existing) {
      this.logger.warn(`Create permission failed - already exists: ${name} (role ${roleId})`);
      throw new BadRequestException('Permission already exists');
    }

    const permission = await this.permissionModel.create({name,roleId,});

    await this.cacheManager.del(`permission_${permission.id}`);
    await this.cacheManager.del('permissions_all');
    this.logger.log('CACHE INVALIDATED: permission cache');

    this.logger.log(`Permission created successfully: ${name} (role ${roleId})`);
    return permission;
    } catch (error) {
      this.handleError(error, 'Create permission error');
    throw error;
    }
  }

  async updatePermission(id: number, dto: PermissionDto) {

    this.logger.log(`Update permission attempt: ${id}`);
    try {
      const permission = await this.permissionModel.findByPk(id);
      if (!permission) {
        this.logger.warn(`Permission not found: ${id}`);
        throw new NotFoundException('Permission not found');
      }
      if (dto.name || dto.roleId) {
      const existing = await this.permissionModel.findOne({where: {
        name: dto.name ?? permission.name,
        roleId: dto.roleId ?? permission.roleId
        }
      });
      if (existing && existing.id !== id) {
        this.logger.warn(`Duplicate permission: ${dto.name} (role ${dto.roleId})`);
        throw new BadRequestException('Permission already exists');
      }
    }
    await permission.update(dto);

    await this.cacheManager.del(`permission_${id}`);
    await this.cacheManager.del('permissions_all');
    this.logger.log(`CACHE INVALIDATED: permission_${id}, permissions_all`);
    this.logger.log(`Permission updated successfully: ${id}`);

    return {message: 'Update permission success',data: permission,
    };
    } catch (error) {
      this.handleError(error, 'Update permission error');
    throw error;
    }
  }

  async deletePermission(id: number) {
    this.logger.log(`Delete permission attempt: ${id}`);
    try {
      const permission = await this.permissionModel.findByPk(id);

    if (!permission) {
      this.logger.warn(`Delete failed - permission not found: ${id}`);
      throw new NotFoundException('Permission not found');
    }

      await permission.destroy();
      await this.cacheManager.del(`permission_${id}`);
      await this.cacheManager.del('permissions_all');
      this.logger.log(`CACHE INVALIDATED: permission_${id}, permissions_all`);

      this.logger.log(`Permission deleted successfully: ${id}`);

      return {
        message: 'Delete permission success',
      };
    } catch (error) {
      this.handleError(error, 'Delete permission error');
      throw error;
    }
  }
  
  private handleError(error: unknown, context: string) {
    if (error instanceof Error) {
      this.logger.error(`${context}: ${error.message}`, error.stack);
    } else {
      this.logger.error(`${context}: Unknown error`, JSON.stringify(error));
    }
  }

}
