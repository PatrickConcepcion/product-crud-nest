import { Body, Controller, Post, Get, Req, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { AuthGuard } from './auth.guard';

@Controller('auth')
export class AuthController {

    constructor(private readonly authService: AuthService) {}

    @Post('register')
    async register(@Body() registerDto: RegisterDto) {
        return this.authService.register(registerDto);
    }

    @Post('login')
    async login(@Body() loginDto: LoginDto) {
        return this.authService.login(loginDto);
    }

    @Post('refresh')
    async refresh(@Req() req) {
        return this.authService.refresh(req.headers.authorization);
    }

    @UseGuards(AuthGuard)
    @Post('logout')
    async logout(@Req() req) {
        return this.authService.logout(req.user);
    }

    @UseGuards(AuthGuard)
    @Get('me')
    async me(@Req() req) {
        return { user: req.user };
    }
}
