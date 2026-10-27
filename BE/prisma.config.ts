import { defineConfig } from 'prisma/config';
import { requireDatabaseUrl } from './src/config/env.js';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations' },
  // Offline validation/generation need no URL. Database CLI commands do.
  ...(process.env.DATABASE_URL !== undefined
    ? { datasource: { url: requireDatabaseUrl() } }
    : {}),
});
