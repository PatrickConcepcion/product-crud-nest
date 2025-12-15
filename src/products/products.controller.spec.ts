import { Test, TestingModule } from '@nestjs/testing';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import { AuthGuard } from '../auth/auth.guard';
import { JwtService } from '@nestjs/jwt';
import { BlacklistService } from '../auth/blacklist.service';
import { PaginationDto } from './dto/pagination.dto';
import { ValidationPipe, ArgumentMetadata, BadRequestException } from '@nestjs/common';
import { CreateProductDto } from './dto/createProduct.dto';

describe('ProductsController', () => {
  let controller: ProductsController;
  let service: jest.Mocked<ProductsService>;

  beforeEach(async () => {
    const serviceMock: Partial<jest.Mocked<ProductsService>> = {
      getAll: jest.fn(),
      create: jest.fn(),
      getOne: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProductsController],
      providers: [
        {
          provide: ProductsService,
          useValue: serviceMock,
        },
        {
          provide: AuthGuard,
          useValue: { canActivate: jest.fn().mockReturnValue(true) },
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn(),
            verifyAsync: jest.fn(),
          },
        },
        {
          provide: BlacklistService,
          useValue: {
            isRevoked: jest.fn(),
            revoke: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<ProductsController>(ProductsController);
    service = module.get<ProductsService>(ProductsService) as jest.Mocked<ProductsService>;
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('getAll delegates to service', async () => {
    service.getAll.mockResolvedValue({ data: [] } as any);
    const res = await controller.getAll({ page: 1, limit: 10 } as unknown as PaginationDto);
    expect(service.getAll).toHaveBeenCalledWith(1, 10);
    expect(res).toEqual({ data: [] });
  });

  it('createProduct delegates to service', async () => {
    service.create.mockResolvedValue({ id: 1 } as any);
    const res = await controller.createProduct({ name: 'n', price: 1 } as any);
    expect(service.create).toHaveBeenCalledWith('n', 1, undefined);
    expect(res).toEqual({ message: 'Product created successfully', data: { id: 1 } });
  });

  it('getProduct delegates to service', async () => {
    service.getOne.mockResolvedValue({ id: 1 } as any);
    const res = await controller.getProduct(1 as any);
    expect(service.getOne).toHaveBeenCalledWith(1);
    expect(res).toEqual({ data: { id: 1 } });
  });

  it('updateProduct delegates to service', async () => {
    service.update.mockResolvedValue({ id: 1 } as any);
    const res = await controller.updateProduct(1 as any, { name: 'n', price: 2 } as any);
    expect(service.update).toHaveBeenCalledWith(1, 'n', 2, undefined);
    expect(res).toEqual({ message: 'Product updated successfully', data: { id: 1 } });
  });

  it('deleteProduct delegates to service', async () => {
    service.delete.mockResolvedValue({ id: 1 } as any);
    const res = await controller.deleteProduct(1 as any);
    expect(service.delete).toHaveBeenCalledWith(1);
    expect(res).toEqual({ message: 'Product deleted successfully', data: { id: 1 } });
  });

  it('rejects negative price on create via ValidationPipe', async () => {
    const pipe = new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true });
    const metadata: ArgumentMetadata = { type: 'body', metatype: CreateProductDto, data: '' };
    await expect(pipe.transform({ name: 'prod', price: -5 }, metadata)).rejects.toBeInstanceOf(BadRequestException);
    expect(service.create).not.toHaveBeenCalled();
  });
});
