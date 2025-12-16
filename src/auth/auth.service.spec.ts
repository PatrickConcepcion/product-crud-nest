jest.mock('bcrypt', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

import { HttpException, BadRequestException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { BlacklistService } from './blacklist.service';
import * as bcrypt from 'bcrypt';

describe('AuthService', () => {
  let authService: AuthService;
  let usersService: jest.Mocked<UsersService>;
  let jwtService: jest.Mocked<JwtService>;
  let blacklistService: jest.Mocked<BlacklistService>;

  beforeEach(() => {
    usersService = {
      findByEmail: jest.fn(),
      create: jest.fn(),
      getProfile: jest.fn(),
    } as unknown as jest.Mocked<UsersService>;

    jwtService = {
      sign: jest.fn(),
      verifyAsync: jest.fn(),
    } as unknown as jest.Mocked<JwtService>;

    blacklistService = {
      revoke: jest.fn(),
      isRevoked: jest.fn(),
    } as unknown as jest.Mocked<BlacklistService>;

    authService = new AuthService(usersService, jwtService, blacklistService);
  });

  describe('register', () => {
    it('registers a new user', async () => {
      usersService.findByEmail.mockResolvedValue(null);
      usersService.create.mockResolvedValue({
        id: 1,
        firstName: 'First',
        lastName: 'Last',
        email: 'user@test.com',
        createdAt: new Date(),
        updatedAt: new Date(),
      } as Awaited<ReturnType<UsersService['create']>>);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedpw');

      const result = await authService.register({
        email: 'User@Test.com',
        password: 'secret123',
        confirmPassword: 'secret123',
        firstName: 'First',
        lastName: 'Last',
      });

      expect(usersService.findByEmail).toHaveBeenCalledWith('user@test.com');
      expect(usersService.create).toHaveBeenCalledWith('user@test.com', 'hashedpw', 'First', 'Last');
      expect(result.data).toMatchObject({ id: 1, email: 'user@test.com' });
    });

    it('throws when passwords do not match', async () => {
      await expect(
        authService.register({
          email: 'user@test.com',
          password: 'one',
          confirmPassword: 'two',
          firstName: 'First',
          lastName: 'Last',
        }),
      ).rejects.toBeInstanceOf(HttpException);
    });

    it('throws when user already exists', async () => {
      usersService.findByEmail.mockResolvedValue({
        id: 1,
        firstName: 'First',
        lastName: 'Last',
        email: 'user@test.com',
        password: 'hashedpw',
        createdAt: new Date(),
        updatedAt: new Date(),
      } as Awaited<ReturnType<UsersService['findByEmail']>>);

      await expect(
        authService.register({
          email: 'user@test.com',
          password: 'secret123',
          confirmPassword: 'secret123',
          firstName: 'First',
          lastName: 'Last',
        }),
      ).rejects.toBeInstanceOf(HttpException);
    });
  });

  describe('login', () => {
    it('returns access token on success', async () => {
      usersService.findByEmail.mockResolvedValue({
        id: 1,
        firstName: 'First',
        lastName: 'Last',
        email: 'user@test.com',
        password: 'hashed',
        createdAt: new Date(),
        updatedAt: new Date(),
      } as Awaited<ReturnType<UsersService['findByEmail']>>);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      jwtService.sign.mockReturnValueOnce('access-token').mockReturnValueOnce('refresh-token');

      const res = await authService.login({ email: 'user@test.com', password: 'secret123' });

      expect(res.data.accessToken).toBe('access-token');
      expect(res.data.refreshToken).toBe('refresh-token');
      expect(jwtService.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          sub: 1,
          email: 'user@test.com',
        }),
        expect.any(Object),
      );
    });

    it('throws on unknown user', async () => {
      usersService.findByEmail.mockResolvedValue(null);
      await expect(authService.login({ email: 'missing@test.com', password: 'pw' })).rejects.toBeInstanceOf(HttpException);
    });

    it('throws on bad password', async () => {
      usersService.findByEmail.mockResolvedValue({
        id: 1,
        firstName: 'First',
        lastName: 'Last',
        email: 'user@test.com',
        password: 'hashed',
        createdAt: new Date(),
        updatedAt: new Date(),
      } as Awaited<ReturnType<UsersService['findByEmail']>>);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);
      await expect(authService.login({ email: 'user@test.com', password: 'bad' })).rejects.toBeInstanceOf(HttpException);
    });
  });

  describe('refresh', () => {
    const exp = Math.floor(Date.now() / 1000) + 60;
    const basePayload = { sub: 1, email: 'user@test.com', jti: 'old', exp, tokenType: 'refresh' };

    it('issues new tokens when refresh token is valid', async () => {
      jwtService.verifyAsync.mockResolvedValue(basePayload as any);
      blacklistService.isRevoked.mockResolvedValue(false);
      jwtService.sign.mockReturnValueOnce('new-access').mockReturnValueOnce('new-refresh');

      const res = await authService.refresh('refresh-token');

      expect(res.data.accessToken).toBe('new-access');
      expect(res.data.refreshToken).toBe('new-refresh');
      expect(blacklistService.revoke).toHaveBeenCalledWith('old', expect.any(Number));
    });

    it('rejects revoked token', async () => {
      jwtService.verifyAsync.mockResolvedValue(basePayload as any);
      blacklistService.isRevoked.mockResolvedValue(true);

      await expect(authService.refresh('refresh-token')).rejects.toBeInstanceOf(HttpException);
    });

    it('rejects when token missing', async () => {
      await expect(authService.refresh(undefined)).rejects.toBeInstanceOf(HttpException);
    });
  });

  describe('logout', () => {
    it('blacklists current token', async () => {
      const exp = Math.floor(Date.now() / 1000) + 60;
      await authService.logout({ jti: 'jti', exp, tokenType: 'access' });
      expect(blacklistService.revoke).toHaveBeenCalledWith('jti', expect.any(Number));
    });

    it('throws when payload missing jti', async () => {
      await expect(authService.logout({})).rejects.toBeInstanceOf(HttpException);
    });

    it('also blacklists refresh token when provided', async () => {
      const exp = Math.floor(Date.now() / 1000) + 60;
      jwtService.verifyAsync.mockResolvedValue({ jti: 'refresh-jti', exp, tokenType: 'refresh' } as any);

      await authService.logout({ jti: 'access-jti', exp, tokenType: 'access' }, 'refresh-token');

      expect(blacklistService.revoke).toHaveBeenCalledWith('access-jti', expect.any(Number));
      expect(blacklistService.revoke).toHaveBeenCalledWith('refresh-jti', expect.any(Number));
    });
  });
});
