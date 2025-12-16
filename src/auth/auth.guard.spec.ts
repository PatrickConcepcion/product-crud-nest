import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthGuard } from './auth.guard';
import { BlacklistService } from './blacklist.service';
import { ExecutionContext } from '@nestjs/common';

describe('AuthGuard', () => {
  let guard: AuthGuard;
  let jwtService: jest.Mocked<JwtService>;
  let blacklistService: jest.Mocked<BlacklistService>;

  const makeContext = (req: { headers?: Record<string, string>; user?: unknown; token?: string }): ExecutionContext =>
    ({
      switchToHttp: () => ({
        getRequest: () => req,
      }),
    }) as unknown as ExecutionContext;

  beforeEach(() => {
    jwtService = {
      verifyAsync: jest.fn(),
    } as unknown as jest.Mocked<JwtService>;

    blacklistService = {
      isRevoked: jest.fn(),
      revoke: jest.fn(),
    } as unknown as jest.Mocked<BlacklistService>;

    guard = new AuthGuard(jwtService, blacklistService);
  });

  it('throws when token is missing', async () => {
    const ctx = makeContext({ headers: {} });
    await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('throws when token is revoked', async () => {
    const ctx = makeContext({ headers: { authorization: 'Bearer token' } });
    jwtService.verifyAsync.mockResolvedValue({ jti: 'jti', sub: 1, tokenType: 'access' });
    blacklistService.isRevoked.mockResolvedValue(true);

    await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('allows when token is valid', async () => {
    const req: { headers: Record<string, string>; user?: unknown; token?: string } = {
      headers: { authorization: 'Bearer token' },
    };
    const ctx = makeContext(req);
    jwtService.verifyAsync.mockResolvedValue({ jti: 'jti', sub: 1, tokenType: 'access' });
    blacklistService.isRevoked.mockResolvedValue(false);

    const result = await guard.canActivate(ctx);

    expect(result).toBe(true);
    expect(req.user).toEqual({ jti: 'jti', sub: 1, tokenType: 'access' });
    expect(req.token).toBe('token');
  });

  it('reads token from access_token cookie', async () => {
    const req: { headers: Record<string, string>; user?: unknown; token?: string } = {
      headers: { cookie: 'access_token=cookie-token' },
    };
    const ctx = makeContext(req);
    jwtService.verifyAsync.mockResolvedValue({ jti: 'jti', sub: 1, tokenType: 'access' });
    blacklistService.isRevoked.mockResolvedValue(false);

    const result = await guard.canActivate(ctx);

    expect(result).toBe(true);
    expect(req.token).toBe('cookie-token');
  });
});
