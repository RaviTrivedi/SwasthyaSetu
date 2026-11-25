# SwasthyaSetu API

Independent Express + TypeScript backend. Requires Node.js 20.19+ and npm.

## Doctor appointments

`GET /api/v1/doctor/facility/appointments` requires an authenticated active Doctor.
Optional query: `page` (1–100000), `pageSize` (1–100, default 20), and `date`
(`YYYY-MM-DD`, interpreted in the facility opening-hours timezone; UTC if unset).
Returns `{ items, total, page, pageSize, timezone }`, newest slot first. Each item
contains id, status, createdAt, appointmentNote, patient.firstName, and slot start/end.
Only the caller's approved facility is queried; no owner/facility IDs are accepted.
Missing facilities return 404; multiple approved facilities return 409. Responses
are not cached. Existing BOOKED appointments are confirmed and require no review;
historical PENDING records are returned with their original status. No migration needed.

## Local marketplace demo records

Run `npm run db:seed:marketplace` after applying existing migrations to your local
development database. This command refuses production and non-localhost database
URLs. It adds two clearly fictional hospitals and one clinic, their Doctor owners,
approved applications, public profiles, services/specialties and Asia/Kolkata opening
hours (Monday–Saturday, 09:00–17:00). These are development fixtures, not verified
providers; approval is pre-set only for these fixtures, without impersonating an admin.
Random owner passwords are hashed and discarded, and no login credentials are printed.
Reruns skip existing fixture IDs without modifying records; all inserts use one transaction.
No schema changes, resets, or deletion are required. The home page reads these records
through the public facility API, with no hardcoded facility or specialty fallback.

## Read-only Admin directories

All routes below require an authenticated, currently active ADMIN account using
the existing access cookie or Bearer token. Responses use `{ items, total, page,
pageSize }`. Pagination defaults to page 1 and 20 items; pageSize is at most 100,
page at most 100000. Unknown, repeated, or malformed query parameters return 400.
These are read-only APIs; there are no role-editing or audit-log endpoints.

- `GET /api/v1/admin/doctors`: optional `applicationStatus=PENDING|APPROVED|REJECTED`
  filters doctors having at least one matching application. Returns id, firstName,
  email, role, disabledAt, createdAt and all application summaries (id, facilityName,
  status, and nullable facility with id/name/type). Multiple applications are kept;
  no arbitrary facility is selected. Accounts without applications appear without
  this filter. Sorted by createdAt descending, then id descending.
- `GET /api/v1/admin/users`: optional `role=PATIENT|ADMIN|DOCTOR`. Returns id,
  firstName, email, role, disabledAt and createdAt across the existing three account
  tables, with one globally ordered page (createdAt descending, then id descending).
- `GET /api/v1/admin/appointment-slots`: optional `facilityId` UUID,
  `status=AVAILABLE|BOOKED|UNAVAILABLE`, and `from`/`to` ISO timestamps with explicit
  timezone (for example `2030-01-01T00:00:00Z`). The start-time range includes from
  and excludes to; when both are supplied, from must precede to. Returns id,
  startsAt, endsAt, status, nullable appointmentStatus, and facility id,
  facilityName and nullable timezone. Times serialize as UTC ISO timestamps;
  sort order is startsAt ascending, then id ascending. BOOKED means a reservation
  timestamp or linked appointment exists (including historical PENDING appointments).
  AVAILABLE means an unreserved future slot belonging to an approved application
  with an active Doctor owner. Everything else is UNAVAILABLE. This lists persisted
  slots only; it never generates slots or changes bookings.

Each list/count pair uses one repeatable-read database snapshot. Explicit safe
projections exclude password/reset/session data and patient appointment details.
No schema change or migration is needed for these endpoints.

## Current account storage (supersedes historical migration notes below)

There are exactly three login-account tables: Patient, Admin and Doctor. There
is no User or Account table after migration 20261104010000_separate_accounts.
Each stores its own name, email, passwordHash, roleId, disabledAt and timestamps.
Each roleId references the existing roles table; valid mappings are PATIENT,
ADMIN and DOCTOR respectively. Doctor means a clinic/hospital member account in
this project, not proof of professional qualifications or facility approval.

Patient signup uses /api/v1/auth/register; clinic member signup/signin remains at
/api/v1/clinic/auth/register and /login, assigning DOCTOR. Admin provisioning and
/api/v1/admin/auth/login use Admin. All still use the existing cookie/session flow.
No account needs a facility profile to register or sign in. Public signup never
accepts roleId or a role and never creates an admin account.

