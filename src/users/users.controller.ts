import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { AuthGuard } from '../auth/auth.guard';

@Controller('users')
export class UsersController {
    constructor(private readonly usersService: UsersService) {}

    @UseGuards(AuthGuard)
    @Get('me')
    async getProfile(@Req() req) {
        const user = await this.usersService.getProfile(req.user.sub);
        return { user };
    }
}
