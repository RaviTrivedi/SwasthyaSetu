# SwasthyaSetu API

Independent Express + TypeScript backend. Requires Node.js 20.19+ and npm.

## Local development

Run from `BE/`:

```sh
npm ci
npm run db:generate
```

Copy `.env.example` to `.env` (PowerShell: `Copy-Item .env.example .env`), then:

Set `ACCESS_TOKEN_SECRET` to 32 cryptographically random bytes encoded as 64 hex
characters. Generate one locally with
`node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"`.
Store it only in `.env` or your deployment secret manager; do not commit or share it.

```sh
npm run dev
```

Development uses Nodemon to restart the server when TypeScript or JSON files in
`src/` change. `tsx` executes TypeScript. Restart manually after changing `.env`.

The API defaults to port 4000. `BE/.env` is loaded with Node's built-in loader;
existing process environment variables take precedence. The file is optional if
required signing configuration is provided through the process environment.
`NODE_ENV` defaults to `development` and accepts `development`, `test`, or
`production`. `PORT` defaults to `4000` and must be an integer from 1 to 65535.
Invalid configuration stops startup before the server listens.

## Checks and production startup

```sh
npm run typecheck
npm test
npm run build
npm start
```

`build` compiles `src/` into `dist/`. Set `NODE_ENV=production` in the deployment
environment for production startup.

## Endpoints

- `GET /api/v1/health` returns HTTP 200 with `{"status":"ok"}`. This only confirms
  the HTTP application responds; it does not check database or dependency readiness.
- `POST /api/v1/auth/register` creates a patient account; see the contract below.
- `POST /api/v1/auth/login` verifies credentials and creates a persistent session.
- `POST /api/v1/auth/refresh` rotates the refresh cookie and issues an access token.
- `POST /api/v1/auth/logout` revokes the current session and clears its cookie.
- `POST /api/v1/auth/logout-all` requires a verified access token and revokes the user's active sessions.
- `POST /api/v1/auth/password-reset/request` accepts a reset request without disclosing account existence.
- `POST /api/v1/auth/password-reset/confirm` changes the password with a single-use token.
- Unmatched routes return HTTP 404 with `{"message":"Not found"}`.

Verify with `curl.exe http://localhost:4000/api/v1/health` on Windows,
or `curl http://localhost:4000/api/v1/health` elsewhere.

## Structure

`src/app.ts` configures Express without opening a port. `src/server.ts` loads
validated configuration and starts the server. `src/config/env.ts` handles
environment loading and general validation. Email delivery mode, Resend API key,
and sender validation live in `src/config/password-reset-delivery.ts`.
`src/routes/index.ts` mounts versioned
routes, with the health endpoint in `src/routes/health.routes.ts`.

The architecture uses layers, with role-based grouping inside each layer when
needed.
Shared database access lives in `src/config/database.ts`; user persistence lives in
`src/repositories/user.repository.ts`. Role-specific folders will be added when
role-specific functionality exists. Patient registration uses `routes/patient/`,
`controllers/patient/`, `services/patient/`, and `validation/patient/`. Shared
errors and error middleware live in `errors/` and `middleware/`.

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

The initial SQL migration is included. The configured database's User table was
verified with a read-only query during registration setup; no migration was applied
by that check. For a new database, only after
explicitly approving the target database, apply it from `BE/` with
`npx prisma migrate deploy`. Do not use reset or schema push to apply this migration.

The `User` model contains UUID id, firstName, unique email, passwordHash, PATIENT
role, and createdAt/updatedAt timestamps. Prisma supplies UUIDs and updatedAt on
client writes. The repository trims and lowercases emails for writes and lookups;
the database unique constraint protects normalized emails against duplicates.
Future write paths must preserve this normalization. The repository accepts only
an already-hashed password; the registration service hashes passwords after request
validation in the controller. Repository records are internal and must not be returned
directly from future API handlers because they include passwordHash.

