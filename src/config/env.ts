import { z } from 'zod';

/**
 * Environment variable schema
 * Validates and type-checks all required environment variables
 */
const EnvSchema = z.object({
  // OpenAI
  OPENAI_API_KEY: z.string().min(1, 'OPENAI_API_KEY is required'),

  // NHTSA
  NHTSA_API_BASE: z.string().url().default('https://vpic.nhtsa.dot.gov/api'),

  // Market API (optional)
  MARKET_API_KEY: z.string().optional(),

  // Server
  PORT: z.coerce.number().min(1).max(65535).default(3000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // Logging
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),

  // Database
  DB_PATH: z.string().default('./data/carscanner.db'),

  // Image Upload
  MAX_IMAGE_SIZE_MB: z.coerce.number().min(1).max(50).default(10),
  UPLOAD_DIR: z.string().default('./uploads'),
});

export type Env = z.infer<typeof EnvSchema>;

/**
 * Validated environment variables
 *
 * @throws {ZodError} If required env vars are missing or invalid
 */
export const env: Env = EnvSchema.parse(process.env);

/**
 * Check if running in development mode
 */
export const isDev = env.NODE_ENV === 'development';

/**
 * Check if running in production mode
 */
export const isProd = env.NODE_ENV === 'production';

/**
 * Check if running in test mode
 */
export const isTest = env.NODE_ENV === 'test';
