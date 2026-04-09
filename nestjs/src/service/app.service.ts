import { Injectable, ConflictException, NotFoundException, ForbiddenException , UnauthorizedException, BadRequestException, Inject, Logger } from '@nestjs/common';
import {Users} from "../model/app.model";
import {Role} from "../model/app.modelRoles";
import {createRoleDto, CreateDiscountDto, CreateUserDto, LoginDto,PermissionDto, CreateProductDto, CreateOrderDto,CreateOrderItemDto} from "../dto/user.dto";
import { InjectModel} from "@nestjs/sequelize";
import * as bcrypt from "bcrypt";
import { JwtService } from '@nestjs/jwt';
import {Permission} from '../model/app.permissions';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { Op } from 'sequelize';
import {Product} from '../model/app.modelProduct';
import {OrderItem} from '../model/app.modelItem';
import {Order} from '../model/app.modelOrder';
import { Sequelize } from 'sequelize';
import {Category} from '../model/app.modelCategory';
import {Discount} from '../model/app.modelDiscount';

@Injectable()
export class AppService {
  private readonly logger = new Logger(AppService.name);

  constructor(
    @InjectModel(Users) private userModel: typeof Users,
    @InjectModel(Role) private roleModel: typeof Role,
    @InjectModel(Permission) private permissionModel: typeof Permission,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    @InjectModel(Product) private productModel: typeof Product,
    @InjectModel(Order) private orderModel: typeof Order,
    @InjectModel(OrderItem) private orderItemModel: typeof OrderItem,
    @InjectModel(Category) private categoryModel: typeof Category,
    @InjectModel(Discount) private discountModel: typeof Discount,


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
      await this.cacheManager.clear();
      this.logger.log(`User created successfully: ${data.email}`);
      return await this.userModel.create({...data,password: hashedPassword,id});
      
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
      await this.cacheManager.clear();
      this.logger.log(`CACHE INVALIDATED: user_${id}`);
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
      await this.cacheManager.clear();
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

  async searchUserByName(name: string) {
    this.logger.log(`Search user by name: ${name}`);

    try {
      const users = await this.userModel.findAll({
        where: {name: {[Op.like]: `%${name}%`}},
        attributes: ['id', 'name', 'email', 'designation']
      });
      return users;

    } catch (error) {
      this.handleError(error, 'Search user error');
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

  async createRole(name: string) {
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

      return this.roleModel.create({ name });

    } catch (error) {
      
    }
    
  }

  async deleteRole(id: string) {

    const Role = await this.roleModel.findOne({where: { id }});

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

    try {
      const permissions = await this.permissionModel.findAll({
        attributes: ['id', 'name'],
        include: [{model: this.roleModel,attributes: ['id','name']}]
      });

      const grouped = permissions.reduce((acc, perm) => {
        const role = perm.Role;
        if (!role) return acc;

        const roleName = role.name;
        if (!acc[roleName]) {
          acc[roleName] = [];
        }
        acc[roleName].push({id: perm.id,name: perm.name});
        return acc;
      }, {} as Record<string,{ id: number; name: string }[]>);

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

  async createProduct(data: CreateProductDto) {
    const { name, unit, price, origin, note ,categoryId} = data;
    this.logger.log(`Create product attempt: ${name}`);
    try {
      const existProduct = await this.productModel.findOne({
        where: { name }
      });
      if (existProduct) {
        this.logger.warn(`Create product failed - product exists: ${name}`);
        throw new ConflictException('Product already exists');
      }
      const product = await this.productModel.create({name,unit,price,origin,note,categoryId}as any);

      await this.cacheManager.del(`product_${product.id}`);
      await this.cacheManager.del('products_all');

      this.logger.log('CACHE INVALIDATED: product cache');
      this.logger.log(`Product created successfully: ${data.name}`);

      return product;
    }catch(error) {
      this.handleError(error, 'Create product error');
      throw error;
    }

    return await this.productModel.create();
  }

  async getProducts(page: number = 1) {
    this.logger.log(`Get products page ${page}`);

    try {
      const limit = 10;
      const offset = (page - 1) * limit;

      const cacheKey = `products_page_${page}`;
      const cached = await this.cacheManager.get(cacheKey);

      if (cached) {
        this.logger.log(`CACHE HIT: ${cacheKey}`);
        return cached;
      }
      this.logger.warn(`CACHE MISS: ${cacheKey}`);

      const { rows, count } = await this.productModel.findAndCountAll({
        attributes: ['code', 'name', 'unit', 'price', 'origin', 'note','categoryId'],
        limit,
        offset,
        order: [['createdAt', 'DESC']]
      });

      const result = {
        total: count,
        page,
        totalPages: Math.ceil(count / limit),
        data: rows
      };

      await this.cacheManager.set(cacheKey, result, 60);
      this.logger.log('Products cached');

      return result;

    } catch (error) {
        this.handleError(error, 'Get products error');
        throw error;
    }
  }

  async searchProducts(name: string, page: number = 1) {
    this.logger.log(`Search products by name: ${name}, page: ${page}`);

    try {
      const limit = 10;
      const offset = (page - 1) * limit;

      const cacheKey = `product_search_${name}_page_${page}`;
      const cached = await this.cacheManager.get(cacheKey);

      if (cached) {
        this.logger.log(`CACHE HIT: ${cacheKey}`);
        return cached;
      }

      this.logger.warn(`CACHE MISS: ${cacheKey}`);

      const { rows, count } = await this.productModel.findAndCountAll({
        where: {
          name: {
            [Op.like]: `%${name}%`
          }
        },
        attributes: ['code', 'name', 'unit', 'price', 'origin', 'note'],
        limit,
        offset,
        order: [['createdAt', 'DESC']]
      });

      const result = {
        total: count,
        page,
        totalPages: Math.ceil(count / limit),
        data: rows
      };
      await this.cacheManager.set(cacheKey, result, 60);
      this.logger.log('Product search cached');

      return result;

    } catch (error) {
      this.handleError(error, 'Search product error');
      throw error;
    }
  }

  async updateProduct(code: string, dto: CreateProductDto) {
    this.logger.log(`Update product attempt: ${code}`);

    try {
      const product = await this.productModel.findOne({where: {code}});

      if (!product) {
        this.logger.warn(`Update product failed - product not found: ${code}`);
        throw new NotFoundException('Product not found');
      }

      await product.update({name: dto.name,unit: dto.unit,price: dto.price, origin: dto.origin, note: dto.note});
      await this.orderItemModel.update(
  {
    price: dto.price,
    total: Sequelize.literal(`quantity * ${dto.price}`),
  },
  {
    where: { productId: product.code },
  },
);

      await this.cacheManager.clear();
      await this.cacheManager.del(`product_${code}`);
      await this.cacheManager.del('products_all');

      this.logger.log('CACHE INVALIDATED: product cache');
      this.logger.log(`Product updated successfully: ${code}`);

      return product;

    } catch (error) {
        this.handleError(error, 'Update product error');
        throw error;
    }
  }

  async deleteProduct(code: string) {
  this.logger.log(`Delete product attempt: ${code}`);

  try {
    const product = await this.productModel.findOne({
      where: { code }
    });

    if (!product) {
      this.logger.warn(`Delete failed - product not found: ${code}`);
      throw new NotFoundException('Product not found');
    }

    await product.destroy();

    // clear cache
    await this.cacheManager.del(`product_${code}`);
    await this.cacheManager.del('products_all');

    this.logger.log('CACHE INVALIDATED: product cache');
    this.logger.log(`Product deleted successfully: ${code}`);

    return { message: 'Product deleted successfully' };

  } catch (error) {
    this.handleError(error, 'Delete product error');
    throw error;
  }
  }

  async createOrder(userId: string,discountId?: string) {
    this.logger.log(`Create order attempt for user: ${userId}`);

    try {
      const order = await this.orderModel.create({userId,discountId: discountId || null});
      this.logger.log(`Order created successfully: ${order.id}`);
      await this.cacheManager.clear();
      return order;

    }catch (error) {
      this.handleError(error, 'Create order error');
      throw error;
    }
  }

  async createOrderItem(data: CreateOrderItemDto) {
    const { orderId, productId, quantity } = data;
    this.logger.log(`Create order item attempt - order: ${orderId}, product: ${productId}`);

    try {
      const product = await this.productModel.findOne({where: { code: productId }});
      if (!product) {
        this.logger.warn(`Create order item failed - product not found: ${productId}`);
        throw new NotFoundException('Product not found');
      }
      if (!product) {throw new NotFoundException('Product not found');}
      const price = product.price;
      const total = quantity * price;
      const item = await this.orderItemModel.create({orderId,productId,quantity,price,total});
      await this.cacheManager.clear();
      this.logger.log(`Order item created successfully - order: ${orderId}, product: ${productId}, quantity: ${quantity}, total: ${total}`);
      return item;

      } catch (error) {
        this.handleError(error, 'Create order item error');
        throw error;
      }
  }

  async getAllOrderItem(page = 1, limit = 10) {
    const offset = (page - 1) * limit;
    const cacheKey = `order_items_page_${page}_limit_${limit}`;
    const cached = await this.cacheManager.get(cacheKey);

    if (cached) {
      this.logger.log(`CACHE HIT: ${cacheKey}`);
      return cached;
    }

    this.logger.warn(`CACHE MISS: ${cacheKey}`);

    const { rows, count } = await this.orderItemModel.findAndCountAll({limit,offset});

    const result = {
      data: rows,
      pagination: {total: count,page,limit,totalPages: Math.ceil(count / limit)}
    };

    await this.cacheManager.set(cacheKey, result, 60);
    return result;
  }

  async findByOrder(orderId: string) {
    const cacheKey = `order_items_${orderId}`;
    const cached = await this.cacheManager.get(cacheKey);

    if (cached) {
      this.logger.log(`CACHE HIT: ${cacheKey}`);
      return cached;
    }

    this.logger.warn(`CACHE MISS: ${cacheKey}`);
    const items = await this.orderItemModel.findAll({where: { orderId }});
    await this.cacheManager.set(cacheKey, items, 60000);
    return items;
  }

  async updateOrderItem(id: string, data: CreateOrderItemDto) {
    const { productId, quantity } = data;
    this.logger.log(`Update order item attempt: ${id}`);

    try {
      const item = await this.orderItemModel.findByPk(id);

      if (!item) {
        this.logger.warn(`Update failed - order item not found: ${id}`);
        throw new NotFoundException('Order item not found');
      }

      const product = await this.productModel.findOne({
        where: { code: productId }
      });

      if (!product) {
        this.logger.warn(`Product not found: ${productId}`);
        throw new NotFoundException('Product not found');
      }

      const price = product.price;
      const total = price * quantity;

      await item.update({productId,quantity,price,total});
      await this.cacheManager.clear();
      this.logger.log(`Order item updated successfully: ${id}`);
      return item;
    } catch (error) {
      this.handleError(error, 'Update order item error');
      throw error;
    }
  }

  async deleteOrderItem(id: string) {
    this.logger.log(`Delete order item attempt: ${id}`);
    try {
      const item = await this.orderItemModel.findByPk(id);
      if (!item) {
        this.logger.warn(`Delete failed - order item not found: ${id}`);
        throw new NotFoundException('Order item not found');
      }

      await item.destroy();
      this.logger.log(`Order item soft deleted successfully: ${id}`);
      return {message: 'Order item deleted successfully'};

    } catch (error) {
      this.handleError(error, 'Delete order item error');
      throw error;
    }
  }

  async getOrders(page: number = 1) {
    this.logger.log(`Get orders page: ${page}`);
    try {
      const limit = 5;
      const offset = (page - 1) * limit;
      const { rows, count } = await this.orderModel.findAndCountAll({
        include: [
          { model: OrderItem },
          {
            model: Discount,
            as: 'discount',
            attributes: ['id', 'discountRate'],
            required: false
          }
        ],
        limit,
        offset,
        order: [['createdAt', 'DESC']]
      });

      const orders = rows.map(order => {
        const subtotal = order.items.reduce((sum, item) => sum + item.total, 0);
        const discountRate = Number(order.discount?.discountRate || 0);
        const finalAmount = subtotal - (subtotal * discountRate) / 100;
        return {
          ...order.toJSON(),
          subtotal,
          discountRate,
          finalAmount
        };
      });

      this.logger.log(`Orders fetched successfully: ${orders.length}`);
      return {
        page,
        limit,
        totalOrders: count,
        totalPages: Math.ceil(count / limit),
        data: orders
      };

    } catch (error) {
      this.handleError(error, 'Get orders error');
      throw error;
    }
  }

  async updateOrder(id: string, userId: string,discountId?: string) {
    this.logger.log(`Update order attempt: ${id}`);
    try {
      const order = await this.orderModel.findByPk(id);
      if (!order) {
        this.logger.warn(`Update failed - order not found: ${id}`);
        throw new NotFoundException('Order not found');
      }
      await order.update({userId,discountId: discountId || null});
      this.logger.log(`Order updated successfully: ${id}`);
      await this.cacheManager.clear();
      return order;
    } catch (error) {
      this.handleError(error, 'Update order error');
      throw error;
    }
  }

  async deleteOrder(id: string) {
    this.logger.log(`Delete order attempt: ${id}`);
    try {
      const order = await this.orderModel.findByPk(id);
      if (!order) {
        this.logger.warn(`Delete failed - order not found: ${id}`);
        throw new NotFoundException('Order not found');
      }
      await order.destroy();
      this.logger.log(`Order soft deleted successfully: ${id}`);
      return {message: 'Order deleted successfully'};

    } catch (error) {
      this.handleError(error, 'Delete order error');
      throw error;
    }
  }

  async getOrderById(id: string) {
    this.logger.log(`Get order by id: ${id}`);
    try {
      const order = await this.orderModel.findByPk(id, {
        include: [
          {
            model: OrderItem,
            attributes: ['productId', 'quantity', 'price', 'total']
          },
          {
            model: Discount,
            attributes: ['id', 'discountRate'],
            required: false
          }
        ]
      });

      if (!order) {
        this.logger.warn(`Order not found: ${id}`);
        throw new NotFoundException('Order not found');
      }

      const subtotal = (order.items || []).reduce((sum, item) => sum + item.total,0);
      const discountRate = order.discount?.discountRate || 0;
      const finalAmount =subtotal - (subtotal * discountRate) / 100;

      const result = {
        ...order.toJSON(),
        subtotal,
        discountRate,
        finalAmount
      };

      this.logger.log(`Order fetched successfully: ${id}`);

      return result;

    } catch (error) {
      this.handleError(error, 'Get order by id error');
      throw error;
    }
  }

  async updateStatus(id: string, status: string) {
    const order = await this.orderModel.findByPk(id);
    if (!order) {
      throw new NotFoundException('Order not found');
    }
    await order.update({ status });
    return order;
  }

  async createCategory(name: string) {
    this.logger.log(`Create category attempt: ${name}`);
    try {
      const existing = await this.categoryModel.findOne({ where: { name } });
      if (existing) {
        this.logger.warn(`Category already exists: ${name}`);
        throw new BadRequestException('Category already exists');
      }
      const category = await this.categoryModel.create({ name });
      await this.cacheManager.del('categories_all');
      this.logger.log(`Category created successfully: ${name}`);

      return category;
    } catch (error) {
      this.handleError(error, 'Get order by id error');
      throw error;
    }
  }

  async getCategories() {

    this.logger.log('Get all categories');

    try {

      const cacheKey = 'categories_all';
      const cached = await this.cacheManager.get(cacheKey);

      if (cached) {
        this.logger.log('CACHE HIT: categories_all');
        return cached;
      }

      this.logger.warn('CACHE MISS: categories_all');
      const categories = await this.categoryModel.findAll();
      await this.cacheManager.set(cacheKey, categories, 60);
      this.logger.log('Categories cached');
      return categories;
    } catch (error) {
      this.handleError(error, 'Get order by id error');
      throw error;
    }
  }

  async updateCategory(id: number, name: string) {
    this.logger.log(`Update category attempt: ${id}`);
    try {
      const category = await this.categoryModel.findByPk(id);
      if (!category) {
        this.logger.warn(`Category not found: ${id}`);
        throw new NotFoundException('Category not found');
      }
      await category.update({ name });
      await this.cacheManager.del(`category_${id}`);
      await this.cacheManager.del('categories_all');
      this.logger.log(`Category updated successfully: ${id}`);
      return category;

    } catch (error) {
      this.handleError(error, 'Get by id error');
      throw error;
    }
  }

  async deleteCategory(id: number) {
    this.logger.log(`Delete category attempt: ${id}`);
    try {
      const category = await this.categoryModel.findByPk(id);
      if (!category) {
        this.logger.warn(`Category not found: ${id}`);
        throw new NotFoundException('Category not found');
      }

      await category.destroy();
      await this.cacheManager.del(`category_${id}`);
      await this.cacheManager.del('categories_all');
      this.logger.log(`Category deleted successfully: ${id}`);

      return {
        message: 'Category deleted successfully'
      };

    } catch (error) {
      this.handleError(error, 'Get by id error');
      throw error;
    }
  }

  async getProductsByCategory(categoryName: string) {
    this.logger.log(`Get products by category: ${categoryName}`);
    try {
      const products = await this.productModel.findAll({
        include: [{model: Category,where: { name: categoryName },attributes: ['id','name']}]
      });
      this.logger.log(`Products fetched: ${products.length}`);
      return products;
    } catch (error) {
      this.handleError(error, 'Get products by category error');
      throw error;
    }
  }
  
  async getDiscounts(page: number = 1) {
    this.logger.log(`Get discounts page: ${page}`);
    try {
      const limit = 5;
      const offset = (page - 1) * limit;
      const { rows, count } = await this.discountModel.findAndCountAll({
        limit,
        offset,
        order: [['createdAt', 'DESC']]
      });
      return {
        page,
        limit,
        totalDiscounts: count,
        totalPages: Math.ceil(count / limit),
        data: rows
      };

    } catch (error) {
      this.handleError(error, 'Get discounts error');
      throw error;
    }

  }

  async createDiscount(data: CreateDiscountDto) {
    const { id , discountRate } = data;
    this.logger.log(`Create discount: ${data.id}`);
    const discount = await this.discountModel.create(data as any);
    await this.cacheManager.del('discounts');
    return discount;
  }

  async updateDiscount(id: string, rate: number) {
    this.logger.log(`Update discount: ${id}`);
    const discount = await this.discountModel.findByPk(id);
    if (!discount) {
      throw new NotFoundException('Discount not found');
    }
    await discount.update({ discountRate: rate });
    await this.cacheManager.del('discounts');
    return discount;
  }

  async deleteDiscount(id: string) {
    this.logger.log(`Delete discount: ${id}`);
    const discount = await this.discountModel.findByPk(id);
    if (!discount) {
      throw new NotFoundException('Discount not found');
    }
    await discount.destroy();
    await this.cacheManager.del('discounts');
    return {
      message: 'Discount deleted successfully'
    };
  }


}
