import { z } from 'zod'

const envSchema = z.object({
    // Database
    DATABASE_URL: z.string().url(),

    // AI APIs (critical - expensive if leaked)
    OPENAI_API_KEY: z.string().min(1).startsWith('sk-'),
    ANTHROPIC_API_KEY: z.string().min(1).startsWith('sk-ant-'),

    // Application
    NEXT_PUBLIC_SITE_URL: z.string().url(),
    STORAGE_PATH: z.string().min(1),

    // Security
    JWT_SECRET: z.string().min(32),
    SESSION_SECRET: z.string().min(32),

    // Environment
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development')
})

export type Env = z.infer<typeof envSchema>

// Validate environment variables on module load
export const env = envSchema.parse(process.env)

// Export individual variables for convenience
export const {
    DATABASE_URL,
    OPENAI_API_KEY,
    ANTHROPIC_API_KEY,
    NEXT_PUBLIC_SITE_URL,
    STORAGE_PATH,
    JWT_SECRET,
    SESSION_SECRET,
    NODE_ENV
} = env
