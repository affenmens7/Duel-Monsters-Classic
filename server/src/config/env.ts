import dotenv from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, '../../../.env') });

/** Require an env var at startup — abort if missing or placeholder. */
function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value || value.trim() === '' || value === 'CHANGE_ME') {
    console.error(`FATAL: Required environment variable "${key}" is not set or is a placeholder.`);
    process.exit(1);
  }
  return value;
}

export const env = {
  port: parseInt(process.env.PORT ?? '3001', 10),
  databaseUrl: requireEnv('DATABASE_URL'),
  jwtSecret: requireEnv('JWT_SECRET'),
  frontendUrl: process.env.FRONTEND_URL ?? 'http://localhost:5173',
  smtp: {
    user: requireEnv('SMTP_USER'),
    pass: requireEnv('SMTP_PASS'),
  },
} as const;