Email is normalized and unique across all three tables, enforced by PostgreSQL
triggers, including concurrent writes. IDs are globally unique too. Identity
inserts/email/role changes require READ COMMITTED isolation; the trigger rejects
higher-isolation identity writes to prevent stale duplicate checks. Application
repositories use the default READ COMMITTED mode. Role names are not editable
through any API. Sessions/applications retain verified account IDs and foreign
keys to exactly one account table, enforced by database constraints.

PasswordResetToken was replaced with resetTokenHash and resetExpiresAt on each
account. Only hashes are stored; tokens expire after 30 minutes. A new request
replaces the previous link. Confirmation atomically changes the password, clears
the reset fields and revokes sessions. Delivery failure clears only that link,
not a newer request's token. The migration preserves the latest active reset
link per account; older links become invalid.

FacilityApplicationReopening was removed. Admin review/reopening still updates
status, reviewer, review time and rejection reason atomically on FacilityApplication;
previous review history is no longer retained. The Facility table is unchanged.

Session.ipAddress records the IP at login; existing sessions have null. Express
uses the direct connection IP and ignores untrusted X-Forwarded-For headers.
Behind a reverse proxy this will be the proxy IP until you explicitly configure
trust proxy for your actual trusted proxy addresses. Do not blindly trust all
forwarded headers. IP is diagnostic metadata, never an authentication factor,
and is not returned in login responses or access tokens.

Deployment: stop the API, back up your database, run `npm run db:migrate`, then
`npm run db:generate` and `npm run build`, and restart. The schema/client changes
must deploy together. This migration has been tested on a disposable local
database but has NOT been applied to your configured database. Existing IDs,
passwords and sessions are preserved; ORGANIZATION/STAFF become DOCTOR. Refresh
or sign in again to receive updated role claims. The removed review-history
and older reset-link data are intentionally not retained. Historical migrations
remain untouched. Run `npm run test:accounts:db` and the existing database test
scripts only against a migrated local development database.

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

The account and credential models collectively contain UUID id, firstName, unique email, passwordHash, PATIENT
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

Valid credentials return HTTP 200 with `{ user }`; `user` contains only
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

Success returns HTTP 200 with `{ message: "Session refreshed" }`, `Cache-Control: no-store`,
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

GET /api/v1/auth/me requires the access-token cookie or Authorization: Bearer <accessToken> and returns
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


## Facility application submission

`POST /api/v1/facilities/applications` requires the access-token cookie or `Authorization: Bearer <accessToken>`.
The existing authentication middleware verifies the token; applicant identity comes
only from that verified context. No new roles or email verification are required.

Example JSON body:

```json
{
  "facilityName": "Community Clinic",
  "facilityType": "CLINIC",
  "contactPersonName": "Application Contact",
  "contactEmail": "contact@example.com",
  "contactPhone": "+919876543210",
  "address": "10 Main Road",
  "city": "Pune",
  "services": ["General consultation"]
}
```

Strings are trimmed; contactEmail is lowercased. Limits: facilityName 1�200,
contactPersonName/city 1�100, address 1�500, email at most 254 characters.
facilityType must be CLINIC or HOSPITAL. Phone uses international format: `+`
followed by 8�15 digits, starting with a nonzero digit. No existing phone validator
was present, so this uses Zod like the other request schemas. This checks format,
not ownership or whether a number is assigned. Optional description is at most
2000 characters. services requires 1�50 nonempty names of at most 100 characters.
The JSON body limit is 16 KiB. Unknown fields, including applicantId, userId,
status, approval fields, facilityId and documents, are rejected.

Returns 201 with the application fields plus id, applicantId, server-assigned
PENDING status, createdAt and updatedAt; omitted description returns null.
No user relation, password hash or session data is returned. Invalid fields return
400, missing/invalid authentication returns 401, oversized JSON returns 413,
and unexpected failures use the existing sanitized 500 response. Repeated valid
submissions create separate applications; no duplicate or approval policy is added.

Facility submission files live in the routes/controllers/services/validation
clinic folders. This grouping does not restrict submission by role. Shared persistence lives in facility-application.repository.ts.
The FacilityApplication model references User and restricts deletion of an applicant
while applications exist. No facility, review, upload, or document-storage models
or endpoints are included.

Migration: `20261030010000_facility_application` is additive and has not been
applied by this change. Following the existing explicit target-approval workflow,
review the configured local database and pending migrations before running from BE:

```sh
npx prisma migrate status
npx prisma migrate deploy
```

Do not use reset or schema push. Deploy applies all pending migrations, including
`20261030000000_user_disabled_at` if it is still pending. Apply migrations before
calling the new endpoint. Prisma Client generation alone does not create tables.

