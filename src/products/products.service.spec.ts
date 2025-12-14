import { Test, TestingModule } from '@nestjs/testing';
import { ProductsService } from './products.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';

describe('ProductsService', () => {
  let service: ProductsService;
  let prisma: {
    product: {
      findMany: jest.Mock;
      count: jest.Mock;
      create: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      product: {
        findMany: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
      ],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('getAll returns paginated data', async () => {
    prisma.product.findMany.mockResolvedValue([{ id: 1 }]);
    prisma.product.count.mockResolvedValue(1);

    const res = await service.getAll(1, 10);

    expect(prisma.product.findMany).toHaveBeenCalledWith({ skip: 0, take: 10 });
    expect(prisma.product.count).toHaveBeenCalled();
    expect(res).toEqual({
      data: [{ id: 1 }],
      total: 1,
      page: 1,
      totalPages: 1,
    });
  });

  it('getOne returns product', async () => {
    prisma.product.findUnique.mockResolvedValue({ id: 1 });
    const res = await service.getOne(1);
    expect(prisma.product.findUnique).toHaveBeenCalledWith({ where: { id: 1 } });
    expect(res).toEqual({ id: 1 });
  });

  it('getOne throws when missing', async () => {
    prisma.product.findUnique.mockResolvedValue(null);
    await expect(service.getOne(99)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('create calls prisma', async () => {
    prisma.product.create.mockResolvedValue({ id: 1 });
    const res = await service.create('name', 10, 'desc');
    expect(prisma.product.create).toHaveBeenCalled();
    expect(res).toEqual({ id: 1 });
  });

  it('create sets description to null when empty', async () => {
    prisma.product.create.mockResolvedValue({ id: 1 });
    await service.create('name', 10, '');
    expect(prisma.product.create).toHaveBeenCalledWith({
      data: {
        name: 'name',
        price: 10,
        description: null,
      },
    });
  });

  it('update calls prisma', async () => {
    prisma.product.update.mockResolvedValue({ id: 1 });
    const res = await service.update(1, 'n', 10, 'd');
    expect(prisma.product.update).toHaveBeenCalled();
    expect(res).toEqual({ id: 1 });
  });

  it('update sets description to null when empty', async () => {
    prisma.product.update.mockResolvedValue({ id: 1 });
    await service.update(1, 'n', 10, '');
    expect(prisma.product.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { name: 'n', price: 10, description: null },
    });
  });

  it('update accepts negative price', async () => {
    prisma.product.update.mockResolvedValue({ id: 1 });
    await service.update(1, 'n', -10, 'd');
    expect(prisma.product.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { name: 'n', price: -10, description: 'd' },
    });
  });

  it('update throws NotFound on P2025', async () => {
    prisma.product.update.mockRejectedValue({ code: 'P2025' });
    await expect(service.update(1, 'n', 10, 'd')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('delete calls prisma', async () => {
    prisma.product.delete.mockResolvedValue({ id: 1 });
    const res = await service.delete(1);
    expect(prisma.product.delete).toHaveBeenCalledWith({ where: { id: 1 } });
    expect(res).toEqual({ id: 1 });
  });

  it('delete throws NotFound on P2025', async () => {
    prisma.product.delete.mockRejectedValue({ code: 'P2025' });
    await expect(service.delete(1)).rejects.toBeInstanceOf(NotFoundException);
  });
});
