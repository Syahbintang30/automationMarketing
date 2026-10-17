import { z } from 'zod';
import dotenv from 'dotenv';
import path from 'path';

// Load .env from workspace root or backend dir
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(4000),
  APP_BASE_URL: z.string().url().default('http://localhost:4000'),
  FRONTEND_URL: z.string().url().default('http://localhost:5173'),

  JWT_SECRET: z.string().min(16, 'JWT_SECRET must be at least 16 characters').default('super_secret_wardell_jwt_token_key_12345'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  ENCRYPTION_KEY: z.string().min(16, 'ENCRYPTION_KEY must be at least 16 characters').default('0123456789abcdef0123456789abcdef'),

  DATABASE_URL: z.string().default('postgresql://syahbintang@localhost:5432/wardell_leads?schema=public'),

  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.coerce.number().default(6379),
  REDIS_PASSWORD: z.string().optional().default(''),

  DRY_RUN: z.enum(['true', 'false']).transform((v) => v === 'true').default('true'),
  DEFAULT_DAILY_SEND_LIMIT: z.coerce.number().min(1).max(500).default(30),
  MIN_SEND_INTERVAL_SECONDS: z.coerce.number().min(5).max(300).default(30),

  GOOGLE_PLACES_API_KEY: z.string().optional().default(''),

  GMAIL_CLIENT_ID: z.string().optional().default(''),
  GMAIL_CLIENT_SECRET: z.string().optional().default(''),
  GMAIL_REDIRECT_URI: z.string().default('http://localhost:4000/api/v1/integrations/gmail/callback'),

  AI_PROVIDER: z.enum(['gemini', 'openai']).default('gemini'),
  GEMINI_API_KEY: z.string().optional().default(''),
  GEMINI_MODEL: z.string().default('gemini-1.5-flash'),
  OPENAI_API_KEY: z.string().optional().default(''),
  OPENAI_MODEL: z.string().default('gpt-4o-mini'),

  APP_TIMEZONE: z.string().default('Asia/Jakarta'),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error('❌ Invalid environment variables:', JSON.stringify(parsedEnv.error.format(), null, 2));
  throw new Error('Invalid environment configuration');
}

export const env = parsedEnv.data;
export type Env = z.infer<typeof envSchema>;
