import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './controller/app.controller';
import { AppService } from './app.service';
import { JwtService } from '@nestjs/jwt';
import { AuthGuard } from './guards/auth.guard';
import { RolesGuard } from './guards/roles.guard';

  describe('AppController', () => {
  let appController: AppController;
  let appService: any;

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
    .compile();

    appController = module.get<AppController>(AppController);
    appService = module.get<AppService>(AppService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getAll', () => {
    it('should return users with pagination', async () => {
      const result = {
        data: [{ id: "221CTT026", name: 'Quan' }],
        total: 1,
      };

      appService.getUser.mockResolvedValue(result);

      const res = await appController.getAll(1, 5);

      expect(res).toEqual(result);
      expect(appService.getUser).toHaveBeenCalledWith(1, 5);
    });
  });

  describe('login', () => {
    it('should return token', async () => {
      const dto = { email: 'test@gmail.com', password: '123' };
      const result = { access_token: 'abc123' };

      appService.login.mockResolvedValue(result);

      const res = await appController.login(dto as any);

      expect(res).toEqual(result);
      expect(appService.login).toHaveBeenCalledWith(dto);
    });
  });

  describe('getOne', () => {
    it('should return one user', async () => {
      const result = { id: '221CTT026', name: 'Quan' };

      appService.getByUserId.mockResolvedValue(result);

      const res = await appController.getOne('1');

      expect(res).toEqual(result);
      expect(appService.getByUserId).toHaveBeenCalledWith('1');
    });
  });

  describe('create', () => {
    it('should create user', async () => {
      const dto = { name: 'Quan', email: 'q@gmail.com', password: '123' };
      const result = { id: 1, ...dto };

      appService.createUser.mockResolvedValue(result);

      const res = await appController.create(dto as any);

      expect(res).toEqual(result);
      expect(appService.createUser).toHaveBeenCalledWith(dto);
    });
  });

  describe('updateUser', () => {
    it('should update user', async () => {
      const dto = { name: 'Updated' };
      const req = { user: { id: 1, role: 'admin' } };

      appService.updateUser.mockResolvedValue('updated');

      const res = await appController.updateUser('1', dto as any, req);

      expect(res).toBe('updated');
      expect(appService.updateUser).toHaveBeenCalledWith('1', dto, req.user);
    });
  });
  
});