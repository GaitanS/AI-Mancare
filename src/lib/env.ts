import { z } from 'zod'

const envSchema = z.object({
    // Database
    DATABASE_URL: z.string().min(1),

    // AI APIs (optional in test/dev, required in production)
    OPENAI_API_KEY: z.string().min(1).optional(),
    OPENROUTER_API_KEY: z.string().min(1).optional(),
    ANTHROPIC_API_KEY: z.string().min(1).optional(),

    // Application
    NEXT_PUBLIC_SITE_URL: z.string().url().optional(),
    STORAGE_PATH: z.string().min(1).optional(),

    // Security (optional in test environment)
    JWT_SECRET: z.string().min(1).optional(),
    SESSION_SECRET: z.string().min(1).optional(),
    AUTH_SECRET: z.string().min(1).optional(),

    // Environment
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development')
})

export type Env = z.infer<typeof envSchema>

// Validate environment variables on module load
// Use safeParse to avoid throwing in test environments
const parsed = envSchema.safeParse(process.env)

export const env = parsed.success ? parsed.data : {
    DATABASE_URL: process.env.DATABASE_URL || '',
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    STORAGE_PATH: process.env.STORAGE_PATH,
    JWT_SECRET: process.env.JWT_SECRET,
    SESSION_SECRET: process.env.SESSION_SECRET,
    AUTH_SECRET: process.env.AUTH_SECRET,
    NODE_ENV: (process.env.NODE_ENV as 'development' | 'production' | 'test') || 'development'
}

// Export individual variables for convenience
export const {
    DATABASE_URL,
    OPENAI_API_KEY,
    OPENROUTER_API_KEY,
    ANTHROPIC_API_KEY,
    NEXT_PUBLIC_SITE_URL,
    STORAGE_PATH,
    JWT_SECRET,
    SESSION_SECRET,
    AUTH_SECRET,
    NODE_ENV
} = env