`Session` links to `User` and stores a unique SHA-256 refresh-token hash, expiry,
nullable revocation timestamp, and created/updated timestamps. The additive session
migration was applied only to the configured localhost development database.
No seed credentials or other business models are added.
Phone is intentionally omitted for review: the current sign-up form uses email
and password, while earlier patient requirements mentioned phone.

Tooling note: installation on Node 20.19 reports a Node 22+ engine warning from
the transitive `@prisma/streams-local` package. Validation, client generation,
type-check, and build pass. The offline `prisma migrate diff` command exited
without producing SQL in this environment, so the initial migration was authored
from the schema and reviewed manually; it has not been database-tested.

## Patient registration

Send JSON to `POST /api/v1/auth/register` with exactly these fields:

- `firstName`: string, trimmed, 1–100 characters.
- `email`: valid email string, trimmed and lowercased, at most 254 characters.
- `password`: string, 8–128 characters (JavaScript UTF-16 length); whitespace is
  preserved. Passwords are never trimmed, returned, or logged.

Zod validates requests. Unknown fields, including any supplied `role`, are rejected.
The repository always assigns `PATIENT`. Passwords are hashed using Argon2id via
`@node-rs/argon2` with a random salt, 64 MiB memory, 3 iterations, and parallelism 1.

Success returns HTTP 201 with only `id`, `firstName`, `email`, `role`, and `createdAt`.
Errors use `{ "message": "..." }`:

- 400: `Invalid registration input` or `Invalid JSON body`.
- 409: `Email is already registered`, including unique-constraint races.
- 413: `Request body too large` (16 KiB JSON limit).
- 500: `Internal server error`; no internal error details or stack traces.

Registration creates no session, tokens, or cookies. No shared rate limiter exists
yet; rate limiting remains for
the security module.

Tests use Node's built-in test runner through `tsx`, real Argon2id hashing, and a
mocked repository. They cover success, input limits, role injection, duplicate
email (including races), safe response fields, malformed JSON, and safe errors.
Run `npm run db:generate` before `npm test` on a fresh installation. Tests do not
query or write the configured database; no additional test framework is required.

## Email/password login and sessions

Send JSON to `POST /api/v1/auth/login` containing only `email` and `password`.
Email is validated, trimmed, lowercased, and limited to 254 characters. Password
must be a nonempty string of at most 128 UTF-16 code units; whitespace is preserved.
Login does not impose registration's minimum length on existing credentials.
Unknown fields, including `role`, are rejected with 400 `Invalid login input`.

The existing repository retrieves the user; `@node-rs/argon2` verifies the stored
hash. Unknown email and incorrect password both return HTTP 401 with
`{"message":"Invalid email or password"}`. Unknown accounts still perform Argon2
verification against a cached dummy hash to avoid a cheap early return.

Valid credentials return HTTP 200 with `{ user, accessToken }`; `user` contains only
`id`, `firstName`, `email`, `role`, and `createdAt`. Passwords and hashes are never
returned or logged. JSON parsing errors,
the 16 KiB body limit, and unexpected errors use the existing centralized handler.

Each successful login creates a session before sending credentials to the client.
The refresh token is 32 random bytes encoded as base64url. Only its SHA-256 hash is
persisted; the raw token is delivered only in the `refresh_token` HttpOnly cookie.
The host-only cookie has path `/api/v1/auth` and expires with the session in 30 days.
Responses use `Cache-Control: no-store`. The HS256 access JWT expires in 15 minutes
and contains only `sub` (user ID), `role`, `iat`, and `exp`.

`sessionConfig()` validates the signing key and browser settings before server
startup. Health still performs no database query. The frontend is documented at
`http://localhost:3000`, and the API defaults to `http://localhost:4000`. These exact
origins are the development defaults. Set `FRONTEND_ORIGIN` and `API_ORIGIN` to your
actual deployment origins (no paths or trailing slash). Production requires both
explicitly and requires HTTPS.

