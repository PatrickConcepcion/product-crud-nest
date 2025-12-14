import { IsNotEmpty, IsOptional } from 'class-validator';

export class UpdateProductDto {
    @IsNotEmpty()
    name: string;

    @IsOptional()
    description?: string;

    @IsNotEmpty()
    price: number;
}
