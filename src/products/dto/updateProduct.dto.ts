import { IsNotEmpty, IsNumber, IsOptional, IsPositive } from 'class-validator';

export class UpdateProductDto {
    @IsOptional()
    @IsNotEmpty()
    name: string;

    @IsOptional()
    description?: string;

    @IsOptional()
    @IsNotEmpty()
    @IsPositive()
    @IsNumber()
    price: number;
}