`npm test` includes facility submission tests with mocked persistence and signed
access tokens: normalization, invalid fields, authentication, ownership/status,
safe responses and sanitized errors. No database integration fixture is added.

## Admin facility application review

The admin category provides these authenticated endpoints:

- `GET /api/v1/admin/facility-applications?page=1&pageSize=20&status=PENDING`
  returns `{ items, total, page, pageSize }`. Status is optional and accepts
  PENDING, APPROVED or REJECTED. Page is 1-100000 and pageSize is 1-100.
  Results sort by createdAt descending, then ID descending. Unknown query fields
  and malformed pagination return 400.
- `GET /api/v1/admin/facility-applications/:applicationId` returns one application.
- `PATCH /api/v1/admin/facility-applications/:applicationId/status` accepts
  `{ "status": "APPROVED" }` or
  `{ "status": "REJECTED", "rejectionReason": "Missing required information" }`.
  It replaces the separate approve/reject URLs and returns the reviewed application.
  Only these two target statuses are accepted; the rejection reason is trimmed
  and must contain 1-2000 characters. Unknown body fields are rejected.

All endpoints verify the access cookie or Bearer token and require ADMIN, then check the
current database user is still an enabled ADMIN. A missing/invalid token returns
401; a non-admin, demoted, deleted or disabled account returns 403. Public
registration still assigns PATIENT; no public admin provisioning endpoint exists.
A trusted operator must provision/promote an admin account outside these APIs,
then sign in again to obtain an ADMIN token. No accounts are promoted by migration.

Review responses select only application fields, review metadata, and applicant
id, firstName and email. They contain no password hashes or session records.
Unknown UUIDs return 404 `Not found`; malformed UUIDs return 400. Reviewing any
non-PENDING application returns 409 `Facility application is no longer pending`.
The repository transaction conditionally updates PENDING status, reviewer ID,
review time and rejection reason together. Concurrent review attempts cannot both
succeed. Approval creates no facility/workspace or staff records and sends no email.

Migration `20261102000000_facility_application_review` adds ADMIN, APPROVED,
REJECTED and nullable reviewedByAdminId/reviewedAt/rejectionReason fields, plus
its reviewer foreign key. Existing application rows remain PENDING with null review
metadata. The migration has not been applied by this implementation. Follow the
existing target-approval workflow: inspect `npx prisma migrate status`, then apply
`npx prisma migrate deploy` to the approved local database. This applies all pending
migrations. No reset or schema push is needed. Generate the client with
`npm run db:generate` and restart the API afterward.

`npm test` covers authorization, listing/detail, review validation, unknown IDs,
status conflicts and sanitized responses with mocked persistence. The separate
`npm run test:admin-applications:db` checks real PostgreSQL concurrent reviews on
loopback development databases after migrations; it creates and removes only its
own UUID-owned fixtures. It is not part of the default test suite.

## Platform admin provisioning and sign-in

There is no public admin registration or promotion API. An authorized operator
with database access can create a new admin using `npm run admin:provision` from
BE/. This command is never run automatically during startup, install or migration.

Before provisioning, approve the intended database target and apply pending
migrations using the existing workflow (`npx prisma migrate status`, then
`npx prisma migrate deploy`). ADMIN already exists in the review migration;
this feature adds no schema migration. Run `npm run db:generate` if needed.

Supply these values privately through the command's environment or local ignored
BE/.env file (do not place passwords in command arguments or shell history):

- ADMIN_EMAIL: valid email, trimmed/lowercased, at most 254 characters.
- ADMIN_PASSWORD: 12-128 characters, preserved exactly; use a unique random password.
- ADMIN_FIRST_NAME: optional, trimmed 1-100 characters; defaults to Platform Admin.
- DATABASE_URL: intended PostgreSQL database.

Run `npm run admin:provision`, then remove the provisioning credentials from your
environment/.env. The command uses the registration Argon2id parameters and assigns
ADMIN internally. It creates no sessions and prints no account details or secrets.
An existing email (including an existing admin) causes a safe error and nonzero exit;
no password or role is changed. Unique-constraint races also fail safely. This is
repeat-safe creation, not an upsert or promotion workflow.

`POST /api/v1/admin/auth/login` accepts exactly `{ "email": "...", "password": "..." }`
using the existing login validation. Only enabled ADMIN accounts can sign in here.
Unknown email, incorrect password, disabled account and non-admin account all receive
401 `Invalid email or password`. Invalid request shapes return 400.
Success returns `{ user }` with safe user fields and sets a short-lived JWT in an HttpOnly cookie,
and sets the existing HttpOnly refresh cookie. Browser clients use credentials:
include and the same configured frontend origin/CORS settings as patient login.

