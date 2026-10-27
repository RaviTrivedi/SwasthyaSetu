import { existsSync } from 'node:fs';
import { loadEnvFile } from 'node:process';
import { fileURLToPath } from 'node:url';

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