Credentialed CORS allows only the configured frontend origin, never `*`. Other
browser origins are rejected before session creation; same-origin API requests and
non-browser requests without an Origin header remain supported. Frontend login
fetches must use `credentials: 'include'`. No frontend files were changed.

`COOKIE_SECURE` defaults from the API scheme. It can be `false` only for local
development origins; production requires `true`. `COOKIE_SAME_SITE` accepts
`lax`, `strict`, or `none`: the default is `lax` for the same hostname and scheme,
otherwise `none`. `none` requires Secure and an HTTPS API. For same-site production
subdomains you may explicitly choose `lax`; for genuinely cross-site deployments
use `none` and account for browsers that block third-party cookies. Do not mix
`localhost` and `127.0.0.1` between frontend and API in local development.

The internal repository can set `revokedAt` for later revocation workflows.
Revoking a
session will not retroactively invalidate its already-issued access JWT, which
expires after 15 minutes. Logout-all uses shared access-token verification;
no protected business routes, OAuth, or phone OTP endpoints are included.

`npm test` runs registration and login tests with mocked repositories and real
Argon2 hashing/verification, including registration-to-login compatibility, generic
credential failures, invalid input, safe responses, and application route wiring.
Session tests also verify JWT signatures/claims, hash-only persistence, cookie flags,
failed-persistence behavior, configuration validation, and credentialed CORS.

## Refresh rotation

Send `POST /api/v1/auth/refresh` with `credentials: 'include'`. Only the configured
`refresh_token` cookie is used; body, query, and Authorization values are not
credentials, and body user IDs/roles are ignored. No request body is required.
The existing origin allowlist remains in force.

Success returns HTTP 200 with only `{ accessToken }`, `Cache-Control: no-store`,
and a rotated refresh cookie using the same HttpOnly, Secure, SameSite, host-only,
and `/api/v1/auth` path policy as login. Refresh expiry slides to 30 days from each
successful rotation; the access JWT lasts 15 minutes with only sub, role, iat, exp.
Missing, malformed, unknown, expired, revoked, and consumed cookies all return
401 `{ "message": "Invalid refresh token" }` with no new cookie or credentials.

Each login's Session row is one family. `consumedTokenHashes` retains only SHA-256
hashes of previously rotated credentials. A PostgreSQL transaction locks the family
row, checks current state, and atomically moves the old hash into history while
replacing it with the new hash. Two requests using the same token cannot both
succeed. Reuse of any consumed or revoked token revokes the family, including the
winner of a concurrent race, and emits a structured `refresh_token_reuse` event
containing only the session ID. Clients must serialize refresh calls across tabs;
a lost response followed by retrying the old token requires logging in again.

Revocation is committed before responding 401. Other login sessions remain
independent. Already-issued access JWTs remain valid until expiry. History is
retained for the family's lifetime; a future cleanup job should remove expired
families as a unit rather than discarding individual replay hashes prematurely.

The additive migration `20261028000000_refresh_rotation` adds the hash-history
array and GIN index without resetting existing sessions. `npm test` includes HTTP
refresh tests with mocked persistence. `npm run test:refresh:db` separately runs
the actual PostgreSQL concurrency/replay checks, requires a loopback database in
development mode, and creates/removes only its UUID-owned test fixture.

## Current-device logout

Send `POST /api/v1/auth/logout` with `credentials: 'include'`; no body is needed.
Only the named refresh cookie is used. Body user IDs, session IDs, and tokens are
ignored. The service hashes the cookie with SHA-256, and a single database update
revokes only the matching current, unexpired, non-revoked session. Other devices
and login sessions are untouched. Consumed rotation tokens are treated as invalid
for logout and do not trigger refresh replay handling.

Returns HTTP 200 `{ "message": "Logged out" }` for valid, missing, malformed,
unknown, expired, or already-revoked cookies. All these cases expire the host-only
refresh cookie using the same name, path, HttpOnly, SameSite, and Secure settings
as login/refresh. Responses use `Cache-Control: no-store`. The frontend should also
discard its access token; previously issued access JWTs remain valid until expiry.