Use `POST /api/v1/auth/refresh` and `POST /api/v1/auth/logout` for this session;
the cookie retains Path=/api/v1/auth. An admin-specific logout alias is unnecessary
and would not receive that cookie in browsers. Logout revokes the current stored
refresh session and clears the matching cookie; issued access JWTs retain their
short expiry. Logging in replaces the browser's existing refresh cookie, since
admin and patient sign-in use the same session mechanism, not separate cookie jars.

Admin review routes still require verified ADMIN claims plus a current enabled
ADMIN database user. Submission and patient route authorization is unchanged.
The existing generic login endpoint retains its prior behavior. No real admin is
provisioned by tests; npm test mocks persistence and email delivery.

## Database-backed roles

Roles now live in the `roles` table (Prisma model `Role`) with integer primary key
`id` and unique `name`. `User.roleId` is a required foreign key; each account has one
role. Current platform roles are PATIENT, ADMIN, DOCTOR, and STAFF. PATIENT is the
default. Registration and admin provisioning explicitly connect by role name,
never by a client-supplied roleId. Roles referenced by users cannot be deleted.

The migration `20261102010000_roles_table` inserts the initial roles, maps each
existing user's old enum value to roleId, enforces the foreign key, then removes
the old role column and enum in one transaction. Existing user/account/session
records remain. Back up the target before applying this schema conversion and
stop the API during deployment because the old and new clients expect different
column layouts. Following the existing approved-target workflow, run from BE:

```sh
npx prisma migrate status
npx prisma migrate deploy
npm run db:generate
npm run build
```

Restart the API after migration. This migration is supplied but not applied by the
implementation. Existing API user objects and access-token claims still contain
role names such as ADMIN; repositories resolve the relation internally. Admin
checks still require exactly ADMIN and recheck the current user in PostgreSQL.

New role names can be added as rows without editing a PostgreSQL enum. Adding a
role does not implement its permissions, routes, or a public role-assignment API.
Current known names used by authorization remain in src/constants/roles.ts.
All identities and credentials remain in User. Separate organization memberships and their permissions are future work.

## Reopening rejected applications

An enabled platform admin can use the existing status endpoint:

```http
PATCH /api/v1/admin/facility-applications/:applicationId/status
Content-Type: application/json
Authorization: Bearer <admin-access-token>

{ "status": "PENDING" }
```

Only REJECTED applications can be reopened. PENDING or APPROVED applications
return 409 `Only rejected applications can be reopened`; unknown IDs return 404.
Extra fields (including reviewer IDs and rejectionReason) are rejected for this
request. Approval and rejection still require a PENDING application.

Reopening clears current reviewedByAdminId, reviewedAt and rejectionReason.
Before committing, the same transaction appends a FacilityApplicationReopening
record with the previous review fields and the verified reopening admin/time.
Every reopening gets a separate record, retaining rejection history across repeated
review cycles. Audit records are internal persistence; no audit-list API is added.
Row locks and conditional updates prevent duplicate concurrent reopenings. An audit
write failure rolls back the state change. Existing rejections need no backfill:
their current review metadata is captured when first reopened.

Apply migration `20261102020000_application_reopening` to the approved local target
using the existing migration workflow before using this feature. It adds only the
reopening audit table; no migration was applied during implementation. The separate
`npm run test:admin-applications:db` includes concurrent reopening and audit checks
and requires migrations first. Default HTTP tests use mocked persistence.

## Browser authentication cookies (current contract)

Login (patient and admin) now returns only `{ user }`; refresh returns
`{ "message": "Session refreshed" }`. Neither response contains raw access or
refresh tokens. Both credentials are HttpOnly, host-only cookies:

| Cookie | Path | Lifetime |
| --- | --- | --- |
| access_token | /api/v1 | 15 minutes, matching the JWT expiry |
| refresh_token | /api/v1/auth | 30 days, rotated on refresh |

The refresh path is the narrowest common prefix for the existing refresh, logout
and logout-all routes. It also covers other auth endpoints; those endpoints never
use it as access authentication. Admin sign-in shares these cookies and uses the
same refresh/logout endpoints. Logout, logout-all and successful password reset
clear both cookies with matching paths/options. Session revocation semantics are
unchanged: an already copied access JWT expires within 15 minutes.

Authentication accepts the access cookie or an explicit Bearer header. A supplied
Authorization header takes precedence; invalid headers never fall back to cookies.
Postman can use its cookie jar after login; API responses no longer supply tokens
for copying into Authorization headers.

