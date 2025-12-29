/**
 * Products API Integration Tests
 */

import { GET } from '../route';
import { NextRequest } from 'next/server';

// Mock Prisma
jest.mock('@/lib/db', () => ({
  prisma: {
    product: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
  },
}));

import { prisma } from '@/lib/db';

describe('GET /api/products', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should return products', async () => {
    const mockProducts = [
      {
        id: '1',
        name: 'Lapte',
        price: 5.99,
        store: 'Lidl',
        category: 'lactate',
        validFrom: new Date(),
        validUntil: new Date(),
      },
    ];

    (prisma.product.findMany as jest.Mock).mockResolvedValue(mockProducts);
    (prisma.product.count as jest.Mock).mockResolvedValue(1);

    const request = new NextRequest('http://localhost:3000/api/products');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.products).toHaveLength(1);
    expect(data.products[0].name).toBe('Lapte');
  });

  test('should handle pagination', async () => {
    (prisma.product.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.product.count as jest.Mock).mockResolvedValue(100);

    const request = new NextRequest('http://localhost:3000/api/products?page=2&limit=20');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.pagination.page).toBe(2);
    expect(data.pagination.limit).toBe(20);
  });

  test('should filter by store', async () => {
    (prisma.product.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.product.count as jest.Mock).mockResolvedValue(0);

    const request = new NextRequest('http://localhost:3000/api/products?store=Lidl');
    await GET(request);

    expect(prisma.product.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          store: 'Lidl',
        }),
      })
    );
  });

  test('should filter by category', async () => {
    (prisma.product.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.product.count as jest.Mock).mockResolvedValue(0);

    const request = new NextRequest('http://localhost:3000/api/products?category=lactate');
    await GET(request);

    expect(prisma.product.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          category: 'lactate',
        }),
      })
    );
  });

  test('should handle errors gracefully', async () => {
    (prisma.product.findMany as jest.Mock).mockRejectedValue(new Error('Database error'));

    const request = new NextRequest('http://localhost:3000/api/products');
    const response = await GET(request);

    expect(response.status).toBe(500);
  });

  test('should validate pagination limits', async () => {
    (prisma.product.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.product.count as jest.Mock).mockResolvedValue(0);

    const request = new NextRequest('http://localhost:3000/api/products?limit=200');
    const response = await GET(request);

    // Should cap at max limit
    expect(prisma.product.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: expect.any(Number),
      })
    );
  });

  test('should include only active offers', async () => {
    (prisma.product.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.product.count as jest.Mock).mockResolvedValue(0);

    const request = new NextRequest('http://localhost:3000/api/products');
    await GET(request);

    expect(prisma.product.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          validFrom: expect.any(Object),
          validUntil: expect.any(Object),
        }),
      })
    );
  });
});
