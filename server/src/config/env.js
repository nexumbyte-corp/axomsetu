import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform((val) => parseInt(val, 10)).default('5000'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  JWT_ACCESS_SECRET: z.string().min(16, 'JWT_ACCESS_SECRET must be at least 16 characters'),
  JWT_REFRESH_SECRET: z.string().min(16, 'JWT_REFRESH_SECRET must be at least 16 characters'),
  JWT_ACCESS_EXPIRES: z.string().default('15m'),
  JWT_REFRESH_EXPIRES: z.string().default('7d'),
  CLIENT_URL: z.string().default('http://localhost:5173'),
  TRUST_PROXY: z.string().transform((val) => val === 'true' || val === '1').default('false'),
  SERVE_CLIENT: z.string().transform((val) => val === 'true' || val === '1').default('false'),
  SESSION_MAX_AGE_DAYS: z.string().transform((val) => parseInt(val, 10)).default('7'),
  SESSION_SECRET: z.string().default('axomsetu_session_secret_key_change_in_prod'),
  BACKUP_DIR: z.string().default('./backups'),
  BACKUP_RETENTION_DAYS: z.string().transform((val) => parseInt(val, 10)).default('7'),
  REMOTE_BACKUP_COMMAND: z.string().default(''),
  TZ: z.string().default('Asia/Kolkata'),
  SEED_ADMIN_NAME: z.string().default('Super Admin'),
  SEED_ADMIN_EMAIL: z.string().email().default('admin@schoolsaas.com'),
  SEED_ADMIN_PASSWORD: z.string().default('SuperAdminPass123!'),
});

const parseEnv = () => {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    console.error('Invalid environment variables:', result.error.flatten().fieldErrors);
    throw new Error('Invalid environment configuration');
  }

  const data = result.data;
  process.env.TZ = data.TZ;

  if (data.NODE_ENV === 'production') {
    if (data.SEED_ADMIN_PASSWORD === 'SuperAdminPass123!') {
      console.warn('WARNING: Using default SEED_ADMIN_PASSWORD in production environment!');
    }
    if (data.JWT_ACCESS_SECRET.includes('super_secure') || data.JWT_REFRESH_SECRET.includes('super_secure')) {
      console.warn('WARNING: Using default sample JWT secrets in production environment! Please set unique random secrets.');
    }
  }

  return data;
};

export const env = parseEnv();