Unexpected database failures return the existing sanitized 500 response rather
than claiming revocation succeeded; the cookie is still cleared. No raw tokens,
hashes, or database details are logged or returned. The origin allowlist still
applies.

`npm test` includes logout HTTP/unit tests. `npm run test:logout:db` checks actual
revocation, repeated logout, expired/consumed credentials, and isolation from other
sessions on loopback PostgreSQL in development mode. It removes only its own
UUID-owned fixture afterward. This endpoint requires no schema migration.

## Logout from all devices

Send `POST /api/v1/auth/logout-all` with `Authorization: Bearer <accessToken>` and
`credentials: 'include'` to clear the current browser's cookie. No body is needed.
The shared `authenticate` middleware verifies the HS256 signature with the
configured signing key, JWT type, expiry, maximum 15-minute lifetime, issued-at,
UUID subject, and supported PATIENT role. Missing, expired, malformed, or invalid
tokens return 401 `{ "message": "Unauthorized" }` before any session changes.
A refresh cookie alone is not sufficient authentication.

The controller reads the user ID only from verified server-side authentication
context. Body/query user IDs, session IDs, and roles are ignored. One database
update revokes all unexpired, non-revoked sessions belonging to that user; sessions
belonging to other users are untouched. Expired and previously revoked rows are
left unchanged. Repeated calls with a still-valid access token are safe.

Success returns 200 `{ "message": "Logged out from all devices" }` and clears the
current device's refresh cookie with the existing name, path, host-only domain
policy, HttpOnly, SameSite, and Secure options. No counts, tokens, or session details
are returned. Unexpected database failures use the sanitized 500 error response.
Other devices retain their cookie locally but cannot refresh using revoked sessions.
Already-issued access JWTs remain valid until expiry; no immediate access-token
revocation mechanism is introduced by this endpoint.

`npm test` includes verification and endpoint tests; `npm run test:logout-all:db`
verifies multi-session revocation and isolation between users on the configured
local development database, cleaning up only its own UUID-owned fixtures. No schema
migration or social sign-in endpoints are required for logout-all.

## Password reset

Request: `POST /api/v1/auth/password-reset/request` with `{ "email": "..." }`.
Email is validated and normalized using registration's rules. Valid requests return
200 `{ "message": "Password reset request received" }` for both known and unknown
accounts. This response does not claim that an email was sent. Unknown fields are
rejected. Existing accounts get a 32-byte random token with a 30-minute expiry;
only its SHA-256 hash is stored in `PasswordResetToken` with user ID and used/revoked
state. Delivery failures keep the same public response and emit only a generic
event, never provider errors, addresses, passwords, or tokens.

Resend's official Node.js SDK provides email delivery. In development,
`PASSWORD_RESET_DELIVERY=development-file` (the development default) writes a
private JSON message to `BE/.local/password-reset/`. Open the newest JSON file
locally in your editor to inspect the link. Its URL fragment contains `token=...`;
use that token in the confirm request. No email is sent, and there is no public
outbox endpoint. The directory is Git-ignored, files are created with restrictive
permissions where supported, and messages must not be committed or shared. Remove
expired development messages locally when no longer needed. The frontend reset
page is not implemented by this backend change.

Production/test modes cannot use the file delivery adapter. For local email testing,
set `NODE_ENV=development`, `PASSWORD_RESET_DELIVERY=resend`, and
`PASSWORD_RESET_FROM=onboarding@resend.dev`, with a valid Resend API key.
The shared sender can deliver to the email address associated with your Resend account;
register that same email in this application before requesting a reset. This sender
is rejected outside development. Restart the backend after editing `.env`.

To enable production email:

1. Add a sending domain in the Resend dashboard, publish its required DNS records,
   and wait for verification. Use a sender address on that verified domain, not
   `onboarding@resend.dev`. Resend enforces domain verification when sending; local
   validation checks syntax and rejects sample senders but cannot attest DNS status.
