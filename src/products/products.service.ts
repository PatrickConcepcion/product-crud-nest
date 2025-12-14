import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ProductsService {
    constructor(private prisma: PrismaService) {}

    async getAll(page: number, limit: number) {
        const skip = (page - 1) * limit;
        const [products, total] = await Promise.all([
            this.prisma.product.findMany({
                skip,
                take: limit,
            }),
            this.prisma.product.count(),
        ]);

        return {
            data: products,
            total,
            page,
            totalPages: Math.ceil(total / limit),
        }
    }

    async create(name: string, price: number, description?: string) {
        return this.prisma.product.create({
            data: {
                name,
                price,
                description: description || null,
            },
        });
    }

    async getOne(id: number) {
        const product = await this.prisma.product.findUnique({
            where: { id: id },
        });

        if(!product) throw new NotFoundException('Product not found');

        return product;
    }

    async update(id: number, name: string, price: number, description?: string) {
        try {
            return await this.prisma.product.update({
                where: { id: id },
                data: { name: name, price: price, description: description || null },
            });
        } catch (error: any) {
            if (error?.code === 'P2025') {
                throw new NotFoundException('Product not found');
            }
            throw error;
        }
    }

    async delete(id: number) {
        try {
            return await this.prisma.product.delete({
                where: { id: id },
            });
        } catch (error: any) {
            if (error?.code === 'P2025') {
                throw new NotFoundException('Product not found');
            }
            throw error;
        }
    }
}
