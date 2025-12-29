# Testing Guide

## 📊 Overview

Acest document descrie strategia de testing și cum să rulezi testele pentru proiect.

## 🎯 Testing Strategy

### Test Pyramid

```
        /\
       /  \  E2E Tests (5%)
      /____\
     /      \  Integration Tests (20%)
    /________\
   /          \  Unit Tests (75%)
  /__________\
```

**Unit Tests (75%):**
- Funcții pure și utilitare
- Validare și sanitizare
- Cryptography
- Caching

**Integration Tests (20%):**
- API routes
- Database queries
- External services (mocked)

**E2E Tests (5%):**
- User flows critice
- Cross-browser testing

## 🧪 Test Coverage Targets

| Type | Coverage Target | Critical |
|------|----------------|----------|
| Overall | > 70% | > 50% |
| Functions | > 70% | > 50% |
| Branches | > 70% | > 50% |
| Lines | > 70% | > 50% |
| Statements | > 70% | > 50% |

## 🚀 Running Tests

### All Tests

```bash
# Run all tests
npm test

# Run in watch mode (development)
npm run test:watch

# Generate coverage report
npm run test:coverage
```

### Specific Test Files

```bash
# Run single test file
npm test -- cache.test.ts

# Run tests matching pattern
npm test -- --testNamePattern="Cache Utility"

# Run tests in specific directory
npm test -- src/lib/__tests__
```

### Coverage Report

```bash
npm run test:coverage

# View HTML report
open coverage/lcov-report/index.html
```

## 📁 Test Structure

```
src/
├── lib/
│   ├── __tests__/
│   │   ├── cache.test.ts
│   │   └── utils.test.ts
│   ├── security/
│   │   └── __tests__/
│   │       ├── validation.test.ts
│   │       └── crypto.test.ts
│   └── cache.ts
├── app/
│   └── api/
│       └── products/
│           ├── __tests__/
│           │   └── route.test.ts
│           └── route.ts
```

## ✍️ Writing Tests

### Unit Test Example

```typescript
// src/lib/__tests__/cache.test.ts
import { cache } from '../cache';

describe('Cache Utility', () => {
  beforeEach(() => {
    cache.flushAll();
  });

  test('should set and get value', () => {
    cache.set('key', 'value', 60);
    const result = cache.get('key');

    expect(result).toBe('value');
  });

  test('should expire after TTL', async () => {
    cache.set('key', 'value', 1);

    await new Promise(resolve => setTimeout(resolve, 1100));

    expect(cache.get('key')).toBeUndefined();
  });
});
```

### Integration Test Example

```typescript
// src/app/api/products/__tests__/route.test.ts
import { GET } from '../route';
import { NextRequest } from 'next/server';

jest.mock('@/lib/db');

describe('GET /api/products', () => {
  test('should return products', async () => {
    const request = new NextRequest('http://localhost:3000/api/products');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.products).toBeDefined();
  });

  test('should handle errors', async () => {
    // Mock database error
    (prisma.product.findMany as jest.Mock).mockRejectedValue(
      new Error('Database error')
    );

    const request = new NextRequest('http://localhost:3000/api/products');
    const response = await GET(request);

    expect(response.status).toBe(500);
  });
});
```

### Component Test Example

```typescript
// src/components/__tests__/ProductCard.test.tsx
import { render, screen } from '@testing-library/react';
import { ProductCard } from '../ProductCard';

describe('ProductCard', () => {
  const mockProduct = {
    id: '1',
    name: 'Lapte',
    price: 5.99,
    store: 'Lidl',
  };

  test('should render product details', () => {
    render(<ProductCard product={mockProduct} />);

    expect(screen.getByText('Lapte')).toBeInTheDocument();
    expect(screen.getByText('5.99 RON')).toBeInTheDocument();
    expect(screen.getByText('Lidl')).toBeInTheDocument();
  });

  test('should show discount badge', () => {
    const productWithDiscount = {
      ...mockProduct,
      originalPrice: 7.99,
      discountPercentage: 25,
    };

    render(<ProductCard product={productWithDiscount} />);

    expect(screen.getByText('-25%')).toBeInTheDocument();
  });
});
```

## 🎭 Mocking

### Mock Database (Prisma)

```typescript
jest.mock('@/lib/db', () => ({
  prisma: {
    product: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  },
}));

import { prisma } from '@/lib/db';

// In test
(prisma.product.findMany as jest.Mock).mockResolvedValue([
  { id: '1', name: 'Product' },
]);
```

### Mock External APIs

```typescript
jest.mock('openai', () => ({
  OpenAI: jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: jest.fn().mockResolvedValue({
          choices: [{ message: { content: 'Mock response' } }],
        }),
      },
    },
  })),
}));
```

### Mock Cache

```typescript
jest.mock('@/lib/cache', () => ({
  cache: {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    flushAll: jest.fn(),
  },
}));
```

