import { existsSync } from 'node:fs';
import { loadEnvFile } from 'node:process';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';

const envPath = fileURLToPath(new URL('../../.env', import.meta.url));
if (existsSync(envPath)) {
  loadEnvFile(envPath);
}

const nodeEnv = process.env.NODE_ENV ?? 'development';
if (!['development', 'test', 'production'].includes(nodeEnv)) {
  throw new Error('NODE_ENV must be development, test, or production.');
}

const rawPort = process.env.PORT ?? '4000';
const port = Number(rawPort);
if (!/^\d+$/.test(rawPort) || !Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('PORT must be an integer between 1 and 65535.');
}

export const env = Object.freeze({ nodeEnv, port });

export function passwordResetDeliveryConfig(source: NodeJS.ProcessEnv = process.env) {
  const mode = source.PASSWORD_RESET_DELIVERY ?? (source.NODE_ENV === 'development' || !source.NODE_ENV ? 'development-file' : 'resend');
  if (mode === 'development-file') {
    if ((source.NODE_ENV ?? 'development') !== 'development') throw new Error('Development file delivery is only allowed in development.');
    return { mode } as const;
  }
  if (mode !== 'resend') throw new Error('PASSWORD_RESET_DELIVERY must be resend or development-file.');
  const apiKey = source.RESEND_API_KEY;
  if (!apiKey || !/^re_[A-Za-z0-9_-]+$/.test(apiKey) || /placeholder|replace|example/i.test(apiKey)) {
    throw new Error('RESEND_API_KEY must contain a valid Resend API key when Resend delivery is enabled.');
  }
  const from = source.PASSWORD_RESET_FROM;
  if (!from || !z.email().safeParse(from).success || /@(resend\.dev|example\.(com|org|net|invalid))$/i.test(from)) {
    throw new Error('PASSWORD_RESET_FROM must be an email address on your verified Resend sending domain.');
  }
  return { mode, apiKey, from } as const;
}

// Validate only when database functionality is requested, not on health startup.
export function requireDatabaseUrl(): string {
  const value = process.env.DATABASE_URL;
  if (!value?.trim()) {
    throw new Error('DATABASE_URL is required when database functionality is enabled.');
  }

  try {
    const url = new URL(value);
    if (
      value !== value.trim() ||
      !['postgresql:', 'postgres:'].includes(url.protocol) ||
      !url.hostname ||
      !url.username ||
      url.pathname.length <= 1 ||
      (url.port !== '' && (Number(url.port) < 1 || Number(url.port) > 65535))
    ) {
      throw new Error('Invalid URL');
    }
  } catch {
    // Never include the connection string: it may contain credentials.
    throw new Error('DATABASE_URL must be a PostgreSQL URL with a host, user, database name, and valid port.');
  }

  return value;
}