All state-changing requests (including login, refresh, logout and admin PATCH)
require `X-CSRF-Protection: 1`. This is a non-simple header, not a secret token:
HTML forms cannot set it, and cross-origin browsers must preflight. CORS allows
credentials only from the configured exact FRONTEND_ORIGIN and permits the header
and PATCH. Requests with an untrusted or null Origin are rejected; missing Origin
is supported for CLI clients only with the custom header on unsafe methods.
Do not bypass this middleware at a reverse proxy or allow arbitrary CORS origins.
GET/HEAD must remain read-only. HttpOnly alone is not the CSRF defense.

Local setup: FRONTEND_ORIGIN=http://localhost:3000, API_ORIGIN=http://localhost:4000,
COOKIE_SECURE=false, COOKIE_SAME_SITE=lax. Set FE/.env.local
`NEXT_PUBLIC_API_ORIGIN=http://localhost:4000`. Use the same hostname consistently.
Production requires exact HTTPS origins and COOKIE_SECURE=true. Configure SameSite
for the actual deployment: lax for same-site deployments, none with Secure for
cross-site deployments. Browser third-party-cookie policies can still block
cross-site cookies; same-site frontend/API deployment is preferred. Rebuild the
frontend after changing NEXT_PUBLIC_API_ORIGIN.

The frontend auth screen now calls Express, keeps only safe profile data in React
state, and reloads it via /auth/me. No localStorage token reads/writes existed in
the frontend, and none were added. Its shared JSON API client always includes
credentials and the CSRF header, coalesces refresh requests, and retries a 401 once.
Only protected requests whose authentication runs before side effects should use
this retry behavior. Login/register/logout opt out; network errors and other HTTP
failures are not retried. Web Locks coordinate tabs where supported; older browsers
without Web Locks only coalesce within a tab, so avoid simultaneous refresh across
tabs there. A failed refresh requires signing in again. No tokens reach JavaScript.

Checks: `npm test` in BE includes cookie/CSRF tests. `npm run test:auth` in FE tests
single refresh and bounded request retries with mocked fetch. No schema or database
migration is required for this cookie change.

## Approved facility profiles

`GET /api/v1/facilities/me` returns the authenticated owner's single approved
facility profile. `PATCH /api/v1/facilities/me` partially updates that profile.
Use the access-token cookie (credentials included) or a valid Bearer token; PATCH
also requires `X-CSRF-Protection: 1`. No clinic role is required: ownership comes
only from the verified user ID and approved application in the database.

PATCH accepts a nonempty subset of facilityName, facilityType, contactPersonName,
contactEmail, contactPhone, address, city, description, services. The same trimming,
email normalization, phone format and size limits as application submission apply.
Services replace the complete array; empty descriptions can clear the description.
Unknown fields, including IDs, status, applicant, owner and reviewer fields, are
rejected. JSON limit is 16 KiB. The response is the safe profile object with id,
public editable fields and timestamps, without applicant/reviewer data or secrets.

No approved application, a missing profile, a disabled owner, or an application
owned by another user results in 404 `No approved facility profile found`.
Multiple approved applications for one user return 409 rather than choosing one.
Invalid fields return 400; serialization conflicts return a safe retryable 409.
Profile edits never overwrite the submitted/reviewed application snapshot.

The Facility model has a unique applicationId relation. Approval no longer creates a profile. POST /api/v1/facilities/me explicitly creates it using the full application public fields (description optional), authentication, and X-CSRF-Protection: 1. It returns 201, or 409 if a profile already exists. It never creates staff accounts or changes roles. GET and PATCH do not create profiles.
Migration `20261103000000_facility_profile` creates the table and copies existing
APPROVED applications into profiles (using their UUIDs as the initial profile IDs).
No other business models or upload storage are introduced.

The migration has NOT been applied by this implementation. After approving the
configured local target, run `npm run db:migrate`, then `npm run db:generate` and
restart/rebuild the API. Migration deploy applies all pending migrations. Until
this migration is applied, profile calls and new approvals require the missing
table and will fail; generating the Prisma client alone does not create it.

`npm test` includes authenticated HTTP profile tests and repository query guard
checks with mocked persistence. Database integration tests remain separate and
require an approved migrated local database.



## Reversing the account registry migration

`20261103010000_account_registry` is retained unchanged because it was applied to
local development. `20261103030000_restore_shared_user` reverses that split in one
transaction: credentials and roles are copied back to the shared identity table,
then the temporary Account/Admin/FacilityStaff layout is removed. User IDs, password
hashes, emails, sessions, reset tokens and application relationships are preserved.
The existing unique User.email constraint remains; application logic normalizes emails.
The unapplied `20261103020000_user_profiles` migration was removed.

