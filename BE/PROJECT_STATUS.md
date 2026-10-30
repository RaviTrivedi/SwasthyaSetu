# SwasthyaSetu — Backend Project Status

Updated: 30 October 2026 (Asia/Kolkata)
Scope: current local working tree in BE/, related frontend integration, project PRD, and retrieved project-chat excerpts.

## Current position

**Stage: patient authentication foundation implemented; integration and production hardening remain.**

The backend has registration, login, persistent refresh sessions, refresh rotation/replay handling, current-device logout, logout-all, and password reset with a Resend delivery adapter. This is not yet the complete healthcare marketplace backend. Only PATIENT exists in the database role enum, and there are no marketplace business models or routes yet.

The latest work focused on password-reset email delivery and cleanup of shared roles, messages, configuration, and explanatory comments. Real email delivery and the complete browser flow have not been verified in this status review.

## Evidence and confidence

- Inspected current routes, Prisma schema, application/middleware/configuration, package scripts, tests, README, and frontend authentication submit handler.
- Read recent excerpts from the ChatGPT conversations linked below and the Codex implementation chat. This is a reconciliation of available excerpts, not a claim that every historical conversation was retrieved.
- Reviewed the draft product requirements in ../healthcare_marketplace_prd.md.
- Latest local commit inspected: 6438c35 — feat(auth): integrate Resend for password reset emails.
- The working tree already contains modified backend files and untracked configuration/constants. This status includes those local changes; it does not imply they are all committed.
- No tests, build, database queries/migrations, or live emails were run for this documentation update. Historical validation is explicitly separated below.

## Implemented in the current backend

| Area | Current implementation | Remaining boundary |
| --- | --- | --- |
| API foundation | Express 5, TypeScript/ESM, versioned routes, environment validation, centralized errors | Health endpoint checks HTTP responsiveness, not database readiness |
| Persistence | PostgreSQL, Prisma 7, layered controllers/services/repositories | Live database/schema state not checked in this review |
| Registration | Validated firstName/email/password, normalized email, duplicate protection, Argon2id hashing, server-assigned PATIENT | No email/phone verification; registration does not sign the user in |
| Login | Email/password verification, generic credential failures, persistent session and signed access JWT | No social login, OTP, MFA, or account suspension workflow |
| Sessions | 15-minute access JWT; opaque refresh token in HttpOnly cookie; only token hash stored | Issued access JWTs remain valid until expiry after session revocation |
| Refresh | Rotation, consumed-token hash history, transaction/row locking, replay revokes session family | Clients must serialize refresh requests; cleanup job remains pending |
| Logout | Current-session revocation and cookie clearing | Client must discard access token |
| Logout-all | Verified access token identifies user; active refresh sessions revoked | No immediate access-JWT invalidation |
| Password reset | Generic request response; hashed single-use 30-minute token; atomic password update and session/token revocation | Browser reset page and end-to-end integration pending |
| Email delivery | Resend SDK, branded HTML/text, failure sanitization and token revocation; development file adapter | Successful live delivery and production sender setup unverified |
| Browser access | Explicit origin checks, credentialed CORS, configurable refresh-cookie policy | Full deployment security review and abuse controls pending |
| Maintainability | Shared Prisma role export, shared response/configuration messages, separate delivery configuration | Only PATIENT is implemented, despite broader product roles |

### Available endpoints

All paths are prefixed with /api/v1.

| Method | Path | Purpose |
| --- | --- | --- |
| GET | /health | HTTP liveness |
| GET | /auth/me | Current safe database profile; rejects missing/disabled users |
| POST | /auth/register | Create patient account |
| POST | /auth/login | Sign in and create session |
| POST | /auth/refresh | Rotate refresh credential and issue access token |
| POST | /auth/logout | End current refresh session |
| POST | /auth/logout-all | End user's active refresh sessions |
| POST | /auth/password-reset/request | Request recovery with generic public response |
| POST | /auth/password-reset/confirm | Consume token and change password |

### Database artifacts

Current models: User, Session, PasswordResetToken. User now includes nullable disabledAt, checked by /auth/me; account-management and login/refresh enforcement remain outside this change. Current role: PATIENT.

Included migrations:
- 20261026000000_create_user
- 20261027000000_create_session
- 20261028000000_refresh_rotation
- 20261028010000_password_reset
- 20261030000000_user_disabled_at (added for /auth/me; not applied by this change)

Migration files establish intended schema, not proof that the current database has all migrations applied.

## Where the conversations left off

