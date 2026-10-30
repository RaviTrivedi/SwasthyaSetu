import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client.js";
import { requireDatabaseUrl } from "./env.js";

let client: PrismaClient | undefined;

// Shared infrastructure; connections are lazy so health needs no database.
export function getDatabase(): PrismaClient {
  // Create the client on first use,
  // then reuse it across repository calls and requests.
  if (!client) {
    const adapter = new PrismaPg({ connectionString: requireDatabaseUrl() });
    client = new PrismaClient({ adapter });
  }
  return client;
}

export async function disconnectDatabase(): Promise<void> {
  // Release connections during cleanup (for example, after tests), not after each request.
  if (client) {
    await client.$disconnect();
    client = undefined;
  }
}
