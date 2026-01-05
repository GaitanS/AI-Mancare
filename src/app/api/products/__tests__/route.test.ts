/**
 * Products API Integration Tests
 */

// Mock Prisma - MUST be before imports
const mockPrisma = {
  product: {
    findMany: jest.fn(),
    count: jest.fn(),
  },
  $disconnect: jest.fn(),
};

jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: mockPrisma,
  prisma: mockPrisma,
}));

import { GET } from '../route';
import { NextRequest } from 'next/server';

describe('GET /api/products', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(async () => {
    // Clean up
    await mockPrisma.$disconnect();
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

    mockPrisma.product.findMany.mockResolvedValue(mockProducts);
    mockPrisma.product.count.mockResolvedValue(1);

    const request = new NextRequest('http://localhost:3000/api/products');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.products).toHaveLength(1);
    expect(data.products[0].name).toBe('Lapte');
  });

  test('should handle pagination', async () => {
    mockPrisma.product.findMany.mockResolvedValue([]);
    mockPrisma.product.count.mockResolvedValue(100);

    const request = new NextRequest('http://localhost:3000/api/products?page=2&pageSize=20');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.pagination.page).toBe(2);
    expect(data.pagination.pageSize).toBe(20);
  });

  test('should filter by store', async () => {
    mockPrisma.product.findMany.mockResolvedValue([]);
    mockPrisma.product.count.mockResolvedValue(0);

    const request = new NextRequest('http://localhost:3000/api/products?store=Lidl');
    await GET(request);

    expect(mockPrisma.product.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          store: expect.objectContaining({
            in: ['Lidl'],
          }),
        }),
      })
    );
  });

  test('should filter by category', async () => {
    mockPrisma.product.findMany.mockResolvedValue([]);
    mockPrisma.product.count.mockResolvedValue(0);

    const request = new NextRequest('http://localhost:3000/api/products?category=lactate');
    await GET(request);

    expect(mockPrisma.product.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          category: expect.objectContaining({
            in: ['lactate'],
          }),
        }),
      })
    );
  });

  test('should handle errors gracefully', async () => {
    mockPrisma.product.findMany.mockRejectedValue(new Error('Database error'));

    const request = new NextRequest('http://localhost:3000/api/products');
    const response = await GET(request);

    expect(response.status).toBe(500);
  });

  test('should validate pagination limits', async () => {
    mockPrisma.product.findMany.mockResolvedValue([]);
    mockPrisma.product.count.mockResolvedValue(0);

    const request = new NextRequest('http://localhost:3000/api/products?pageSize=200');
    const response = await GET(request);

    // Should cap at max limit (100)
    expect(mockPrisma.product.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 100,
      })
    );
  });

  test('should include only active offers', async () => {
    mockPrisma.product.findMany.mockResolvedValue([]);
    mockPrisma.product.count.mockResolvedValue(0);

    const request = new NextRequest('http://localhost:3000/api/products');
    await GET(request);

    expect(mockPrisma.product.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          validFrom: expect.any(Object),
          validUntil: expect.any(Object),
        }),
      })
    );
  });
});
