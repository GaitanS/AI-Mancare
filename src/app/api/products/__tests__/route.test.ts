/**
 * Products API Integration Tests
 */

import { NextRequest } from 'next/server';

// Create mock functions that persist across hoisting
const mockFindMany = jest.fn();
const mockCount = jest.fn();
const mockDisconnect = jest.fn();

// Mock must be defined before importing the route
jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: {
    product: {
      findMany: mockFindMany,
      count: mockCount,
    },
    $disconnect: mockDisconnect,
  },
}));

// Import AFTER mock is set up
import { GET } from '../route';

describe('GET /api/products', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(async () => {
    // Clean up
    mockDisconnect();
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

    mockFindMany.mockResolvedValue(mockProducts);
    mockCount.mockResolvedValue(1);

    const request = new NextRequest('http://localhost:3000/api/products');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.products).toHaveLength(1);
    expect(data.products[0].name).toBe('Lapte');
  });

  test('should handle pagination', async () => {
    mockFindMany.mockResolvedValue([]);
    mockCount.mockResolvedValue(100);

    const request = new NextRequest('http://localhost:3000/api/products?page=2&pageSize=20');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.pagination.page).toBe(2);
    expect(data.pagination.pageSize).toBe(20);
  });

  test('should filter by store', async () => {
    mockFindMany.mockResolvedValue([]);
    mockCount.mockResolvedValue(0);

    const request = new NextRequest('http://localhost:3000/api/products?store=Lidl');
    await GET(request);

    expect(mockFindMany).toHaveBeenCalledWith(
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
    mockFindMany.mockResolvedValue([]);
    mockCount.mockResolvedValue(0);

    const request = new NextRequest('http://localhost:3000/api/products?category=lactate');
    await GET(request);

    expect(mockFindMany).toHaveBeenCalledWith(
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
    mockFindMany.mockRejectedValue(new Error('Database error'));

    const request = new NextRequest('http://localhost:3000/api/products');
    const response = await GET(request);

    expect(response.status).toBe(500);
  });

  test('should validate pagination limits', async () => {
    mockFindMany.mockResolvedValue([]);
    mockCount.mockResolvedValue(0);

    const request = new NextRequest('http://localhost:3000/api/products?pageSize=200');
    const response = await GET(request);

    // Should cap at max limit (100)
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 100,
      })
    );
  });

  test('should include only active offers', async () => {
    mockFindMany.mockResolvedValue([]);
    mockCount.mockResolvedValue(0);

    const request = new NextRequest('http://localhost:3000/api/products');
    await GET(request);

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          validFrom: expect.any(Object),
          validUntil: expect.any(Object),
        }),
      })
    );
  });
});
