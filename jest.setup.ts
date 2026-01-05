/**
 * Jest Setup File
 * Global test setup and mocks
 */

// Extend Jest with custom matchers
import '@testing-library/jest-dom'

// Mock environment variables
process.env.DATABASE_URL = 'mysql://root:password@127.0.0.1:3306/test_db'
process.env.OPENAI_API_KEY = 'sk-test-key'
process.env.OPENROUTER_API_KEY = 'test-key'
process.env.NEXT_PUBLIC_SITE_URL = 'http://localhost:3000'
process.env.ANTHROPIC_API_KEY = 'test-anthropic-key'
process.env.STORAGE_PATH = './test-storage'
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing'
process.env.SESSION_SECRET = 'test-session-secret-key-for-testing'
process.env.AUTH_SECRET = 'test-auth-secret'
// NODE_ENV is already set by Jest and is read-only

// Increase timeout for slow tests
jest.setTimeout(10000)

// Mock Prisma client
const mockPrismaClient = {
    product: {
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn().mockResolvedValue(null),
        findFirst: jest.fn().mockResolvedValue(null),
        count: jest.fn().mockResolvedValue(0),
        create: jest.fn(),
        createMany: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        deleteMany: jest.fn(),
        aggregate: jest.fn(),
        groupBy: jest.fn()
    },
    recipe: {
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn().mockResolvedValue(null),
        findFirst: jest.fn().mockResolvedValue(null),
        count: jest.fn().mockResolvedValue(0),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        aggregate: jest.fn(),
        groupBy: jest.fn()
    },
    catalog: {
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn().mockResolvedValue(null),
        count: jest.fn().mockResolvedValue(0),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn()
    },
    store: {
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn().mockResolvedValue(null),
        findFirst: jest.fn().mockResolvedValue(null),
        count: jest.fn().mockResolvedValue(0),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn()
    },
    $connect: jest.fn(),
    $disconnect: jest.fn(),
    $queryRaw: jest.fn().mockResolvedValue([]),
    $executeRaw: jest.fn().mockResolvedValue(0)
}

// Global mocks
jest.mock('@prisma/client', () => {
    return {
        PrismaClient: jest.fn(() => mockPrismaClient)
    }
})

// Mock @/lib/prisma module
jest.mock('@/lib/prisma', () => ({
    prisma: mockPrismaClient,
    default: mockPrismaClient
}))

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
