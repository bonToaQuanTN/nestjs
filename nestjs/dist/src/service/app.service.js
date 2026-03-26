"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var AppService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppService = void 0;
const common_1 = require("@nestjs/common");
const app_model_1 = require("../model/app.model");
const app_modelRoles_1 = require("../model/app.modelRoles");
const sequelize_1 = require("@nestjs/sequelize");
const bcrypt = __importStar(require("bcrypt"));
const jwt_1 = require("@nestjs/jwt");
const app_permissions_1 = require("../model/app.permissions");
const cache_manager_1 = require("@nestjs/cache-manager");
const sequelize_2 = require("sequelize");
let AppService = AppService_1 = class AppService {
    userModel;
    roleModel;
    permissionModel;
    cacheManager;
    jwtService;
    logger = new common_1.Logger(AppService_1.name);
    constructor(userModel, roleModel, permissionModel, cacheManager, jwtService) {
        this.userModel = userModel;
        this.roleModel = roleModel;
        this.permissionModel = permissionModel;
        this.cacheManager = cacheManager;
        this.jwtService = jwtService;
    }
    async generateUserId() {
        const lastUser = await this.userModel.findOne({
            order: [['id', 'DESC']]
        });
        if (!lastUser)
            return '221CTT001';
        const lastNumber = parseInt(lastUser.id.slice(-3));
        const newNumber = lastNumber + 1;
        return `221CTT${String(newNumber).padStart(3, '0')}`;
    }
    async createUser(data) {
        this.logger.log(`Create user attempt: ${data.email}`);
        try {
            const hashedPassword = await bcrypt.hash(data.password, 10);
            const id = await this.generateUserId();
            const existUser = await this.userModel.findOne({ where: { email: data.email } });
            if (existUser) {
                this.logger.warn(`Create user failed - email exists: ${data.email}`);
                throw new common_1.ConflictException('Email already exists');
            }
            this.logger.log(`User created successfully: ${data.email}`);
            return await this.userModel.create({
                ...data,
                password: hashedPassword,
                id
            });
        }
        catch (error) {
            this.handleError(error, 'Create user error');
            throw error;
        }
    }
    async getUser(page = 1, limit = 5) {
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
                attributes: { exclude: ['password'] }, limit, offset, order: [['id', 'ASC']]
            });
            const result = {
                totalUsers: count, currentPage: page, totalPages: Math.ceil(count / limit), users: rows.map(u => u.get({ plain: true }))
            };
            await this.cacheManager.set(cacheKey, result, 60000);
            return result;
        }
        catch (error) {
            this.handleError(error, 'Get error');
            throw error;
        }
    }
    async getByUserId(id) {
        const key = `user_${id}`;
        try {
            const cached = await this.cacheManager.get(key);
            if (cached) {
                this.logger.log(`CACHE HIT: ${key}`);
                return cached;
            }
            this.logger.warn(`CACHE MISS: ${key}`);
            const user = await this.userModel.findOne({ where: { id }, attributes: { exclude: ['password'] } });
            if (!user) {
                this.logger.warn(`User not found: ${id}`);
                throw new common_1.NotFoundException('User not found');
            }
            await this.cacheManager.set(key, user, 60000);
            return user;
        }
        catch (error) {
            this.handleError(error, 'Get error');
            throw error;
        }
    }
    async updateUser(id, data, currentUser) {
        this.logger.log(`Update user attempt: ${id} by ${currentUser.id}`);
        try {
            const user = await this.userModel.findOne({ where: { id } });
            if (!user) {
                this.logger.warn(`Update failed - user not found: ${id}`);
                throw new common_1.NotFoundException('User not found');
            }
            if (currentUser.role !== 'admin' && currentUser.role !== 'manager' && currentUser.id !== String(id)) {
                this.logger.warn(`Unauthorized update attempt by ${currentUser.id} on user ${id}`);
                throw new common_1.ForbiddenException('You can only update your own profile');
            }
            const updateData = { name: data.name, email: data.email, designation: data.designation };
            if (data.roleId) {
                if (currentUser.role !== 'admin') {
                    this.logger.warn(`Forbidden role update attempt by ${currentUser.id}`);
                    throw new common_1.ForbiddenException('Only admin can update role');
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
        }
        catch (error) {
            this.handleError(error, 'Update user error');
            throw error;
        }
    }
    async deleteUser(id) {
        this.logger.log(`Delete user attempt: ${id}`);
        try {
            const user = await this.userModel.findOne({ where: { id } });
            if (!user) {
                this.logger.warn(`Delete failed - user not found: ${id}`);
                throw new common_1.NotFoundException('Employee not found');
            }
            await user.destroy();
            await this.cacheManager.del(`user_${id}`);
            this.logger.log(`CACHE INVALIDATED: user_${id}`);
            this.logger.log(`User deleted successfully: ${id}`);
            return {
                message: 'Deleted successfully',
            };
        }
        catch (error) {
            this.handleError(error, 'Delete user error');
            throw error;
        }
    }
    async searchUserByName(name) {
        this.logger.log(`Search user by name: ${name}`);
        try {
            const users = await this.userModel.findAll({
                where: { name: { [sequelize_2.Op.like]: `%${name}%` } },
                attributes: ['id', 'name', 'email', 'designation']
            });
            return users;
        }
        catch (error) {
            this.handleError(error, 'Search user error');
            throw error;
        }
    }
    async login(loginDto) {
        const { email, password } = loginDto;
        this.logger.log(`Login attempt: ${email}`);
        try {
            const user = await this.userModel.findOne({ where: { email }, include: [{ model: app_modelRoles_1.Role, include: [app_permissions_1.Permission] }] });
            if (!user) {
                this.logger.warn(`Login failed - user not found: ${email}`);
                throw new common_1.NotFoundException('Not found');
            }
            const match = await bcrypt.compare(password, user.password);
            if (!match) {
                this.logger.warn(`Login failed - wrong password: ${email}`);
                throw new common_1.UnauthorizedException('Wrong password');
            }
            const role = user.role;
            const permissions = role?.permissions?.map(p => p.name) || [];
            const payload = { id: user.id, email: user.email, role: role?.name, permissions: permissions };
            this.logger.log(`Login success: ${email}`);
            return {
                message: 'Login success',
                access_token: this.jwtService.sign(payload),
            };
        }
        catch (error) {
            this.handleError(error, 'Login error');
            throw error;
        }
    }
    async getRoles() {
        const key = 'roles_all';
        this.logger.log('Fetching all roles');
        try {
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
                throw new common_1.NotFoundException('No roles found');
            }
            this.logger.log(`Fetched ${roles.length} roles successfully`);
            await this.cacheManager.set(key, roles, 60000);
            this.logger.log(`CACHE SET: ${key}`);
            return roles;
        }
        catch (error) {
            this.handleError(error, 'Get roles error');
            throw error;
        }
    }
    async createRole(name, RoleId) {
        this.logger.log(`Create role attempt: ${name}`);
        try {
            const existing = await this.roleModel.findOne({ where: { name } });
            if (existing) {
                this.logger.warn(`Create role failed - already exists: ${name}`);
                throw new common_1.BadRequestException('Role already exists');
            }
            await this.cacheManager.del('roles_all');
            this.logger.log('CACHE INVALIDATED: roles_all');
            this.logger.log(`Role created successfully: ${name}`);
            return this.roleModel.create({ name, RoleId });
        }
        catch (error) {
        }
    }
    async deleteRole(id) {
        const Role = await this.roleModel.findOne({
            where: { id }
        });
        if (!Role) {
            throw new common_1.NotFoundException('Employee not found');
        }
        await Role.destroy();
        return {
            message: 'Deleted successfully'
        };
    }
    async updateRole(id, dto) {
        this.logger.log(`Update role attempt: ${id}`);
        try {
            const role = await this.roleModel.findOne({ where: { id } });
            if (!role) {
                this.logger.warn(`Update role failed - not found: ${id}`);
                throw new common_1.NotFoundException('Role not found');
            }
            if (dto.name) {
                const existing = await this.roleModel.findOne({ where: { name: dto.name } });
                if (existing && existing.id !== id) {
                    this.logger.warn(`Update role failed - name exists: ${dto.name}`);
                    throw new common_1.BadRequestException('Role name already exists');
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
        }
        catch (error) {
            this.handleError(error, 'Update role error');
            throw error;
        }
    }
    async getAllPermissions() {
        this.logger.log('Fetching all permissions grouped by role');
        try {
            const permissions = await this.permissionModel.findAll({
                include: [{ model: this.roleModel, attributes: ['id', 'name'] }]
            });
            const grouped = permissions.reduce((acc, perm) => {
                const role = perm.Role;
                if (!role)
                    return acc;
                const roleName = role.name;
                if (!acc[roleName]) {
                    acc[roleName] = [];
                }
                acc[roleName].push(perm.name);
                return acc;
            }, {});
            this.logger.log('Permissions fetched successfully');
            return grouped;
        }
        catch (error) {
            this.handleError(error, 'Get permissions error');
            throw error;
        }
    }
    async getPermissionById(id) {
        const key = `permission_${id}`;
        this.logger.log(`Fetching permission: ${id}`);
        try {
            const cached = await this.cacheManager.get(key);
            if (cached) {
                this.logger.log(`CACHE HIT: ${key}`);
                return cached;
            }
            this.logger.warn(`CACHE MISS: ${key}`);
            const permission = await this.permissionModel.findByPk(id, { include: [app_modelRoles_1.Role] });
            if (!permission) {
                this.logger.warn(`Permission not found: ${id}`);
                throw new common_1.NotFoundException('Permission not found');
            }
            const result = permission.get({ plain: true });
            await this.cacheManager.set(key, result, 60000);
            this.logger.log(`CACHE SET: ${key}`);
            return result;
        }
        catch (error) {
            this.handleError(error, 'Get permission by ID error');
            throw error;
        }
    }
    async createPermission(name, roleId) {
        this.logger.log(`Create permission attempt: ${name} for role ${roleId}`);
        try {
            const role = await this.roleModel.findByPk(roleId);
            if (!role) {
                this.logger.warn(`Create permission failed - role not found: ${roleId}`);
                throw new common_1.NotFoundException('Role not found');
            }
            const existing = await this.permissionModel.findOne({ where: { name, roleId } });
            if (existing) {
                this.logger.warn(`Create permission failed - already exists: ${name} (role ${roleId})`);
                throw new common_1.BadRequestException('Permission already exists');
            }
            const permission = await this.permissionModel.create({ name, roleId, });
            await this.cacheManager.del(`permission_${permission.id}`);
            await this.cacheManager.del('permissions_all');
            this.logger.log('CACHE INVALIDATED: permission cache');
            this.logger.log(`Permission created successfully: ${name} (role ${roleId})`);
            return permission;
        }
        catch (error) {
            this.handleError(error, 'Create permission error');
            throw error;
        }
    }
    async updatePermission(id, dto) {
        this.logger.log(`Update permission attempt: ${id}`);
        try {
            const permission = await this.permissionModel.findByPk(id);
            if (!permission) {
                this.logger.warn(`Permission not found: ${id}`);
                throw new common_1.NotFoundException('Permission not found');
            }
            if (dto.name || dto.roleId) {
                const existing = await this.permissionModel.findOne({ where: {
                        name: dto.name ?? permission.name,
                        roleId: dto.roleId ?? permission.roleId
                    }
                });
                if (existing && existing.id !== id) {
                    this.logger.warn(`Duplicate permission: ${dto.name} (role ${dto.roleId})`);
                    throw new common_1.BadRequestException('Permission already exists');
                }
            }
            await permission.update(dto);
            await this.cacheManager.del(`permission_${id}`);
            await this.cacheManager.del('permissions_all');
            this.logger.log(`CACHE INVALIDATED: permission_${id}, permissions_all`);
            this.logger.log(`Permission updated successfully: ${id}`);
            return { message: 'Update permission success', data: permission,
            };
        }
        catch (error) {
            this.handleError(error, 'Update permission error');
            throw error;
        }
    }
    async deletePermission(id) {
        this.logger.log(`Delete permission attempt: ${id}`);
        try {
            const permission = await this.permissionModel.findByPk(id);
            if (!permission) {
                this.logger.warn(`Delete failed - permission not found: ${id}`);
                throw new common_1.NotFoundException('Permission not found');
            }
            await permission.destroy();
            await this.cacheManager.del(`permission_${id}`);
            await this.cacheManager.del('permissions_all');
            this.logger.log(`CACHE INVALIDATED: permission_${id}, permissions_all`);
            this.logger.log(`Permission deleted successfully: ${id}`);
            return {
                message: 'Delete permission success',
            };
        }
        catch (error) {
            this.handleError(error, 'Delete permission error');
            throw error;
        }
    }
    handleError(error, context) {
        if (error instanceof Error) {
            this.logger.error(`${context}: ${error.message}`, error.stack);
        }
        else {
            this.logger.error(`${context}: Unknown error`, JSON.stringify(error));
        }
    }
};
exports.AppService = AppService;
exports.AppService = AppService = AppService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, sequelize_1.InjectModel)(app_model_1.Users)),
    __param(1, (0, sequelize_1.InjectModel)(app_modelRoles_1.Role)),
    __param(2, (0, sequelize_1.InjectModel)(app_permissions_1.Permission)),
    __param(3, (0, common_1.Inject)(cache_manager_1.CACHE_MANAGER)),
    __metadata("design:paramtypes", [Object, Object, Object, Object, jwt_1.JwtService])
], AppService);
//# sourceMappingURL=app.service.js.map