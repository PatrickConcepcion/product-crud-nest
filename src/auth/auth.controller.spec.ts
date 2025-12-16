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
    authService.login.mockResolvedValue({
      message: 'ok',
      data: { accessToken: 'access', refreshToken: 'refresh' },
    } as Awaited<ReturnType<AuthService['login']>>);
    const dto: LoginDto = { email: '', password: '' };
    const resMock = { cookie: jest.fn() } as any;
    const res = await controller.login(dto, resMock);
    expect(authService.login).toHaveBeenCalled();
    expect(resMock.cookie).toHaveBeenCalledWith('access_token', 'access', expect.any(Object));
    expect(resMock.cookie).toHaveBeenCalledWith('refresh_token', 'refresh', expect.any(Object));
    expect(res).toEqual({ message: 'ok' });
  });

  it('refresh delegates to service', async () => {
    authService.refresh.mockResolvedValue({
      message: 'ok',
      data: { accessToken: 'new-access', refreshToken: 'new-refresh' },
    } as Awaited<ReturnType<AuthService['refresh']>>);
    const req: { headers: { cookie: string } } = { headers: { cookie: 'refresh_token=refresh' } };
    const resMock = { cookie: jest.fn() } as any;
    const res = await controller.refresh(req as any, resMock);
    expect(authService.refresh).toHaveBeenCalledWith('refresh');
    expect(resMock.cookie).toHaveBeenCalledWith('access_token', 'new-access', expect.any(Object));
    expect(resMock.cookie).toHaveBeenCalledWith('refresh_token', 'new-refresh', expect.any(Object));
    expect(res).toEqual({ message: 'ok' });
  });

  it('logout delegates to service', async () => {
    const response = { message: 'ok' } as Awaited<ReturnType<AuthService['logout']>>;
    authService.logout.mockResolvedValue(response);
    const req: { user: { sub: number }; headers: { cookie: string } } = {
      user: { sub: 1 },
      headers: { cookie: 'refresh_token=refresh' },
    };
    const resMock = { clearCookie: jest.fn() } as any;
    const res = await controller.logout(req as any, resMock);
    expect(authService.logout).toHaveBeenCalledWith({ sub: 1 }, 'refresh');
    expect(resMock.clearCookie).toHaveBeenCalledWith('access_token', expect.any(Object));
    expect(resMock.clearCookie).toHaveBeenCalledWith('refresh_token', expect.any(Object));
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
