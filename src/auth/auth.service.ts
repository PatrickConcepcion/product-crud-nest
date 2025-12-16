import { HttpException, Injectable, UnauthorizedException } from '@nestjs/common';
import { RegisterDto } from './dto/register.dto';
import { UsersService } from '../users/users.service';
import * as bcrypt from 'bcrypt';
import { BadRequestException } from '@nestjs/common';
import { LoginDto } from './dto/login.dto';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'crypto';
import { BlacklistService } from './blacklist.service';

const ACCESS_TOKEN_EXPIRES_IN = '15m';
const REFRESH_TOKEN_EXPIRES_IN = '7d';

@Injectable()
export class AuthService {

    constructor(
        private usersService: UsersService,
        private jwtService: JwtService,
        private blacklistService: BlacklistService,
    ) {}

    private issueAccessToken(user: { id: number; email: string }) {
        const accessPayload = {
            sub: user.id,
            email: user.email,
            jti: randomUUID(),
            tokenType: 'access',
        };
        const accessToken = this.jwtService.sign(accessPayload, { expiresIn: ACCESS_TOKEN_EXPIRES_IN });
        return { accessToken, accessPayload };
    }

    private issueRefreshToken(user: { id: number; email: string }) {
        const refreshPayload = {
            sub: user.id,
            email: user.email,
            jti: randomUUID(),
            tokenType: 'refresh',
        };
        const refreshToken = this.jwtService.sign(refreshPayload, { expiresIn: REFRESH_TOKEN_EXPIRES_IN });
        return { refreshToken, refreshPayload };
    }

    async register(registrant: RegisterDto) {
        if (!registrant) {
            throw new BadRequestException('Missing registration payload');
        }

        if (registrant.password !== registrant.confirmPassword) {
            throw new HttpException('The confirm password does not match the password', 422);
        }

        registrant.email = registrant.email.trim().toLowerCase();
        registrant.firstName = registrant.firstName.trim();
        registrant.lastName = registrant.lastName.trim();

        const exists = await this.usersService.findByEmail(registrant.email);
        
         if (exists) {
            throw new BadRequestException({
                email: ['User with this email already exists'],
            });
        }

        registrant.password = registrant.password.trim();
        registrant.password = await bcrypt.hash(registrant.password, 10);

        const data = await this.usersService.create(
            registrant.email,
            registrant.password,
            registrant.firstName,
            registrant.lastName,
        );

        if (!data) {
            throw new HttpException('Failed to register user', 500);
        }

        return { message: 'User registered successfully', data: data }
    }

    async login(user: LoginDto) {
        user.email = user.email.trim().toLowerCase();
        const existingUser = await this.usersService.findByEmail(user.email);

        if (!existingUser) {
            throw new UnauthorizedException({ email: ['Invalid email or password']});
        }

        const passwordMatches = await bcrypt.compare(user.password, existingUser.password);

        if (!passwordMatches) {
            throw new UnauthorizedException({ email: ['Invalid email or password']});
        }
        const { accessToken } = this.issueAccessToken({ id: existingUser.id, email: existingUser.email });
        const { refreshToken } = this.issueRefreshToken({ id: existingUser.id, email: existingUser.email });

        return {
            message: 'Login successful',
            data: { accessToken, refreshToken }
        }
    }

    async me(userId: number) {
        return this.usersService.getProfile(userId);
    }

    private async revokeTokenJti(jti: string | undefined, exp: number | undefined) {
        if (!jti || !exp) return;
        const now = Math.floor(Date.now() / 1000);
        const ttl = Math.max(0, exp - now);
        await this.blacklistService.revoke(jti, ttl);
    }

    async logout(accessPayload: any, refreshToken?: string) {
        if (!accessPayload?.jti || accessPayload?.tokenType !== 'access') {
            throw new HttpException('Invalid token', 401);
        }

        await this.revokeTokenJti(accessPayload.jti, accessPayload.exp);

        if (refreshToken) {
            try {
                const refreshPayload: any = await this.jwtService.verifyAsync(refreshToken, {
                    secret: process.env.JWT_SECRET,
                });
                if (refreshPayload?.tokenType === 'refresh') {
                    await this.revokeTokenJti(refreshPayload.jti, refreshPayload.exp);
                }
            } catch {
                // Ignore invalid refresh token during logout
            }
        }

        return { message: 'Logout successful' };
    }

    async refresh(refreshToken?: string) {
        if (!refreshToken) throw new HttpException('Missing refresh token', 401);

        let payload: any;
        try {
            payload = await this.jwtService.verifyAsync(refreshToken, {
                secret: process.env.JWT_SECRET,
            });
        } catch {
            throw new HttpException('Invalid refresh token', 401);
        }

        if (!payload?.sub || payload?.tokenType !== 'refresh') throw new HttpException('Invalid refresh token', 401);

        const revoked = await this.blacklistService.isRevoked(payload.jti);
        if (revoked) throw new HttpException('Token revoked', 401);

        // Rotate refresh token: revoke the old one for the remainder of its lifetime
        await this.revokeTokenJti(payload.jti, payload.exp);

        const { accessToken } = this.issueAccessToken({ id: payload.sub, email: payload.email });
        const { refreshToken: nextRefreshToken } = this.issueRefreshToken({ id: payload.sub, email: payload.email });

        return {
            message: 'Tokens refreshed',
            data: { accessToken, refreshToken: nextRefreshToken },
        };
    }
}
