/**
 * Jest Configuration for Rețete Ieftine
 * Skill: unit-testing, tdd-workflows
 */

import type { Config } from 'jest'
import nextJest from 'next/jest.js'

const createJestConfig = nextJest({
    // Provide the path to your Next.js app to load next.config.js and .env files
    dir: './',
})

const config: Config = {
    // Test environment
    testEnvironment: 'node',

    // Setup files
    setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],

    // Module path aliases (match tsconfig.json)
    moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
    },

    // Test patterns
    testMatch: [
        '**/__tests__/**/*.test.ts',
        '**/*.test.ts'
    ],

    // Ignore patterns
    testPathIgnorePatterns: [
        '<rootDir>/node_modules/',
        '<rootDir>/.next/',
        '<rootDir>/storage/'
    ],

    // Coverage configuration
    collectCoverageFrom: [
        'src/**/*.{ts,tsx}',
        '!src/**/*.d.ts',
        '!src/app/**/*.tsx', // Exclude page components from coverage
        '!src/components/**/*.tsx', // Focus on lib first
        '!src/**/__tests__/**'
    ],

    // Coverage thresholds
    coverageThreshold: {
        global: {
            branches: 40,
            functions: 40,
            lines: 40,
            statements: 40
        },
        // Stricter thresholds for critical files
        './src/lib/repositories/': {
            branches: 60,
            functions: 60,
            lines: 60,
            statements: 60
        },
        './src/lib/validators/': {
            branches: 80,
            functions: 80,
            lines: 80,
            statements: 80
        }
    },

    // Coverage reporters
    coverageReporters: ['text', 'lcov', 'html'],

    // Verbose output
    verbose: true,

    // Clear mocks between tests
    clearMocks: true,

    // Timeout for async tests
    testTimeout: 10000
}

export default createJestConfig(config)
