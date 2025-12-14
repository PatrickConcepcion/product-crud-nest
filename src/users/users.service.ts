import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
    constructor(private prisma: PrismaService) {}

    async create(email: string, password: string, firstName: string, lastName: string) {
        return this.prisma.user.create({
            data: {
                firstName,
                lastName,
                email,
                password
            },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                createdAt: true,
                updatedAt: true,
            }
        });
    }

    async findByEmail(email: string) {
        return this.prisma.user.findUnique({
            where: { email }
        });
    }
}