Run `npm run db:migrate`, `npm run db:generate`, and rebuild/restart the API. There
is no database reset and no editing of Prisma's applied migration history. The
platform roles remain PATIENT, ADMIN, DOCTOR and STAFF, as before the split.
Organization roles and profile tables are deferred.

## Clinic/hospital signup and signin

Clinic and hospital members can create a normal login account without a facility
application, approval, or public profile. Accounts use separate Patient, Admin and Doctor tables;
email is unique across patients, admins and doctors. Signup assigns
DOCTOR on the server. It does not grant admin privileges or membership of
any existing facility. Existing ORGANIZATION/STAFF accounts migrate to Doctor.

POST /api/v1/clinic/auth/register:
```json
{ "firstName": "Ravi", "email": "member@example.com", "password": "ChooseAStrongPassword123!" }
```
Returns 201 with id, firstName, email, role and createdAt. No session is created
until signin. The name is trimmed (1-100 characters), email trimmed/lowercased,
and password is 8-128 characters. Role and other unknown fields are rejected.
An email already used by any account returns 409.

POST /api/v1/clinic/auth/login accepts email and password only. It returns 200
with `{ "user": { ...safeFields } }` and the existing HttpOnly access/refresh
cookies. Unknown email, wrong password, disabled account and a different account
role all return the same 401. Send Content-Type: application/json and
X-CSRF-Protection: 1; browsers use credentials: include and an allowed origin.
Use /api/v1/auth/me, /refresh, /logout, /logout-all and /password-reset/request
and /password-reset/confirm under that same /api/v1/auth prefix for account
lifecycle operations. Neither tokens nor password hashes appear in responses.

Apply pending migrations with `npm run db:migrate` before using these new
endpoints, then restart the backend. Facility profile APIs are separate optional
functionality; signup/signin never calls them. No frontend changes are required
for testing these endpoints in Postman.

## Request error logs

Run `npm run dev` and watch the backend terminal. Centralized request errors are
logged as JSON: 4xx errors use console.warn and 5xx errors use console.error.
Each log contains a generated requestId, method, server-defined route template,
status, safe message and error type. The response includes X-Request-ID so you can
match a Postman/browser failure to its terminal entry. Existing response bodies
are unchanged. Errors occurring before route matching use a placeholder route.

Prisma failures include a code and troubleshooting hint. For example, P2025 on
clinic signup can mean the DOCTOR role has not been inserted yet; check
`npm run db:migrate`. This is a diagnostic possibility, not a guaranteed cause.
Development logs include source file/line locations; production omits them.
Raw exception messages/stacks, request bodies, URLs/query strings, cookies,
authorization headers and database metadata are deliberately not logged because
they may contain passwords, tokens, credentials or personal information.


## Admin and clinic password recovery

Both account types now have public recovery endpoints (no login required):

| Account | Request link | Confirm new password |
| --- | --- | --- |
| Admin | POST /api/v1/admin/auth/forgot-password | POST /api/v1/admin/auth/reset-password |
| Clinic/Doctor | POST /api/v1/clinic/auth/forgot-password | POST /api/v1/clinic/auth/reset-password |

Request body: `{ "email": "member@example.com" }`.
Confirm body: `{ "token": "token-from-email-link", "newPassword": "NewStrongPassword123!" }`.
Both prefixes also support `/password-reset/request` and `/password-reset/confirm`
for consistency with the existing patient routes. Send Content-Type: application/json
and X-CSRF-Protection: 1; browsers must use an allowed origin and include credentials.

The admin endpoints only operate on Admin accounts; clinic endpoints only operate
on Doctor accounts. Unknown emails and emails of another account type receive the
same generic 200 response. A token for another account type returns the same generic
400 as an invalid/expired/used token and is not consumed. The existing shared
/api/v1/auth/password-reset routes retain their previous compatibility behavior.

The same configured Resend delivery, frontend reset URL, 30-minute hashed tokens,
Argon2id password policy (8-128 characters), atomic token consumption, session
revocation and cookie clearing are reused. No new table, migration, or email
credentials are required. The reset page should submit to its account-specific
endpoint; the existing common reset URL remains usable through the shared endpoint.

## Actionable API errors

Errors keep the `{ "message": "..." }` response shape and existing HTTP status codes.
CSRF failures explicitly request `X-CSRF-Protection: 1`; admin authorization failures
explain that an active platform admin account is required. Missing/invalid sessions
explain how to sign in and send authentication. JSON, input and reset errors explain
what to check next. Login still uses the same generic response for unknown email,
wrong password and an account of another type, to avoid account enumeration.
Unexpected server failures stay generic; match X-Request-ID to the safe backend log
for diagnostic codes. Database/provider errors and raw request values are never
included in public error responses.

