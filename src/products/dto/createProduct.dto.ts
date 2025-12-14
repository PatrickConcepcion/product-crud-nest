import { IsNotEmpty, IsOptional } from 'class-validator';

export class CreateProductDto {
    @IsNotEmpty()
    name: string;

    @IsOptional()
    description?: string;

    @IsNotEmpty()
    price: number;
}
