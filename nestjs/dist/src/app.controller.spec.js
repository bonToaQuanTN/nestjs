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
Object.defineProperty(exports, "__esModule", { value: true });
const testing_1 = require("@nestjs/testing");
const app_controller_1 = require("./controller/app.controller");
const app_service_1 = require("./service/app.service");
const auth_guard_1 = require("./common/guards/auth.guard");
const roles_guard_1 = require("./common/guards/roles.guard");
const cache_manager_1 = require("@nestjs/cache-manager");
const upload_service_1 = require("./service/upload.service");
const cloudinary_1 = require("cloudinary");
const common_1 = require("@nestjs/common");
const bcrypt = __importStar(require("bcrypt"));
const sequelize_1 = require("sequelize");
jest.mock('cloudinary', () => {
    const endMock = jest.fn();
    return {
        v2: {
            config: jest.fn(),
            uploader: {
                upload_stream: jest.fn(() => ({ end: endMock }))
            }
        }
    };
});
describe('UploadService', () => {
    let service;
    beforeEach(async () => {
        const module = await testing_1.Test.createTestingModule({
            providers: [upload_service_1.UploadService]
        }).compile();
        service = module.get(upload_service_1.UploadService);
    });
    it('should be defined', () => {
        expect(service).toBeDefined();
    });
    it('should throw error if file missing', async () => {
        await expect(service.uploadFile(null)).rejects.toThrow(common_1.BadRequestException);
    });
    it('should upload file and return url', async () => {
        const mockFile = {
            buffer: Buffer.from('test file')
        };
        const mockUrl = 'http://cloudinary.com/test.jpg';
        cloudinary_1.v2.uploader.upload_stream.mockImplementation((options, callback) => {
            callback(null, { secure_url: mockUrl });
            return {
                end: jest.fn()
            };
        });
        const result = await service.uploadFile(mockFile);
        expect(result).toBe(mockUrl);
        expect(cloudinary_1.v2.uploader.upload_stream).toHaveBeenCalled();
    });
});
jest.mock('bcrypt', () => ({
    hash: jest.fn(), compare: jest.fn()
}));
describe('AppController', () => {
    let appController;
    let appService;
    let service;
    const mockService = {
        getUser: jest.fn(),
        createUser: jest.fn(),
        getByUserId: jest.fn(),
        updateUser: jest.fn(),
        deleteUser: jest.fn(),
        login: jest.fn(),
    };
    beforeEach(async () => {
        const module = await testing_1.Test.createTestingModule({
            controllers: [app_controller_1.AppController],
            providers: [
                {
                    provide: app_service_1.AppService,
                    useValue: mockService,
                },
            ],
        })
            .overrideGuard(auth_guard_1.AuthGuard)
            .useValue({
            canActivate: jest.fn(() => true),
        })
            .overrideGuard(roles_guard_1.RolesGuard)
            .useValue({
            canActivate: jest.fn(() => true),
        })
            .overrideInterceptor(cache_manager_1.CacheInterceptor)
            .useValue({
            intercept: jest.fn((context, next) => next.handle()),
        })
            .compile();
        appController = module.get(app_controller_1.AppController);
        appService = module.get(app_service_1.AppService);
    });
    afterEach(() => {
        jest.clearAllMocks();
    });
    describe('getAll', () => {
        const mockCacheManager = { get: jest.fn(), set: jest.fn() };
        const mockUserModel = { findAndCountAll: jest.fn() };
        const mockLogger = { log: jest.fn(), warn: jest.fn(), error: jest.fn() };
        const mockRoleModel = { findAll: jest.fn() };
        const mockPermissionModel = { findAll: jest.fn() };
        const mockJwtService = { sign: jest.fn() };
        beforeEach(() => {
            service = new app_service_1.AppService(mockUserModel, mockRoleModel, mockPermissionModel, mockCacheManager, mockJwtService);
            service.logger = mockLogger;
        });
        afterEach(() => {
            jest.clearAllMocks();
        });
        it('should return users from cache (CACHE HIT)', async () => {
            const cachedResult = {
                totalUsers: 1,
                currentPage: 1,
                totalPages: 1,
                users: [{ id: '221CTT026', name: 'Quan' }]
            };
            mockCacheManager.get.mockResolvedValue(cachedResult);
            const result = await service.getUser(1, 5);
            expect(result).toEqual(cachedResult);
            expect(mockCacheManager.get).toHaveBeenCalledWith('users_page_1_limit_5');
            expect(mockUserModel.findAndCountAll).not.toHaveBeenCalled();
        });
        it('should fetch users from DB and cache them (CACHE MISS)', async () => {
            mockCacheManager.get.mockResolvedValue(null);
            const mockRows = [{ get: () => ({ id: '221CTT026', name: 'Quan' }) }];
            mockUserModel.findAndCountAll.mockResolvedValue({ count: 1, rows: mockRows });
            const result = await service.getUser(1, 5);
            expect(mockUserModel.findAndCountAll).toHaveBeenCalled();
            expect(result).toEqual({ totalUsers: 1, currentPage: 1, totalPages: 1, users: [{ id: '221CTT026', name: 'Quan' }] });
            expect(mockCacheManager.set).toHaveBeenCalledWith('users_page_1_limit_5', result, 60000);
        });
        it('should calculate offset correctly', async () => {
            mockCacheManager.get.mockResolvedValue(null);
            mockUserModel.findAndCountAll.mockResolvedValue({ count: 10, rows: [] });
            await service.getUser(2, 5);
            expect(mockUserModel.findAndCountAll).toHaveBeenCalledWith(expect.objectContaining({ limit: 5, offset: 5 }));
        });
    });
    describe('login', () => {
        const mockCacheManager = { get: jest.fn(), set: jest.fn() };
        const mockUserModel = { findOne: jest.fn() };
        const mockLogger = { log: jest.fn(), warn: jest.fn(), error: jest.fn() };
        beforeEach(() => {
            jest.clearAllMocks();
            service = new app_service_1.AppService(mockUserModel, {}, {}, mockCacheManager, {});
            service.logger = mockLogger;
        });
        it('should return user from cache (CACHE HIT)', async () => {
            const cachedUser = { id: '221CTT026', name: 'Quan' };
            mockCacheManager.get.mockResolvedValue(cachedUser);
            const result = await service.getByUserId('221CTT026');
            expect(result).toEqual(cachedUser);
            expect(mockCacheManager.get).toHaveBeenCalledWith('user_221CTT026');
            expect(mockUserModel.findOne).not.toHaveBeenCalled();
        });
        it('should fetch user from DB and cache it (CACHE MISS)', async () => {
            const user = { id: '221CTT026', name: 'Quan' };
            mockCacheManager.get.mockResolvedValue(null);
            mockUserModel.findOne.mockResolvedValue(user);
            const result = await service.getByUserId('221CTT026');
            expect(mockUserModel.findOne).toHaveBeenCalledWith({
                where: { id: '221CTT026' },
                attributes: { exclude: ['password'] },
            });
            expect(mockCacheManager.set).toHaveBeenCalledWith('user_221CTT026', user, 60000);
            expect(result).toEqual(user);
        });
        it('should throw NotFoundException when user not found', async () => {
            mockCacheManager.get.mockResolvedValue(null);
            mockUserModel.findOne.mockResolvedValue(null);
            try {
                await service.getByUserId('999');
            }
            catch (error) {
                expect(error).toBeInstanceOf(common_1.NotFoundException);
            }
        });
    });
    describe('getByUserId', () => {
        const mockCacheManager = { get: jest.fn(), set: jest.fn() };
        const mockUserModel = { findOne: jest.fn() };
        const mockLogger = { log: jest.fn(), warn: jest.fn(), error: jest.fn() };
        beforeEach(() => {
            jest.clearAllMocks();
            service = new app_service_1.AppService(mockUserModel, {}, {}, mockCacheManager, {});
            service.logger = mockLogger;
            ;
        });
        it('should return user from cache (CACHE HIT)', async () => {
            const cachedUser = { id: '221CTT026', name: 'Quan' };
            mockCacheManager.get.mockResolvedValue(cachedUser);
            const result = await service.getByUserId('221CTT026');
            expect(result).toEqual(cachedUser);
            expect(mockCacheManager.get).toHaveBeenCalledWith('user_221CTT026');
            expect(mockUserModel.findOne).not.toHaveBeenCalled();
        });
        it('should fetch user from DB and cache it (CACHE MISS)', async () => {
            const user = { id: '221CTT026', name: 'Quan' };
            mockCacheManager.get.mockResolvedValue(null);
            mockUserModel.findOne.mockResolvedValue(user);
            const result = await service.getByUserId('221CTT026');
            expect(mockUserModel.findOne).toHaveBeenCalledWith({
                where: { id: '221CTT026' },
                attributes: { exclude: ['password'] },
            });
            expect(mockCacheManager.set).toHaveBeenCalledWith('user_221CTT026', user, 60000);
            expect(result).toEqual(user);
        });
        it('should throw NotFoundException when user not found', async () => {
            mockCacheManager.get.mockResolvedValue(null);
            mockUserModel.findOne.mockResolvedValue(null);
            await expect(service.getByUserId('999')).rejects.toBeInstanceOf(common_1.NotFoundException);
            expect(mockUserModel.findOne).toHaveBeenCalledWith({ where: { id: '999' }, attributes: { exclude: ['password'] }
            });
        });
    });
    describe('create', () => {
        let service;
        const mockUserModel = { findOne: jest.fn(), create: jest.fn() };
        const mockLogger = { log: jest.fn(), warn: jest.fn(), error: jest.fn() };
        const mockCacheManager = { get: jest.fn(), set: jest.fn() };
        beforeEach(() => {
            service = new app_service_1.AppService(mockUserModel, {}, {}, mockCacheManager, {});
            service.logger = mockLogger;
            ;
        });
        afterEach(() => {
            jest.clearAllMocks();
        });
        it('should create user successfully', async () => {
            const dto = { name: 'Quan', email: 'q@gmail.com', password: '123' };
            const hashedPassword = 'hashedPassword';
            const userId = '221CTT026';
            bcrypt.hash.mockResolvedValue(hashedPassword);
            jest.spyOn(service, 'generateUserId').mockResolvedValue(userId);
            mockUserModel.findOne.mockResolvedValue(null);
            const createdUser = { id: userId, name: 'Quan', email: 'q@gmail.com', password: hashedPassword };
            mockUserModel.create.mockResolvedValue(createdUser);
            const result = await service.createUser(dto);
            expect(bcrypt.hash).toHaveBeenCalledWith('123', 10);
            expect(mockUserModel.create).toHaveBeenCalledWith({
                ...dto,
                password: hashedPassword,
                id: userId,
            });
            expect(result).toEqual(createdUser);
        });
        it('should throw ConflictException if email already exists', async () => {
            const dto = { name: 'Quan', email: 'q@gmail.com', password: '123' };
            mockUserModel.findOne.mockResolvedValue({ id: '221CTT025' });
            await expect(service.createUser(dto)).rejects.toThrow(common_1.ConflictException);
            expect(mockUserModel.create).not.toHaveBeenCalled();
        });
    });
    describe('updateUser', () => {
        let service;
        const mockUserModel = { findOne: jest.fn() };
        const mockCacheManager = { del: jest.fn() };
        const mockLogger = { log: jest.fn(), warn: jest.fn(), error: jest.fn() };
        beforeEach(() => {
            jest.clearAllMocks();
            service = new app_service_1.AppService(mockUserModel, {}, {}, mockCacheManager, {});
            service.logger = mockLogger;
            ;
        });
        it('should update user successfully', async () => {
            const id = '1';
            const dto = { name: 'Updated Name', email: 'updated@mail.com' };
            const currentUser = { id: '1', role: 'admin' };
            const mockUser = { update: jest.fn() };
            mockUserModel.findOne.mockResolvedValue(mockUser);
            const result = await service.updateUser(id, dto, currentUser);
            expect(mockUserModel.findOne).toHaveBeenCalledWith({ where: { id: '1' } });
            expect(mockUser.update).toHaveBeenCalledWith({ name: dto.name, email: dto.email, designation: undefined });
            expect(mockCacheManager.del).toHaveBeenCalledWith('user_1');
            expect(result).toEqual({ message: 'User updated successfully' });
        });
        it('should throw NotFoundException if user not found', async () => {
            mockUserModel.findOne.mockResolvedValue(null);
            await expect(service.updateUser('1', {}, { id: '1', role: 'admin' })).rejects.toThrow(common_1.NotFoundException);
        });
        it('should throw ForbiddenException if user tries to update another profile', async () => {
            const mockUser = { update: jest.fn() };
            mockUserModel.findOne.mockResolvedValue(mockUser);
            const currentUser = { id: '2', role: 'user' };
            await expect(service.updateUser('1', {}, currentUser)).rejects.toThrow(common_1.ForbiddenException);
        });
        it('should allow manager to update other users', async () => {
            const mockUser = {
                update: jest.fn(),
            };
            mockUserModel.findOne.mockResolvedValue(mockUser);
            const currentUser = { id: '2', role: 'manager' };
            const result = await service.updateUser('1', { name: 'Manager Update' }, currentUser);
            expect(mockUser.update).toHaveBeenCalled();
            expect(result).toEqual({
                message: 'User updated successfully',
            });
        });
        it('should hash password when password provided', async () => {
            const mockUser = {
                update: jest.fn(),
            };
            mockUserModel.findOne.mockResolvedValue(mockUser);
            bcrypt.hash.mockResolvedValue('hashedPassword');
            await service.updateUser('1', { password: '123456' }, { id: '1', role: 'admin' });
            expect(bcrypt.hash).toHaveBeenCalledWith('123456', 10);
            expect(mockUser.update).toHaveBeenCalledWith({ name: undefined, email: undefined, designation: undefined, password: 'hashedPassword' });
        });
        it('should prevent non-admin from updating role', async () => {
            const mockUser = { update: jest.fn() };
            mockUserModel.findOne.mockResolvedValue(mockUser);
            await expect(service.updateUser('1', { roleId: 2 }, { id: '1', role: 'user' })).rejects.toThrow(common_1.ForbiddenException);
        });
        it('should allow admin to update role', async () => {
            const mockUser = { update: jest.fn() };
            mockUserModel.findOne.mockResolvedValue(mockUser);
            const result = await service.updateUser('1', { roleId: 2 }, { id: '1', role: 'admin' });
            expect(mockUser.update).toHaveBeenCalledWith({ name: undefined, email: undefined, designation: undefined, roleId: 2 });
            expect(result).toEqual({ message: 'User updated successfully' });
        });
    });
    describe('searchUserByName', () => {
        const mockUserModel = { findAll: jest.fn() };
        const mockLogger = { log: jest.fn(), warn: jest.fn(), error: jest.fn() };
        beforeEach(() => {
            service = new app_service_1.AppService(mockUserModel, {}, {}, {}, {});
            service.logger = mockLogger;
        });
        afterEach(() => {
            jest.clearAllMocks();
        });
        it('should return users matching name', async () => {
            const users = [
                { id: '221CTT026', name: 'Quan', email: 'quan@test.com', designation: 'Dev' }
            ];
            mockUserModel.findAll.mockResolvedValue(users);
            const result = await service.searchUserByName('Quan');
            expect(mockUserModel.findAll).toHaveBeenCalledWith({
                where: { name: { [sequelize_1.Op.like]: '%Quan%' } },
                attributes: ['id', 'name', 'email', 'designation']
            });
            expect(result).toEqual(users);
            expect(mockLogger.log).toHaveBeenCalledWith('Search user by name: Quan');
        });
        it('should return empty array if no user found', async () => {
            mockUserModel.findAll.mockResolvedValue([]);
            const result = await service.searchUserByName('Unknown');
            expect(result).toEqual([]);
            expect(mockUserModel.findAll).toHaveBeenCalled();
        });
        it('should throw error when database fails', async () => {
            const error = new Error('DB error');
            mockUserModel.findAll.mockRejectedValue(error);
            await expect(service.searchUserByName('Quan')).rejects.toThrow('DB error');
            expect(mockLogger.error).toHaveBeenCalled();
        });
    });
});
describe('AuthGuard', () => {
    let guard;
    const mockReflector = {
        getAllAndOverride: jest.fn()
    };
    const mockJwtService = { verify: jest.fn() };
    const mockExecutionContext = (headers = {}) => {
        const request = {
            headers,
        };
        return {
            switchToHttp: () => ({ getRequest: () => request }),
            getHandler: jest.fn(),
            getClass: jest.fn(),
        };
    };
    beforeEach(() => {
        jest.clearAllMocks();
        guard = new auth_guard_1.AuthGuard(mockReflector, mockJwtService);
    });
    it('should allow access if route is public', () => {
        mockReflector.getAllAndOverride.mockReturnValue(true);
        const context = mockExecutionContext();
        const result = guard.canActivate(context);
        expect(result).toBe(true);
    });
    it('should throw UnauthorizedException if no token', () => {
        mockReflector.getAllAndOverride.mockReturnValue(false);
        const context = mockExecutionContext({});
        expect(() => guard.canActivate(context)).toThrow(new common_1.UnauthorizedException('Token required'));
    });
    it('should allow access with valid token', () => {
        mockReflector.getAllAndOverride.mockReturnValue(false);
        const user = { id: 1, role: 'admin' };
        mockJwtService.verify.mockReturnValue(user);
        const context = mockExecutionContext({
            authorization: 'Bearer validtoken',
        });
        const result = guard.canActivate(context);
        const request = context.switchToHttp().getRequest();
        expect(result).toBe(true);
        expect(request.user).toEqual(user);
        expect(mockJwtService.verify).toHaveBeenCalledWith('validtoken');
    });
    it('should throw UnauthorizedException if token invalid', () => {
        mockReflector.getAllAndOverride.mockReturnValue(false);
        mockJwtService.verify.mockImplementation(() => {
            throw new Error('Invalid token');
        });
        const context = mockExecutionContext({
            authorization: 'Bearer invalidtoken',
        });
        expect(() => guard.canActivate(context)).toThrow(new common_1.UnauthorizedException('Invalid token'));
    });
});
describe('RolesGuard', () => {
    let guard;
    const mockReflector = { getAllAndOverride: jest.fn() };
    const mockExecutionContext = (user = {}) => {
        const request = { user };
        return {
            switchToHttp: () => ({ getRequest: () => request }),
            getHandler: jest.fn(),
            getClass: jest.fn(),
        };
    };
    beforeEach(() => {
        jest.clearAllMocks();
        guard = new roles_guard_1.RolesGuard(mockReflector);
    });
    it('should allow access if no roles required', () => {
        mockReflector.getAllAndOverride.mockReturnValue(undefined);
        const context = mockExecutionContext({ role: 'user' });
        const result = guard.canActivate(context);
        expect(result).toBe(true);
    });
    it('should allow access if user has required role', () => {
        mockReflector.getAllAndOverride.mockReturnValue(['admin', 'manager']);
        const context = mockExecutionContext({ role: 'admin' });
        const result = guard.canActivate(context);
        expect(result).toBe(true);
    });
    it('should throw ForbiddenException if user does not have required role', () => {
        mockReflector.getAllAndOverride.mockReturnValue(['admin']);
        const context = mockExecutionContext({ role: 'user' });
        expect(() => guard.canActivate(context)).toThrow(new common_1.ForbiddenException('Access denied'));
    });
    it('should call reflector with correct metadata key', () => {
        mockReflector.getAllAndOverride.mockReturnValue(['admin']);
        const context = mockExecutionContext({ role: 'admin' });
        guard.canActivate(context);
        expect(mockReflector.getAllAndOverride).toHaveBeenCalledWith('roles', [context.getHandler(), context.getClass()]);
    });
});
//# sourceMappingURL=app.controller.spec.js.map