## Doctor facility operations

The existing clinic/provider layer now serves these Doctor-only endpoints:

- GET/PATCH `/api/v1/doctor/facility`: read/update the owned approved profile.
- GET/POST `/api/v1/doctor/facility/services`: list/add service records.
- PATCH/DELETE `/api/v1/doctor/facility/services/:serviceId`: rename/remove an owned service.

These require an active DOCTOR account, access cookie or Bearer token, and the
existing CSRF header on writes. Patient/admin accounts receive 403. Ownership and
approved status are checked in the repository as well as role authorization.
No profile (including pending/rejected applications) returns 404; multiple approved
applications return 409. Another facility's service ID returns 404.

Existing `/api/v1/facilities/me` profile creation/read/update remains compatible;
creation is explicit after approval. These new routes do not create a profile on
GET or change admin approval behavior. Use the existing POST `/facilities/me`
with complete profile fields to create it first. No new Doctor/staff profile is added.

PATCH profile accepts the existing editable fields only. Service POST/PATCH accepts
exactly `{ "name": "Consultation" }` (trimmed, 1-100 characters). Service responses
contain only id, name, createdAt, updatedAt; GET returns an array, POST returns 201,
PATCH returns 200, DELETE returns 204. Maximum 50 services; deleting all is allowed.
Profile PATCH services remains a full replacement (1-50 names), retaining IDs for
unchanged names. Profile responses still expose `services: string[]`. A renamed
service through its ID keeps that ID. Duplicate names remain supported for backward
compatibility. Serializable conflicts return 409 and may be retried.

Migration `20261106000000_facility_services` copies all existing Facility.services
names and ordering into FacilityService before removing the old array column.
FacilityApplication.services is unchanged. Stop the API and back up the database;
run `npm run db:migrate`, `npm run db:generate`, `npm run build`, then restart.
Do not run the old application build against the new schema. This migration has
not been applied to the configured database by this implementation.

## Facility opening hours and slots

Doctor owner APIs (same authentication, active-role, approved-ownership and CSRF
rules as the other Doctor facility routes):

- GET `/api/v1/doctor/facility/opening-hours`
- PUT `/api/v1/doctor/facility/opening-hours`
- GET `/api/v1/doctor/facility/slots?date=2030-01-01`
- GET `/api/v1/doctor/facility/slots?from=2030-01-01&to=2030-01-07`

PUT replaces the complete schedule and requires all seven unique days, Sunday=0
through Saturday=6. Empty periods means closed. Example:

```json
{
  "timezone": "Asia/Kolkata",
  "days": [
    { "day": 0, "periods": [] },
    { "day": 1, "periods": [{ "open": "09:00", "close": "11:00" }, { "open": "14:00", "close": "17:00" }] },
    { "day": 2, "periods": [{ "open": "09:00", "close": "17:00" }] },
    { "day": 3, "periods": [{ "open": "09:00", "close": "17:00" }] },
    { "day": 4, "periods": [{ "open": "09:00", "close": "17:00" }] },
    { "day": 5, "periods": [{ "open": "09:00", "close": "17:00" }] },
    { "day": 6, "periods": [] }
  ]
}
```

Times are zero-padded 24-hour HH:mm in the supplied IANA timezone. No overnight
periods or 24:00; open must precede close. Up to 12 non-overlapping periods per
day, adjacent periods allowed. Slots start at each period's opening and advance
30 minutes, with a full 30 minutes required before closing. Partial tails are
ignored. DST missing/ambiguous minutes and slots crossing those transitions are
skipped, never silently shifted. UTC timestamps are returned with timezone metadata.
Dates are interpreted in the current facility timezone, including preserved bookings.

GET slots materializes only the requested dates (maximum 31 inclusive, from local
today through today+365 days). Past dates are rejected; earlier times today are
excluded. It returns `{ timezone, intervalMinutes: 30, slots: [{ id, startsAt,
endsAt, booked }] }`. GET/PUT hours returns `{ timezone, days }`; no configured
schedule returns 404. Missing approved facility returns 404; multiple approved
applications return 409. IDs, interval and booking markers cannot be supplied.

Slots persist with unique (facilityId, startsAt) and a 30-minute database check.
Repeated generation preserves IDs. PUT deletes only future unbooked slots; booked
and historical rows remain unchanged, even after timezone changes. New availability
cannot overlap a booked slot. Generation and replacement lock the facility row in
serializable transactions; a concurrent conflict returns a safe 409 for retry.
The future booking implementation must lock the same facility, revalidate slot
availability and atomically set bookedAt. bookedAt is only a reservation marker;
there is no Booking model, booking API or cancellation API in this step.

