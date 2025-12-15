import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuthGuard } from './auth.guard';
import { JwtService } from '@nestjs/jwt';
import { BlacklistService } from './blacklist.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { UsersService } from '../users/users.service';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: jest.Mocked<AuthService>;
  let usersService: jest.Mocked<UsersService>;

  beforeEach(async () => {
    const authServiceMock: Partial<jest.Mocked<AuthService>> = {
      register: jest.fn(),
      login: jest.fn(),
      refresh: jest.fn(),
      logout: jest.fn(),
    };
    const usersServiceMock: Partial<jest.Mocked<UsersService>> = {
      getProfile: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: authServiceMock,
        },
        {
          provide: UsersService,
          useValue: usersServiceMock,
        },
        {
          provide: AuthGuard,
          useValue: { canActivate: jest.fn().mockReturnValue(true) },
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn(),
            verifyAsync: jest.fn(),
          },
        },
        {
          provide: BlacklistService,
          useValue: {
            isRevoked: jest.fn(),
            revoke: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(AuthService) as jest.Mocked<AuthService>;
    usersService = module.get<UsersService>(UsersService) as jest.Mocked<UsersService>;
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('register delegates to service', async () => {
    const response = { message: 'ok' } as Awaited<ReturnType<AuthService['register']>>;
    authService.register.mockResolvedValue(response);
    const dto: RegisterDto = { email: '', password: '', confirmPassword: '', firstName: '', lastName: '' };
    const res = await controller.register(dto);
    expect(authService.register).toHaveBeenCalled();
    expect(res).toEqual(response);
  });

  it('login delegates to service', async () => {
    const response = { message: 'ok' } as Awaited<ReturnType<AuthService['login']>>;
    authService.login.mockResolvedValue(response);
    const dto: LoginDto = { email: '', password: '' };
    const res = await controller.login(dto);
    expect(authService.login).toHaveBeenCalled();
    expect(res).toEqual(response);
  });

  it('refresh delegates to service', async () => {
    const response = { message: 'ok' } as Awaited<ReturnType<AuthService['refresh']>>;
    authService.refresh.mockResolvedValue(response);
    const req: { headers: { authorization: string } } = { headers: { authorization: 'Bearer token' } };
    const res = await controller.refresh(req);
    expect(authService.refresh).toHaveBeenCalledWith('Bearer token');
    expect(res).toEqual(response);
  });

  it('logout delegates to service', async () => {
    const response = { message: 'ok' } as Awaited<ReturnType<AuthService['logout']>>;
    authService.logout.mockResolvedValue(response);
    const req: { user: { sub: number } } = { user: { sub: 1 } };
    const res = await controller.logout(req);
    expect(authService.logout).toHaveBeenCalledWith({ sub: 1 });
    expect(res).toEqual(response);
  });

  it('me returns profile from authService', async () => {
    const profile = { id: 1, firstName: 'First', lastName: 'Last', email: 'a@test.com' };
    authService.me = jest.fn().mockResolvedValue(profile);
    const res = await controller.me({ user: { sub: 1 } } as any);
    expect(authService.me).toHaveBeenCalledWith(1);
    expect(res).toEqual({ user: profile });
  });
});