1. **Authentication scope:** the branch conversation broke auth into signup, verification, sign-in, sessions, authorization, recovery, logout, and security. The code now implements much of the password/session/recovery path; verification, broader authorization, and security work remain.
2. **Provider decision:** the main conversation explicitly chose Resend for reset emails while retaining PostgreSQL-backed passwords. Firebase credential migration was not the chosen implementation.
3. **Latest delivery troubleshooting:** the implementation chat first found development-file delivery, then sender validation problems. Current code allows onboarding@resend.dev only in development. The prior chat documented the test sender's recipient restriction; successful delivery was not demonstrated in the retrieved follow-up.
4. **Generic success response:** "Password reset request received" intentionally does not prove the account exists or that an email was delivered.
5. **Database concern remains unresolved:** the latest main-chat exchange reported other columns appearing deleted after an email update in pgAdmin. The retrieved reply proposed read-only schema/row inspection. There is no retrieved confirmation of the actual database state or resolution.
6. **Credential follow-up:** a Resend credential was pasted in the earlier chat, which advised revoking/replacing it. Rotation is not confirmed in the retrieved history. No credential is reproduced here.

## Frontend integration status

FE/components/features/auth/AuthScreen/index.tsx currently validates locally and displays that authentication/account creation is not connected. Its submit handler makes no backend request. It also contains older Firebase TODOs that conflict with the implemented PostgreSQL/Express authentication direction.

Remaining integration:
- Connect signup/login to the backend contracts.
- Handle access-token state, credentialed cookie requests, serialized refresh, logout, and logout-all.
- Implement recovery request and /password-reset confirmation UI; read the reset token from the URL fragment.
- Replace stale Firebase implementation notes when integrating the chosen backend.
- Verify browser behavior for the actual frontend/API origins and cookie settings.

## Planned product backend still missing

The PRD is a draft, so unresolved product policies must be settled before implementation.

| Product area | Backend status |
| --- | --- |
| Patient profile/contact management | No profile-management API |
| Clinic/hospital onboarding and approval | No organization model or workflow |
| Staff membership and tenant isolation | No facility membership/permission model |
| Doctor profiles and organization affiliations | No models or APIs |
| Specialty/service catalog and discovery/search | No models or APIs |
| Schedules, availability, breaks, leave | No models or APIs |
| Appointment request, approval, rejection, rescheduling, cancellation | No models or APIs |
| Booking notifications/reminders | No implementation beyond auth reset email |
| Platform administration and privileged audit trail | No backend implementation |

Product rules to preserve: only approved active organizations are discoverable; listed doctors require approved organization affiliation; appointment requests begin pending clinic approval; confirmation must re-check availability; organization data must be isolated.

Open PRD decisions include pending-slot holds, appointment transitions, cancellation/rescheduling rules, clinic response deadlines, and affiliation approval. Phone requirements also need reconciliation with the current email/password backend.

## Validation record

**Previously reported in the implementation chat:**
- Shared-message cleanup: 36 tests, type-check, and build passed.
- Subsequent delivery-configuration separation: type-check and 3 mocked Resend tests passed.
- Development test-sender adjustment: type-check and 3 mocked Resend tests passed.
- No live email was sent for that verification.

**Available repository checks:**
- npm test — registration, login, refresh, logout, logout-all, reset, and mocked Resend tests.
- npm run typecheck; npm run build; npm run db:validate.
- Separate PostgreSQL suites: test:refresh:db, test:logout:db, test:logout-all:db, test:password-reset:db.

The database suites create/remove fixtures on a loopback development database. Their current result is unverified; they are not included in npm test. Historical passing checks do not establish current database health, production readiness, or browser integration.

## Recommended next sequence

1. Resolve the reported database discrepancy with read-only schema and targeted row checks; verify migration state.
2. Confirm replacement of the previously exposed Resend credential, restart with intended delivery settings, and verify a controlled reset email.
3. Connect frontend registration/login/session/logout flows and implement the reset page; complete a browser reset-to-login test.
4. Add shared rate limiting and abuse controls; decide email/phone verification requirements.
5. Design staff/admin authorization and organization membership before exposing multi-organization APIs.
6. Implement organization onboarding, doctor affiliations, discovery, availability, then appointment approval with transactional conflict protection.
7. Add deployment/readiness checks, operational monitoring, audit events, and expired-session/token cleanup.

This order is a recommendation from the current evidence, not a newly approved feature scope.

## Sources

- [Healthcare Project Requirements](https://chatgpt.com/c/6acdd244-1a24-83ec-bd00-e465896842b9) — recent recovery/provider decisions and database concern.
- [Branch · Healthcare Project Requirements](https://chatgpt.com/c/6ad9f9e2-a90c-83ee-950e-ae1c04febd97) — authentication breakdown.
- Codex chat: Set up healthcare API backend (01a16ddb-9460-7ff0-898e-48516a1755ba) — recent implementation, checks, and delivery troubleshooting.
- [Backend README](README.md)
- [Prisma schema](prisma/schema.prisma)
- [Auth routes](src/routes/patient/auth.routes.ts)
- [Product requirements](../healthcare_marketplace_prd.md)
- [Frontend auth screen](../FE/components/features/auth/AuthScreen/index.tsx)
