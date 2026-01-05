/**
 * Products API Integration Tests
 */

import { NextRequest } from 'next/server';

// Complete mock product with all required Date fields
const mockProducts = [
  {
    id: '1',
    name: 'Lapte',
    description: 'Lapte proaspat',
    price: 4.5,
    originalPrice: 5.99,
    currency: 'RON',
    store: 'Lidl',
    category: 'lactate',
    brand: 'Zuzu',
    image: 'image.jpg',
    url: 'http://lidl.ro',
    validFrom: new Date(),
    validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // +7 days
    lastScraped: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    isActive: true,
    discountPercentage: 25,
  },
];

// Mock functions defined before jest.mock
const mockFindMany = jest.fn();
const mockCount = jest.fn();
const mockDisconnect = jest.fn();

// Mock @/lib/db
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

// Import AFTER mock
import { GET } from '../route';

describe('GET /api/products', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Set default successful responses
    mockFindMany.mockResolvedValue(mockProducts);
    mockCount.mockResolvedValue(1);
  });

  afterAll(() => {
    jest.clearAllTimers();
    jest.restoreAllMocks();
  });

  test('should return products', async () => {
    const request = new NextRequest('http://localhost:3000/api/products');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.products).toHaveLength(1);
    expect(data.products[0].name).toBe('Lapte');
  });

  test('should handle pagination', async () => {
    mockFindMany.mockResolvedValue(mockProducts);
    mockCount.mockResolvedValue(100);

    const request = new NextRequest('http://localhost:3000/api/products?page=2&pageSize=20');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.pagination.page).toBe(2);
    expect(data.pagination.pageSize).toBe(20);
  });

  test('should filter by store', async () => {
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

    // Suppress console.error for this test
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const request = new NextRequest('http://localhost:3000/api/products');
    const response = await GET(request);

    expect(response.status).toBe(500);

    consoleSpy.mockRestore();
  });

  test('should validate pagination limits', async () => {
    const request = new NextRequest('http://localhost:3000/api/products?pageSize=200');
    await GET(request);

    // Should cap at max limit (100)
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 100,
      })
    );
  });

  test('should include only active offers', async () => {
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
