import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './controller/app.controller';
import { AppService } from './service/app.service';
import { JwtService } from '@nestjs/jwt';
import { AuthGuard } from './common/guards/auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { CacheInterceptor } from '@nestjs/cache-manager';
import { UploadService } from './service/upload.service';
import { v2 as cloudinary } from 'cloudinary';
import { BadRequestException,NotFoundException,ConflictException,ForbiddenException,UnauthorizedException,ExecutionContext,Logger} from '@nestjs/common';
import * as bcrypt from "bcrypt";
import { Reflector } from '@nestjs/core';
import { Op } from 'sequelize';
import * as fs from 'fs';

jest.mock('cloudinary', () => ({
  v2: {
    config: jest.fn(),
    uploader: {
      upload_large: jest.fn(),
    },
  },
}));

jest.mock('fs', () => ({
  existsSync: jest.fn(),
  unlinkSync: jest.fn(),
}));

describe('UploadService', () => {let service: UploadService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UploadService],
    }).compile();

    service = module.get<UploadService>(UploadService);

    (service as any).logger = {
      log: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should throw error if file missing', async () => {
    await expect(service.uploadFile(null as any)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('should upload file and return url', async () => {
    const mockFile: any = {
      size: 1000,
      originalname: 'test.jpg',
      path: 'uploads/test.jpg',
    };

    const mockUrl = 'http://cloudinary.com/test.jpg';

    (cloudinary.uploader.upload_large as jest.Mock).mockImplementation(
      (path, options, callback) => {
        callback(null, { secure_url: mockUrl });
      },
    );

    (fs.existsSync as jest.Mock).mockReturnValue(true);

    const result = await service.uploadFile(mockFile);

    expect(result).toBe(mockUrl);

    expect(cloudinary.uploader.upload_large).toHaveBeenCalled();

    expect(fs.unlinkSync).toHaveBeenCalledWith('uploads/test.jpg');
  });

  it('should reject when upload fails', async () => {
    const mockFile: any = {
      size: 1000,
      originalname: 'test.jpg',
      path: 'uploads/test.jpg',
    };

    (cloudinary.uploader.upload_large as jest.Mock).mockImplementation(
      (path, options, callback) => {
        callback(new Error('Upload failed'), null);
      },
    );

    (fs.existsSync as jest.Mock).mockReturnValue(true);

    await expect(service.uploadFile(mockFile)).rejects.toThrow();

    expect(fs.unlinkSync).toHaveBeenCalled();
  });
});

jest.mock('bcrypt', () => ({
  hash: jest.fn(),compare: jest.fn()
}));

