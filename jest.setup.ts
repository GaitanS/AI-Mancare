/**
 * Jest Setup File
 * Global test setup and mocks
 */

// Extend Jest with custom matchers
import '@testing-library/jest-dom'

// Mock environment variables
process.env.DATABASE_URL = 'file:./test.db'
process.env.OPENAI_API_KEY = 'sk-test-key'
process.env.OPENROUTER_API_KEY = 'test-key'
process.env.NEXT_PUBLIC_SITE_URL = 'http://localhost:3000'
process.env.NODE_ENV = 'test'

// Increase timeout for slow tests
jest.setTimeout(10000)

// Global mocks
jest.mock('@prisma/client', () => {
    const mockPrismaClient = {
        product: {
            findMany: jest.fn(),
            findUnique: jest.fn(),
            count: jest.fn(),
            create: jest.fn(),
            createMany: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
            deleteMany: jest.fn(),
            aggregate: jest.fn(),
            groupBy: jest.fn()
        },
        recipe: {
            findMany: jest.fn(),
            findUnique: jest.fn(),
            count: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
            aggregate: jest.fn(),
            groupBy: jest.fn()
        },
        catalog: {
            findMany: jest.fn(),
            findUnique: jest.fn(),
            count: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            delete: jest.fn()
        },
        $connect: jest.fn(),
        $disconnect: jest.fn()
    }

    return {
        PrismaClient: jest.fn(() => mockPrismaClient)
    }
})

// Suppress console during tests (optional)
if (process.env.SILENT_TESTS === 'true') {
    global.console = {
        ...console,
        log: jest.fn(),
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn()
    }
}

// Cleanup after all tests
afterAll(async () => {
    // Add any global cleanup here
})