## 🔍 Test Categories

### Security Tests

```typescript
describe('Security', () => {
  test('should sanitize HTML input', () => {
    const dirty = '<script>alert("XSS")</script>';
    const clean = sanitizeHTML(dirty);

    expect(clean).not.toContain('<script>');
  });

  test('should validate email', () => {
    expect(safeEmail.safeParse('test@test.com').success).toBe(true);
    expect(safeEmail.safeParse('invalid').success).toBe(false);
  });

  test('should hash passwords securely', async () => {
    const password = 'SecurePass123!';
    const hash = await hashPassword(password);

    expect(hash).not.toBe(password);
    expect(await verifyPassword(password, hash)).toBe(true);
  });
});
```

### Performance Tests

```typescript
describe('Performance', () => {
  test('should complete query in under 100ms', async () => {
    const start = Date.now();

    await getActiveOffersByStore('Lidl');

    const duration = Date.now() - start;
    expect(duration).toBeLessThan(100);
  });

  test('should handle 100 concurrent requests', async () => {
    const promises = Array(100).fill(null).map(() =>
      fetch('http://localhost:3000/api/products')
    );

    const responses = await Promise.all(promises);

    responses.forEach(response => {
      expect(response.status).toBe(200);
    });
  });
});
```

### Error Handling Tests

```typescript
describe('Error Handling', () => {
  test('should handle database errors', async () => {
    (prisma.product.findMany as jest.Mock).mockRejectedValue(
      new Error('Connection failed')
    );

    const response = await GET(request);

    expect(response.status).toBe(500);
    expect(await response.json()).toHaveProperty('error');
  });

  test('should handle validation errors', async () => {
    const response = await POST(request, {
      body: { invalid: 'data' }
    });

    expect(response.status).toBe(400);
  });
});
```

## 📊 Coverage Reports

### Generate Coverage

```bash
npm run test:coverage
```

### View Coverage

```bash
# HTML report
open coverage/lcov-report/index.html

# Terminal summary
cat coverage/coverage-summary.txt
```

### Coverage Thresholds

```javascript
// jest.config.js
coverageThreshold: {
  global: {
    branches: 70,
    functions: 70,
    lines: 70,
    statements: 70,
  },
}
```

## 🎯 Best Practices

### Test Naming

```typescript
// ✅ GOOD - Descriptive
test('should return 404 when product not found', () => {});

// ❌ BAD - Vague
test('product test', () => {});
```

### Test Organization

```typescript
describe('ProductService', () => {
  describe('getById', () => {
    test('should return product when found', () => {});
    test('should return null when not found', () => {});
  });

  describe('create', () => {
    test('should create product with valid data', () => {});
    test('should reject invalid data', () => {});
  });
});
```

### Setup & Teardown

```typescript
describe('Database Tests', () => {
  beforeAll(async () => {
    // Setup database connection
    await prisma.$connect();
  });

  afterAll(async () => {
    // Cleanup
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Clear data before each test
    await prisma.product.deleteMany();
  });

  test('test...', () => {});
});
```

### Async Testing

```typescript
// ✅ GOOD - Use async/await
test('should fetch data', async () => {
  const data = await fetchData();
  expect(data).toBeDefined();
});

// ✅ GOOD - Use done callback
test('should fetch data', (done) => {
  fetchData().then(data => {
    expect(data).toBeDefined();
    done();
  });
});

// ❌ BAD - Missing await/done
test('should fetch data', () => {
  fetchData().then(data => {
    expect(data).toBeDefined();
  });
});
```

## 🚨 Common Issues

### Issue: Tests timeout

```typescript
// Increase timeout for slow tests
test('slow operation', async () => {
  // ...
}, 10000); // 10 seconds
```

### Issue: Tests fail randomly

```typescript
// Clear cache/state between tests
beforeEach(() => {
  jest.clearAllMocks();
  cache.flushAll();
});
```

### Issue: Mock not working

```typescript
// Mock must be defined before import
jest.mock('@/lib/db');
import { prisma } from '@/lib/db';

// NOT
import { prisma } from '@/lib/db';
jest.mock('@/lib/db'); // Too late!
```

## 📚 Testing Checklist

### Before Commit

- [ ] All tests pass (`npm test`)
- [ ] Coverage meets threshold (> 70%)
- [ ] No console errors/warnings
- [ ] Linter passes (`npm run lint`)

### Before Deployment

- [ ] All tests pass in CI
- [ ] Integration tests pass
- [ ] Security tests pass
- [ ] Performance tests pass
- [ ] Coverage report reviewed

## 🔗 Resources

- [Jest Documentation](https://jestjs.io/)
- [Testing Library](https://testing-library.com/)
- [Next.js Testing](https://nextjs.org/docs/testing)
- [Prisma Testing](https://www.prisma.io/docs/guides/testing)

---

**Last Updated**: 2024-12-28
**Version**: 1.0