describe('AppController', () => {
  let appController: AppController;
  let appService: any;
  let service: AppService;

  const mockService = {
    getUser: jest.fn(),
      createUser: jest.fn(),
      getByUserId: jest.fn(),
      updateUser: jest.fn(),
      deleteUser: jest.fn(),
      login: jest.fn(),
  };

  beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
          controllers: [AppController],
          providers: [
            {
              provide: AppService,
              useValue: mockService,
            },
          ],
        })
          .overrideGuard(AuthGuard)
          .useValue({
            canActivate: jest.fn(() => true),
          })
          .overrideGuard(RolesGuard)
          .useValue({
            canActivate: jest.fn(() => true),
          })
          .overrideInterceptor(CacheInterceptor)
          .useValue({
            intercept: jest.fn((context, next) => next.handle()),
          })
          .compile();

        appController = module.get<AppController>(AppController);
        appService = module.get<AppService>(AppService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getAll', () => {

    const mockCacheManager = {get: jest.fn(),set: jest.fn()};
    const mockUserModel = {findAndCountAll: jest.fn()};
    const mockLogger = {log: jest.fn(),warn: jest.fn(),error: jest.fn()};
    const mockRoleModel = {findAll: jest.fn()};
    const mockPermissionModel = {findAll: jest.fn()};
    const mockJwtService = {sign: jest.fn(),verify: jest.fn()};

    beforeEach(() => {
      service = new AppService(
        mockUserModel as any,
        mockRoleModel as any,
        mockPermissionModel as any,
        mockCacheManager as any,
        mockJwtService as any,
        mockLogger as any
      );
      (service as any).logger = mockLogger;
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

      const mockRows = [{get: () => ({ id: '221CTT026', name: 'Quan' })}];

      mockUserModel.findAndCountAll.mockResolvedValue({count: 1,rows: mockRows});

      const result = await service.getUser(1, 5);

      expect(mockUserModel.findAndCountAll).toHaveBeenCalled();

      expect(result).toEqual({totalUsers: 1,currentPage: 1,totalPages: 1,users: [{ id: '221CTT026', name: 'Quan' }]});

      expect(mockCacheManager.set).toHaveBeenCalledWith('users_page_1_limit_5',result,60000);
    });

    it('should calculate offset correctly', async () => {
      mockCacheManager.get.mockResolvedValue(null);

      mockUserModel.findAndCountAll.mockResolvedValue({count: 10,rows: []});

      await service.getUser(2, 5);

      expect(mockUserModel.findAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({limit: 5, offset: 5})
      );
    });
  });

  describe('login', () => {
    const mockCacheManager = { get: jest.fn(), set: jest.fn() };
    const mockUserModel = { findOne: jest.fn() };
    const mockLogger = { log: jest.fn(), warn: jest.fn(), error: jest.fn() };
    const mockJwtService = {sign: jest.fn(),verify: jest.fn()};

    beforeEach(() => {
      jest.clearAllMocks();

      service = new AppService(mockUserModel as any,
      {} as any,
      {} as any,
      mockCacheManager as any,
      mockJwtService as any,
      mockLogger as any);
      (service as any).logger = mockLogger;
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

      expect(mockCacheManager.set).toHaveBeenCalledWith(
        'user_221CTT026',
        user,
        60000
      );

      expect(result).toEqual(user);
    });

    it('should throw NotFoundException when user not found', async () => {
      mockCacheManager.get.mockResolvedValue(null);
      mockUserModel.findOne.mockResolvedValue(null);

      try {
        await service.getByUserId('999');
      } catch (error) {
        expect(error).toBeInstanceOf(NotFoundException);
      }
    });
  });

  describe('getByUserId', () => {
    const mockCacheManager = {get: jest.fn(),set: jest.fn()};
    const mockUserModel = {findOne: jest.fn()};
    const mockLogger = {log: jest.fn(),warn: jest.fn(),error: jest.fn()};
    const mockJwtService = {sign: jest.fn(),verify: jest.fn()};

    beforeEach(() => {
      jest.clearAllMocks();
      service = new AppService(
        mockUserModel as any,
      {} as any,
      {} as any,
      mockCacheManager as any,
      mockJwtService as any,
      mockLogger as any
    );
      (service as any).logger = mockLogger;;
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

      expect(mockCacheManager.set).toHaveBeenCalledWith('user_221CTT026',user,60000);

      expect(result).toEqual(user);
    });

    it('should throw NotFoundException when user not found', async () => {
      mockCacheManager.get.mockResolvedValue(null);
      mockUserModel.findOne.mockResolvedValue(null);

      await expect(service.getByUserId('999')).rejects.toBeInstanceOf(NotFoundException);

      expect(mockUserModel.findOne).toHaveBeenCalledWith({where: { id: '999' },attributes: { exclude: ['password']}
    });
  });
  });

  describe('create', () => {
    let service: AppService;
    const mockUserModel = {findOne: jest.fn(),create: jest.fn()};
    const mockLogger = {log: jest.fn(),warn: jest.fn(),error: jest.fn()};
    const mockCacheManager = {get: jest.fn(),set: jest.fn()};
    const mockJwtService = {sign: jest.fn(),verify: jest.fn()};

    beforeEach(() => {
      service = new AppService(
        mockUserModel as any,
        {} as any,
        {} as any,
        mockCacheManager as any,
        mockJwtService as any,
        mockLogger as any
      );

      (service as any).logger = mockLogger;;
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    it('should create user successfully', async () => {
      const dto = {name: 'Quan',email: 'q@gmail.com',password: '123'};

      const hashedPassword = 'hashedPassword';
      const userId = '221CTT026';

      (bcrypt.hash as jest.Mock).mockResolvedValue(hashedPassword);

      jest.spyOn(service, 'generateUserId').mockResolvedValue(userId);

      mockUserModel.findOne.mockResolvedValue(null);

      const createdUser = {id: userId,name: 'Quan',email: 'q@gmail.com',password: hashedPassword};

      mockUserModel.create.mockResolvedValue(createdUser);

      const result = await service.createUser(dto as any);

      expect(bcrypt.hash).toHaveBeenCalledWith('123', 10);

      expect(mockUserModel.create).toHaveBeenCalledWith({
        ...dto,
        password: hashedPassword,
        id: userId,
      });

      expect(result).toEqual(createdUser);
    });

    it('should throw ConflictException if email already exists', async () => {
      const dto = {name: 'Quan',email: 'q@gmail.com',password: '123'};

      mockUserModel.findOne.mockResolvedValue({ id: '221CTT025' });

      await expect(service.createUser(dto as any)).rejects.toThrow(ConflictException);

      expect(mockUserModel.create).not.toHaveBeenCalled();
    });
  });

  describe('updateUser', () => {
    let service: AppService;
    const mockUserModel = {findOne: jest.fn()};
    const mockCacheManager = {del: jest.fn()};
    const mockLogger = {log: jest.fn(),warn: jest.fn(),error: jest.fn()};
    const mockJwtService = {sign: jest.fn(),verify: jest.fn()};

    beforeEach(() => {
      jest.clearAllMocks();

      service = new AppService(
        mockUserModel as any,
        {} as any,
        {} as any,
        mockCacheManager as any,
        mockJwtService as any,
        mockLogger as any
      );
      (service as any).logger = mockLogger;;
    });

    it('should update user successfully', async () => {
      const id = '1';
      const dto = {name: 'Updated Name',email: 'updated@mail.com'};
      const currentUser = {id: '1',role: 'admin'};
      const mockUser = {update: jest.fn()};

      mockUserModel.findOne.mockResolvedValue(mockUser);

      const result = await service.updateUser(id, dto as any, currentUser);
      expect(mockUserModel.findOne).toHaveBeenCalledWith({where: { id: '1' }});
      expect(mockUser.update).toHaveBeenCalledWith({name: dto.name,email: dto.email,designation: undefined});
      expect(mockCacheManager.del).toHaveBeenCalledWith('user_1');
      expect(result).toEqual({message: 'User updated successfully'});
    });

    it('should throw NotFoundException if user not found', async () => {
      mockUserModel.findOne.mockResolvedValue(null);
      await expect(service.updateUser('1', {} as any, { id: '1', role: 'admin' })).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if user tries to update another profile', async () => {
      const mockUser = {update: jest.fn()};
      mockUserModel.findOne.mockResolvedValue(mockUser);
      const currentUser = {id: '2',role: 'user'};

      await expect(
        service.updateUser('1', {} as any, currentUser)
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow manager to update other users', async () => {
      const mockUser = {
        update: jest.fn(),
      };

      mockUserModel.findOne.mockResolvedValue(mockUser);

      const currentUser = {id: '2',role: 'manager'};

      const result = await service.updateUser('1',{ name: 'Manager Update' } as any,currentUser);

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

      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedPassword');

      await service.updateUser('1',{ password: '123456' } as any,{ id: '1', role: 'admin' });

      expect(bcrypt.hash).toHaveBeenCalledWith('123456', 10);

      expect(mockUser.update).toHaveBeenCalledWith({name: undefined,email: undefined,designation: undefined,password: 'hashedPassword'});
    });

    it('should prevent non-admin from updating role', async () => {const mockUser = {update: jest.fn()};

      mockUserModel.findOne.mockResolvedValue(mockUser);

      await expect(service.updateUser('1',{ roleId: 2 } as any,{ id: '1', role: 'user' })).rejects.toThrow(ForbiddenException);
    });

    it('should allow admin to update role', async () => {const mockUser = {update: jest.fn()};

      mockUserModel.findOne.mockResolvedValue(mockUser);

      const result = await service.updateUser('1',{ roleId: 2 } as any,{ id: '1', role: 'admin' });

      expect(mockUser.update).toHaveBeenCalledWith({name: undefined,email: undefined,designation: undefined,roleId: 2});

      expect(result).toEqual({message: 'User updated successfully'});
    });
  });

  describe('searchUserByName', () => {
    const mockUserModel = {findAll: jest.fn()};
    const mockCacheManager = {del: jest.fn()};
    const mockLogger = {log: jest.fn(),warn: jest.fn(),error: jest.fn()};
    const mockJwtService = {sign: jest.fn(),verify: jest.fn()};

    beforeEach(() => {
      service = new AppService(
        mockUserModel as any,
        {} as any,
        {} as any,
        {} as any,
        mockJwtService as any,
        mockLogger as any
      );
      (service as any).logger = mockLogger;
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
        where: { name: { [Op.like]: '%Quan%' } },
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
  let guard: AuthGuard;
  const mockReflector = {
    getAllAndOverride: jest.fn()};

  const mockJwtService = {verify: jest.fn()};

  const mockExecutionContext = (headers = {}) => {
  const request = {
    headers,
  };

  return {
    switchToHttp: () => ({getRequest: () => request}),
    getHandler: jest.fn(),
    getClass: jest.fn(),
  } as unknown as ExecutionContext;
};

  beforeEach(() => {
    jest.clearAllMocks();
    guard = new AuthGuard(mockReflector as any, mockJwtService as any);
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

    expect(() => guard.canActivate(context)).toThrow(new UnauthorizedException('Token required'));
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

    expect(() => guard.canActivate(context)).toThrow(
      new UnauthorizedException('Invalid token'),
    );
  });
});

describe('RolesGuard', () => {
  let guard: RolesGuard;

  const mockReflector = {getAllAndOverride: jest.fn()};

  const mockExecutionContext = (user: any = {}) => {
    const request = { user };

    return {
      switchToHttp: () => ({getRequest: () => request}),
      getHandler: jest.fn(),
      getClass: jest.fn(),
    } as unknown as ExecutionContext;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    guard = new RolesGuard(mockReflector as any);
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

    expect(() => guard.canActivate(context)).toThrow(new ForbiddenException('Access denied'));
  });

  it('should call reflector with correct metadata key', () => {
    mockReflector.getAllAndOverride.mockReturnValue(['admin']);

    const context = mockExecutionContext({ role: 'admin' });

    guard.canActivate(context);

    expect(mockReflector.getAllAndOverride).toHaveBeenCalledWith('roles', [context.getHandler(),context.getClass()]);
  });
});

describe('createProduct', () => {
  let service: AppService;

  const mockProductModel = {findOne: jest.fn(),create: jest.fn()};
  const mockCacheManager = {del: jest.fn()};
  const mockLogger = {log: jest.fn(),warn: jest.fn(),error: jest.fn()};
  

  beforeEach(() => {
    service = new AppService({} as any,{} as any,{} as any,mockCacheManager as any,{} as any,mockProductModel as any);
    (service as any).productModel = mockProductModel;
    (service as any).logger = mockLogger;

    jest.clearAllMocks();
  });

  const mockDto = {
    name: 'Laptop',
    unit: 'pcs',
    price: 1000,
    origin: 'USA',
    note: 'Gaming laptop',
  };

  it('should create product successfully', async () => {
    const createdProduct = { id: 1, ...mockDto };

    mockProductModel.findOne.mockResolvedValue(null);
    mockProductModel.create.mockResolvedValue(createdProduct);

    const result = await service.createProduct(mockDto as any);

    expect(mockProductModel.findOne).toHaveBeenCalledWith({
      where: { name: 'Laptop' },
    });

    expect(mockProductModel.create).toHaveBeenCalled();

    expect(mockCacheManager.del).toHaveBeenCalledWith('product_1');
    expect(mockCacheManager.del).toHaveBeenCalledWith('products_all');

    expect(result).toEqual(createdProduct);
  });

  it('should throw ConflictException if product exists', async () => {
    mockProductModel.findOne.mockResolvedValue({ id: 1 });

    await expect(service.createProduct(mockDto as any)).rejects.toThrow(
      ConflictException,
    );

    expect(mockLogger.warn).toHaveBeenCalled();
  });

  it('should invalidate cache after creating product', async () => {
    const createdProduct = { id: 2, ...mockDto };

    mockProductModel.findOne.mockResolvedValue(null);
    mockProductModel.create.mockResolvedValue(createdProduct);

    await service.createProduct(mockDto as any);

    expect(mockCacheManager.del).toHaveBeenCalledWith('product_2');
    expect(mockCacheManager.del).toHaveBeenCalledWith('products_all');
  });

  it('should throw error when database fails', async () => {
    mockProductModel.findOne.mockResolvedValue(null);
    mockProductModel.create.mockRejectedValue(new Error('DB error'));

    await expect(service.createProduct(mockDto as any)).rejects.toThrow(
      'DB error',
    );
  });
});

