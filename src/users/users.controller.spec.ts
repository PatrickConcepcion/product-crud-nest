import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { AuthGuard } from '../auth/auth.guard';
import { JwtService } from '@nestjs/jwt';
import { BlacklistService } from '../auth/blacklist.service';

describe('UsersController', () => {
  let controller: UsersController;
  let usersService: jest.Mocked<UsersService>;

  beforeEach(async () => {
    const usersServiceMock: Partial<jest.Mocked<UsersService>> = {
      getProfile: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useValue: usersServiceMock,
        },
        {
          provide: AuthGuard,
          useValue: { canActivate: jest.fn().mockReturnValue(true) },
        },
        {
           provide: JwtService, // Required by AuthGuard if not mocked completely
           useValue: {
             verifyAsync: jest.fn(),
           }
        },
        {
            provide: BlacklistService, // Required by AuthGuard
            useValue: {
                isRevoked: jest.fn(),
            }
        }
      ],
    }).compile();

    controller = module.get<UsersController>(UsersController);
    usersService = module.get<UsersService>(UsersService) as jest.Mocked<UsersService>;
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('getProfile returns profile from usersService', async () => {
    const profile = { firstName: 'First', lastName: 'Last', email: 'a@test.com' };
    usersService.getProfile.mockResolvedValue(profile);
    const res = await controller.getProfile({ user: { sub: 1 } } as any);
    expect(usersService.getProfile).toHaveBeenCalledWith(1);
    expect(res).toEqual({ user: profile });
  });
});