Apply additive migration `20261113000000_facility_opening_hours` with the API stopped:
`npm run db:migrate`, `npm run db:generate`, `npm run build`, then restart. Existing
facilities have no configured schedule until PUT. No existing data is changed by
the migration. The migration is supplied but not applied to the configured database.

## Patient appointment booking

POST `/api/v1/patient/appointments` requires an active PATIENT account (access
cookie or Bearer token). Send `Content-Type: application/json` and
`X-CSRF-Protection: 1`. Example:

```json
{ "slotId": "00000000-0000-4000-8000-000000000001", "appointmentNote": "General consultation" }
```

Use an actual generated slot UUID. appointmentNote is optional, trimmed, 1-2000
characters when supplied. All other fields are rejected. Patient identity comes
only from verified authentication, never from body/query. No patient-profile setup
is required beyond the existing active Patient account.

Success is 201 with `{ id, facility: { id, facilityName, facilityType, address,
city, timezone }, slot: { startsAt, endsAt }, status: "BOOKED", createdAt }`.
The note and unrelated patient data are not returned or logged. Invalid input is
400; unauthenticated is 401; non-patient/disabled is 403. Missing, past, reserved,
or non-approved-facility slots all return the same 409 unavailable message.
A facility's Doctor account must also remain active. UTC slot instants and the
existing 30-minute duration are preserved. Successful bookings immediately confirm the appointment with status BOOKED; no facility review is required.

Booking locks the same Facility row used by schedule writes, holds the application
approval row for the transaction, conditionally sets bookedAt only on a future
unreserved slot, and inserts the appointment atomically. A unique Appointment.slotId
constraint prevents a second appointment; any insertion failure rolls back the
reservation. Schedule replacement continues preserving booked slots.

No approval/rejection, cancellation, notifications, guest booking or patient slot
search endpoint is added. For API testing, obtain slot IDs from the existing Doctor
slot-generation endpoint. Only the Patient account can submit the booking request.

Additive migration: `20261113010000_patient_appointments`. With the API stopped,
run `npm run db:migrate`, `npm run db:generate`, `npm run build`, then restart.
The migration has not been applied by this implementation. Existing data is kept.
`npm test` includes mocked booking tests. After migrating a local test database,
`npm run test:appointments:db` tests actual concurrent reservations, approval/past
checks and preservation on schedule replacement, cleaning only its UUID fixtures.


Immediate confirmation adds migrations `20261113020000_appointment_booked_status`
and `20261113020100_appointment_booked_default`. The enum addition is committed
before the new value is used as a default (PostgreSQL requirement). New API
appointments explicitly use BOOKED. Existing PENDING records and their slot
reservations remain unchanged; no historical records are auto-confirmed. Apply
with the API stopped using `npm run db:migrate`, then `npm run db:generate` and
`npm run build`, and restart. These migrations have not been applied here.


Concurrency verification: `npm run test:appointments:db` now submits two real HTTP
requests for one slot using different authenticated Patients and checks for exactly
one 201 BOOKED response, one 409, one appointment and a reserved slot. It also
forces a database insert failure with an oversized note (bypassing HTTP validation
only inside the test), checks the reservation rolled back, and books that slot
successfully afterward. Requires all migrations, including both BOOKED migrations.
No additional schema migration is needed for the concurrency guards.

GET /api/v1/doctor/facility/application-status is a read-only, active-Doctor-only
endpoint for frontend workspace routing. It scopes applications to the verified
Doctor and returns only application id/name/status, approvedCount and
profileAvailable. It does not expose reviewer/account details or change approval.
No migration is needed.

## Patient marketplace and booking

Public reads added for the frontend: GET /api/v1/facilities (page/pageSize,
query=facility-name search, city, facilityType), GET /api/v1/facilities/:facilityId,
and GET /api/v1/facilities/:facilityId/slots?date=YYYY-MM-DD. Only approved facilities
with an active Doctor owner are visible. Public projections omit account/contact
person details, application review data, secrets, and appointment/patient records.
Slots expose only id, UTC startsAt/endsAt and booked, plus facility timezone and
intervalMinutes=30. Dates are facility-local, from today through 365 days ahead.
A facility without a schedule returns an empty slot list and null timezone.

Availability reuses the existing generator and persists missing slots idempotently;
it never reserves or cancels slots. It uses the same facility lock as schedule
editing/booking and locks application approval during generation. The booking POST
remains Patient-only and retains its atomic reservation/unique slot constraint.
No schema changes or migrations are needed. Run npm test, npm run typecheck,
npm run db:validate and npm run build. Marketplace repository tests mock database
access; existing booking/slot tests cover reservation and generation behavior.
