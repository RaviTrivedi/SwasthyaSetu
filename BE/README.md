# SwasthyaSetu API

Independent Express + TypeScript backend. Requires Node.js 20.19+ and npm.

## Local development

Run from `BE/`:

```sh
npm ci
npm run db:generate
```

Copy `.env.example` to `.env` (PowerShell: `Copy-Item .env.example .env`), then:

```sh
npm run dev
```

Development uses Nodemon to restart the server when TypeScript or JSON files in
`src/` change. `tsx` executes TypeScript. Restart manually after changing `.env`.

The API defaults to port 4000. `BE/.env` is loaded with Node's built-in loader;
existing process environment variables take precedence. The file is optional.
`NODE_ENV` defaults to `development` and accepts `development`, `test`, or
`production`. `PORT` defaults to `4000` and must be an integer from 1 to 65535.
Invalid configuration stops startup before the server listens.

## Checks and production startup

```sh
npm run typecheck
npm run build
npm start
```

`build` compiles `src/` into `dist/`. Set `NODE_ENV=production` in the deployment
environment for production startup.

## Endpoints

- `GET /api/v1/health` returns HTTP 200 with `{"status":"ok"}`. This only confirms
  the HTTP application responds; it does not check database or dependency readiness.
- Unmatched routes return HTTP 404 with `{"message":"Not found"}`.

Verify with `curl.exe http://localhost:4000/api/v1/health` on Windows,
or `curl http://localhost:4000/api/v1/health` elsewhere.

## Structure

`src/app.ts` configures Express without opening a port. `src/server.ts` loads
validated configuration and starts the server. `src/config/env.ts` handles
environment loading and validation. `src/routes/index.ts` mounts versioned
routes, with the health endpoint in `src/routes/health.routes.ts`.

The architecture uses layers, with role-based grouping inside each layer when
needed. Only the configuration and routing layers are needed for this module.
Shared database access lives in `src/config/database.ts`; user persistence lives in
`src/repositories/user.repository.ts`. Role-specific folders will be added when
role-specific functionality exists. Authentication APIs and other business models
are not implemented.

## PostgreSQL and Prisma

Prisma 7 uses the PostgreSQL driver adapter and generates an ESM TypeScript client
into `src/generated/prisma/` (ignored by Git). Type-check and build regenerate it.

Provision a PostgreSQL database separately and replace the clearly fake
`DATABASE_URL` in `.env.example` with your connection URL in `BE/.env`. This setup
does not install or start a PostgreSQL server. Never commit database credentials.

```sh
npm run db:validate
npm run db:generate
```

These commands do not connect to or modify the database. With no `DATABASE_URL`,
offline validation/generation and the health endpoint still work. Database access
through `getDatabase()` requires a valid PostgreSQL URL and reports missing or
malformed configuration without printing credentials. A configured URL is also
validated by Prisma CLI configuration. URL validation does not verify connectivity.

The initial SQL migration is included but has not been applied. Only after
explicitly approving the target database, apply it from `BE/` with
`npx prisma migrate deploy`. Do not use reset or schema push to apply this migration.

The only model is `User`: UUID id, firstName, unique email, passwordHash, PATIENT
role, and createdAt/updatedAt timestamps. Prisma supplies UUIDs and updatedAt on
client writes. The repository trims and lowercases emails for writes and lookups;
the database unique constraint protects normalized emails against duplicates.
Future write paths must preserve this normalization. The repository accepts only
an already-hashed password; hashing and request validation belong to the future
registration service. Repository records are internal and must not be returned
directly from future API handlers because they include passwordHash.

No seed is needed. No credentials, sessions, or other business tables are created.
Phone is intentionally omitted for review: the current sign-up form uses email
and password, while earlier patient requirements mentioned phone.

Tooling note: installation on Node 20.19 reports a Node 22+ engine warning from
the transitive `@prisma/streams-local` package. Validation, client generation,
type-check, and build pass. The offline `prisma migrate diff` command exited
without producing SQL in this environment, so the initial migration was authored
from the schema and reviewed manually; it has not been database-tested.
