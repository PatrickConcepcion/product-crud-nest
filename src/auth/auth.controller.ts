import { Body, Controller, Post, Get, Req, Res, UseGuards } from '@nestjs/common';
import type { CookieOptions, Response } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { AuthGuard } from './auth.guard';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';

@Controller('auth')
export class AuthController {

    constructor(private readonly authService: AuthService) {}

    private getCookie(req: any, name: string): string | undefined {
        const header = req?.headers?.cookie as string | undefined;
        if (!header) return undefined;
        const cookies = header.split(';').map((c) => c.trim());
        for (const cookie of cookies) {
            const [k, ...rest] = cookie.split('=');
            if (k === name) return decodeURIComponent(rest.join('='));
        }
        return undefined;
    }

    private cookieOptions(): { access: CookieOptions; refresh: CookieOptions } {
        const isProd = process.env.NODE_ENV === 'production';
        const sameSite = (process.env.COOKIE_SAMESITE as CookieOptions['sameSite']) ?? 'lax';
        return {
            access: {
                httpOnly: true,
                secure: isProd,
                sameSite,
                maxAge: 15 * 60 * 1000,
                path: '/',
            },
            refresh: {
                httpOnly: true,
                secure: isProd,
                sameSite,
                maxAge: 7 * 24 * 60 * 60 * 1000,
                path: '/auth',
            },
        };
    }

    @Post('register')
    async register(@Body() registerDto: RegisterDto) {
        return this.authService.register(registerDto);
    }

    @UseGuards(ThrottlerGuard)
    @Throttle({ default: { limit: 5, ttl: 60000 } })
    @Post('login')
    async login(@Body() loginDto: LoginDto, @Res({ passthrough: true }) res: Response) {
        const result = await this.authService.login(loginDto);
        const tokens = result?.data;
        if (tokens?.accessToken) res.cookie('access_token', tokens.accessToken, this.cookieOptions().access);
        if (tokens?.refreshToken) res.cookie('refresh_token', tokens.refreshToken, this.cookieOptions().refresh);
        return { message: result.message };
    }

    @Post('refresh')
    async refresh(@Req() req, @Res({ passthrough: true }) res: Response) {
        const refreshToken = this.getCookie(req, 'refresh_token');
        const result = await this.authService.refresh(refreshToken);
        const tokens = result?.data;
        if (tokens?.accessToken) res.cookie('access_token', tokens.accessToken, this.cookieOptions().access);
        if (tokens?.refreshToken) res.cookie('refresh_token', tokens.refreshToken, this.cookieOptions().refresh);
        return { message: result.message };
    }

    @UseGuards(AuthGuard)
    @Post('logout')
    async logout(@Req() req, @Res({ passthrough: true }) res: Response) {
        const refreshToken = this.getCookie(req, 'refresh_token');
        const result = await this.authService.logout(req.user, refreshToken);
        res.clearCookie('access_token', this.cookieOptions().access);
        res.clearCookie('refresh_token', this.cookieOptions().refresh);
        return result;
    }

    @UseGuards(AuthGuard)
    @Get('me')
    async me(@Req() req) {
        const user = await this.authService.me(req.user.sub);
        return { user };
    }
}
