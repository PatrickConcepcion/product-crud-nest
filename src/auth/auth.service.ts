import { HttpException, Injectable, UnauthorizedException } from '@nestjs/common';
import { RegisterDto } from './dto/register.dto';
import { UsersService } from '../users/users.service';
import * as bcrypt from 'bcrypt';
import { BadRequestException } from '@nestjs/common';
import { LoginDto } from './dto/login.dto';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'crypto';
import { BlacklistService } from './blacklist.service';

const REFRESH_WINDOW_SECONDS = 7 * 24 * 60 * 60; // 7 days

@Injectable()
export class AuthService {

    constructor(
        private usersService: UsersService,
        private jwtService: JwtService,
        private blacklistService: BlacklistService,
    ) {}

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
        
        const accessPayload = { sub: existingUser.id, email: existingUser.email, jti: randomUUID() };
        const accessToken = this.jwtService.sign(accessPayload, { expiresIn: '15m' });

        return {
            message: 'Login successful',
            data: { accessToken }
        }
    }

    async logout(payload: any) {
        if (!payload?.jti) {
            throw new HttpException('Invalid token', 401);
        }
        const now = Math.floor(Date.now() / 1000);
        const ttl = Math.max(0, (payload.exp ?? now) - now);
        await this.blacklistService.revoke(payload.jti, ttl);
        return { message: 'Logout successful' };
    }

    async refresh(authHeader?: string) {
        const token = authHeader?.split(' ')[1];
        if (!token) {
            throw new HttpException('Missing token', 401);
        }

        let payload: any;
        try {
            payload = await this.jwtService.verifyAsync(token, {
                secret: process.env.JWT_SECRET,
                ignoreExpiration: true,
            });
        } catch {
            throw new HttpException('Invalid token', 401);
        }

        if (!payload?.sub) {
            throw new HttpException('Invalid token payload', 401);
        }

        const now = Math.floor(Date.now() / 1000);
        const issuedAt = payload.iat ?? payload.exp; // fallback if iat is missing
        if (!issuedAt) {
            throw new HttpException('Invalid token payload', 401);
        }

        const ageSeconds = now - issuedAt;
        if (ageSeconds > REFRESH_WINDOW_SECONDS) {
            throw new HttpException('Refresh window expired', 401);
        }

        const remainingWindow = Math.max(1, REFRESH_WINDOW_SECONDS - ageSeconds);

        // Reject if blacklisted
        const revoked = await this.blacklistService.isRevoked(payload.jti);
        if (revoked) {
            throw new HttpException('Token revoked', 401);
        }

        // If the token isn't expired yet, blacklist it to prevent reuse after refresh
        if (payload?.jti) {
            await this.blacklistService.revoke(payload.jti, remainingWindow);
        }

        const accessPayload = { sub: payload.sub, email: payload.email, jti: randomUUID() };
        const accessToken = this.jwtService.sign(accessPayload, { expiresIn: '15m' });

        return {
            message: 'Tokens refreshed',
            data: { accessToken },
        };
    }
}
