import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.js';
import { requireDatabaseUrl } from './env.js';

let client: PrismaClient | undefined;

// Shared infrastructure; connections are lazy so health needs no database.
export function getDatabase(): PrismaClient {
  if (!client) {
    const adapter = new PrismaPg({ connectionString: requireDatabaseUrl() });
    client = new PrismaClient({ adapter });
  }
  return client;
}

export async function disconnectDatabase(): Promise<void> {
  if (client) {
    await client.$disconnect();
    client = undefined;
  }
}
