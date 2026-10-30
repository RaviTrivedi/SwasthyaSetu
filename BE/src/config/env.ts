import { CONFIG_ERROR_MESSAGES, INTERNAL_ERROR_MESSAGES } from '../constants/messages.js';
import { existsSync } from "node:fs";
import { loadEnvFile } from "node:process";
import { fileURLToPath } from "node:url";

const envPath = fileURLToPath(new URL("../../.env", import.meta.url));
if (existsSync(envPath)) {
  loadEnvFile(envPath);
}

const nodeEnv = process.env.NODE_ENV ?? "development";
if (!["development", "test", "production"].includes(nodeEnv)) {
  throw new Error(CONFIG_ERROR_MESSAGES.INVALID_NODE_ENV);
}

const rawPort = process.env.PORT ?? "4000";
const port = Number(rawPort);
if (
  !/^\d+$/.test(rawPort) ||
  !Number.isInteger(port) ||
  port < 1 ||
  port > 65535
) {
  throw new Error(CONFIG_ERROR_MESSAGES.INVALID_PORT);
}

export const env = Object.freeze({ nodeEnv, port });

// Validate only when database functionality is requested, not on health startup.
export function requireDatabaseUrl(): string {
  const value = process.env.DATABASE_URL;
  if (!value?.trim()) {
    throw new Error(
      CONFIG_ERROR_MESSAGES.DATABASE_URL_REQUIRED
    );
  }

  try {
    const url = new URL(value);
    if (
      value !== value.trim() ||
      !["postgresql:", "postgres:"].includes(url.protocol) ||
      !url.hostname ||
      !url.username ||
      url.pathname.length <= 1 ||
      (url.port !== "" && (Number(url.port) < 1 || Number(url.port) > 65535))
    ) {
      throw new Error(INTERNAL_ERROR_MESSAGES.INVALID_URL);
    }
  } catch {
    // Never include the connection string: it may contain credentials.
    throw new Error(
      CONFIG_ERROR_MESSAGES.INVALID_DATABASE_URL
    );
  }

  return value;
}
