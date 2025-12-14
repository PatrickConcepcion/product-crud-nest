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
        return this.productsService.create(productDto.name, productDto.price, productDto.description);
    }

    @Get(':id')
    async getProduct(@Param('id') id: number) {
        return this.productsService.getOne(id);
    }

    @Put(':id')
    async updateProduct(@Param('id') id: number, @Body() productDto: UpdateProductDto) {
        return this.productsService.update(id, productDto.name, productDto.price, productDto.description);
    }

    @Delete(':id')
    async deleteProduct(@Param('id') id: number) {
        return this.productsService.delete(id);
    }
}