2. Create a Resend sending API key scoped to that domain where possible. Store it
   as `RESEND_API_KEY` in the backend environment; never use a frontend/public env var.
3. Set `PASSWORD_RESET_DELIVERY=resend` and `PASSWORD_RESET_FROM` to the plain sender
   address (without a display name). The adapter adds the SwasthyaSetu display name.
4. Set `FRONTEND_ORIGIN` to the actual frontend origin (HTTPS in production).
   Configure the reset page at `/password-reset` to read `token` from the URL fragment
   and POST it with `newPassword` to the confirm API. No frontend page is added here.
5. Disable link-click tracking for security emails on the sending domain so reset
   links are not rewritten through a tracking service. Restart the backend.

See [Resend domain setup](https://resend.com/docs/dashboard/domains/introduction)
and the [official Node SDK](https://github.com/resend/resend-node). `.env.example`
contains only placeholders; replace them privately before enabling Resend. Startup
validates the delivery mode, required API key and sender. Production defaults to
Resend when no mode is specified; development defaults to the file outbox. No
real credentials were installed and no live email was sent during implementation.

The HTML/text email has the subject `Reset your SwasthyaSetu password`, a single-use
30-minute reset link, and an ignore-if-unrequested notice. Only the link carries
the token. URLs use the configured frontend origin, never the request Host header,
and a fragment to keep tokens out of URL query logs. Resend errors and exceptions
are sanitized, the newly created token is revoked on delivery failure, and the
public request response remains generic. There is no fallback to file delivery
when Resend fails. The file outbox can never be enabled in production.

Confirm: `POST /api/v1/auth/password-reset/confirm` with
`{ "token": "...", "newPassword": "..." }`. Password rules match registration
(currently 8–128 UTF-16 code units, no trimming). Argon2id parameters match
registration. Only these two fields are accepted; role and email cannot change.
Success returns 200 `{ "message": "Password reset complete. Please sign in again." }`
and clears the current refresh cookie. Invalid, unknown, expired, revoked, or used
tokens return 400 `{ "message": "Invalid or expired reset token" }`.

A database transaction locks the user, atomically consumes an eligible token,
updates only passwordHash, revokes all active refresh sessions, and revokes other
outstanding reset tokens. Concurrent confirmations cannot both succeed. Invalid
attempts do not change passwords or sessions. Already-issued access JWTs retain
their existing expiry (up to 15 minutes); users must sign in again to obtain new
credentials after reset. No auto-login is performed. There is no shared rate limiter
yet; rate limiting remains part of the security module.

The additive `20261028010000_password_reset` migration introduces the token table.
`npm test` covers the HTTP/service contract and mocks Resend's SDK send method:
tests never send real email. It covers branded link construction, SDK failures,
token invalidation and log redaction as well as the existing reset behavior.
`npm run test:password-reset:db` tests real concurrent consumption, password updates,
token invalidation, and session revocation on loopback development PostgreSQL and
cleans up only its own UUID-owned fixtures. No social login or phone OTP is added.

## Current user profile

GET /api/v1/auth/me requires Authorization: Bearer <accessToken> and returns
200 with { user: { id, firstName, email, role, createdAt } } from PostgreSQL.
The verified authentication context supplies the user ID; query/body identity
values are ignored. Missing/invalid tokens, deleted users, and users with a
non-null disabledAt receive 401 { "message": "Unauthorized" }.
The response is non-cacheable and creates no tokens, cookies, or session updates.

Apply the additive 20261030000000_user_disabled_at migration to the approved
target database before deploying this endpoint. It adds nullable User.disabledAt;
existing users remain enabled. This endpoint checks that field; it does not
introduce an account-management API or alter login/refresh behavior.

The me tests run with npm test using real JWT verification and mocked repository
access; they do not query or modify PostgreSQL.

