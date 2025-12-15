import { Body, Controller, Get, Param, Post, Put, Delete, Query, UseGuards } from '@nestjs/common';
import { CreateProductDto } from './dto/createProduct.dto';
import { UpdateProductDto } from './dto/updateProduct.dto';
import { ProductsService } from './products.service';
import { AuthGuard } from '../auth/auth.guard';
import { PaginationDto } from './dto/pagination.dto';

@UseGuards(AuthGuard)
@Controller('products')
export class ProductsController {

    constructor(private readonly productsService: ProductsService) {}

    @Get()
    async getAll(@Query() query: PaginationDto) {
        return this.productsService.getAll(query.page, query.limit);
    }

    @Post()
    async createProduct(@Body() productDto: CreateProductDto) {
        const product = await this.productsService.create(productDto.name, productDto.price, productDto.description);
        return { message: 'Product created successfully', data: product };
    }

    @Get(':id')
    async getProduct(@Param('id') id: number) {
        const product = await this.productsService.getOne(id);
        return { data: product };
    }

    @Put(':id')
    async updateProduct(@Param('id') id: number, @Body() productDto: UpdateProductDto) {
        const product = await this.productsService.update(id, productDto.name, productDto.price, productDto.description);
        return { message: 'Product updated successfully', data: product };
    }

    @Delete(':id')
    async deleteProduct(@Param('id') id: number) {
        const product = await this.productsService.delete(id);
        return { message: 'Product deleted successfully', data: product };
    }
}
