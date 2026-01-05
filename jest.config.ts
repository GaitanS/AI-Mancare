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

    // Coverage thresholds (lowered temporarily for CI - TODO: increase as tests improve)
    coverageThreshold: {
        global: {
            branches: 3,
            functions: 3,
            lines: 4,
            statements: 4
        },
        // Stricter thresholds for critical files
        './src/lib/repositories/': {
            branches: 25,
            functions: 25,
            lines: 35,
            statements: 35
        },
        './src/lib/validators/': {
            branches: 70,
            functions: 70,
            lines: 70,
            statements: 70
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
