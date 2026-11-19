This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

Authentication connects to the Express API. Set `NEXT_PUBLIC_API_ORIGIN` in
`.env.local` (local default http://localhost:4000). Login and profile restoration
use HttpOnly cookies; API requests include credentials and X-CSRF-Protection: 1.
Configure the backend FRONTEND_ORIGIN to match this frontend exactly. See
../BE/README.md, "Browser authentication cookies", for deployment settings.
Run `npm run test:auth` for the cookie-client tests.

The sign-in page offers Admin Login and Doctor Login. Admin uses
/api/v1/admin/auth/login and redirects to /admin; Doctor uses
/api/v1/clinic/auth/login and redirects to /workspace. /admin-sign-in opens the
same form with Admin selected. Credentials are sent with cookies and CSRF headers;
no tokens are stored in browser storage. Wrong credentials/account types show
the same generic error. Existing signup is unchanged.
Test with `npm run dev`: try each role with matching credentials, wrong passwords,
and credentials of the other role. Check redirects and HttpOnly cookies in DevTools.
The dashboard shells still use preview data; role access is handled by the shared route guard described below.

Role navigation now checks the cookie session before displaying page content.
Public marketplace routes (/, /search, /facilities/*, /doctors/*) allow guests and
Patients. /appointments/* requires PATIENT; /workspace and /doctor/application-status
require DOCTOR; /admin/* requires ADMIN. Unknown roles/unauthorized routes go to
/forbidden. Authentication failures show Retry rather than revealing protected UI.
The page guard is for navigation only; backend authorization is the security boundary.

/sign-in now includes Patient Login. Guard redirects save a validated returnTo
query parameter and role hint. Return URLs must be local allowed role paths;
external URLs, encoded paths, traversal and login loops are rejected. Patients
default to /, Admins to /admin, Doctors to /workspace. A Doctor with no single
approved facility profile is sent to /doctor/application-status instead. That
page shows pending/rejected applications, no application, multiple approvals,
or approved-but-profile-not-created states using the owner-scoped backend endpoint
GET /api/v1/doctor/facility/application-status. It never infers approval from login
claims or a profile 404. Admin's development-only restriction has been replaced
by the shared role guard. Existing dashboard preview data is unchanged.

Manual checks: visit /search and a clinic detail as a guest; open /appointments/new
and verify Patient login returns there; try returnTo=https://example.com and a
wrong-role path; sign in as Admin and Doctor and test cross-role navigation.
Test pending/rejected Doctor accounts, approved accounts without a profile, and
approved accounts with a profile. Simulate API failure and verify Retry/loading
screens show no protected content. No tokens are stored in browser storage.


## Local frontend/backend connection

Use http://localhost:3000 for the browser and http://localhost:4000 for the API.
FE/.env.local contains NEXT_PUBLIC_API_ORIGIN=http://localhost:4000; copy the
committable .env.example on a fresh checkout. BE/.env uses PORT=4000,
FRONTEND_ORIGIN=http://localhost:3000, API_ORIGIN=http://localhost:4000,
COOKIE_SECURE=false and COOKIE_SAME_SITE=lax for development only.
Start `npm run dev` in BE and `npm run dev -- --port 3000` in FE, in separate terminals.
Restart after env changes. Do not mix localhost with 127.0.0.1. Existing auth and
role checks use the shared cookie API client; dashboard/demo marketplace data has
not been replaced with database queries by this configuration step.

## Live Admin application review

Sign in with Admin Login, then open /admin (live pending-review queue) or
/admin/facilities (all applications). Status filtering and page navigation use
URL query parameters and the backend's 20-item pagination. Open an application
for contact/facility details, services, applicant details, and review information.
Only PENDING applications show Approve/Reject actions; rejection requires a trimmed
1-2000 character reason. Successful reviews and 409 conflicts reload the detail.
A failed/uncertain write hides stale review actions until details are reloaded.

These screens reuse apiRequest, NEXT_PUBLIC_API_ORIGIN, HttpOnly cookies and
X-CSRF-Protection. Existing AccessGate protects all /admin routes; server-side
Admin authorization remains authoritative. No backend API or database change.
The former fictional dashboard snapshot/read-only preview banner is replaced;
other Admin sections remain their existing placeholders.

Run npm run test:admin and npm run test:auth. Manual checks: sign in as Admin,
filter each status, navigate pages, open an application, approve one and reject
another with a reason. Review the same application from two tabs to check the
409/latest-details behavior. Check empty lists, missing IDs and offline Retry.
Patient/Doctor/anonymous users must not see the Admin content. Browser interaction
and live production-data mutations are not performed by these automated tests.

## Admin directories

The protected Doctors, Appointment Slots, and Users & Roles pages use the shared
credentialed API client and the existing Admin-only route guard:

| Page | Backend API | Filters |
| --- | --- | --- |
| `/admin/doctors` | `/api/v1/admin/doctors` | Application status |
| `/admin/slots` | `/api/v1/admin/appointment-slots` | Availability, facility UUID, UTC start-time range |
| `/admin/users` | `/api/v1/admin/users` | Role |

Lists use 20 records per page with Previous/Next controls. Applying or clearing
filters returns to page 1. Loading, empty, error and Retry states are included.
Doctor applications link to existing Admin review details; multiple applications
are displayed. Slot times display in the facility timezone (UTC fallback), while
range inputs explicitly use UTC, inclusive from and exclusive to. Users & Roles
is read-only. No backend behavior, token storage, or Audit Log behavior changes.

Run `npm run test:admin`, `npm run test:auth`, `npx tsc --noEmit`, and `npm run lint`.
For a local manual check, sign in as Admin, visit all three pages, apply filters,
page through results and verify empty results and offline Retry. Confirm Patient,
Doctor and unauthenticated visitors cannot access the Admin content. The API must
be running at NEXT_PUBLIC_API_ORIGIN with its frontend origin configured for CORS.
Audit Log still requires an audit-event model and Admin listing API.

## Live Doctor facility workspace

`/workspace` reuses the existing workspace shell. The existing Doctor guard checks
role and approved-facility access before rendering. Pending/rejected applications,
missing profiles, and ambiguous approved applications retain their status-page flow.
The Dashboard displays the current approved facility, contact details and services.
Facility Profile edits only public fields. Services supports add, rename and remove.
Availability contains the weekly opening-hours editor and generated dated slots.
Appointment Requests and Doctors management remain unavailable, without demo data.

All requests use the shared cookie/CSRF API client and NEXT_PUBLIC_API_ORIGIN:

- GET/PATCH `/api/v1/doctor/facility`
- GET/POST `/api/v1/doctor/facility/services`
- PATCH/DELETE `/api/v1/doctor/facility/services/:serviceId`
- GET/PUT `/api/v1/doctor/facility/opening-hours`
- GET `/api/v1/doctor/facility/slots?from=YYYY-MM-DD&to=YYYY-MM-DD`

Opening hours require an explicit IANA timezone, all seven days, and up to 12
non-overlapping HH:mm periods per day. No periods means closed. The interval is
fixed at 30 minutes. Slots are generated by the backend for the chosen local-date
range (up to 31 days inclusive, today through 365 days ahead); the frontend never
creates, deletes or reserves slots directly. The backend preserves booked slots
when replacing schedules. Saving hours clears the displayed slot result; load the
range again to see current availability. Slot times display in the facility timezone.

No secrets or tokens are stored in JavaScript/localStorage. Backend ownership and
Doctor authorization remain the security boundary. No backend schema changes or
migrations are required. Run `npm run test:workspace`, `npm run test:auth`,
`npm run test:admin`, `npx tsc --noEmit`, `npm run lint`, and `npm run build`.
For local manual verification, sign in as a Doctor with exactly one approved
facility profile, visit each sidebar section, edit a profile/service, save a
schedule, and load a future date range. Verify closed days are empty and booked
slots still show Booked after editing hours. Verify Patient/Admin access is denied.
Use `npm run dev` for live source updates; `npm run start` serves a build and must
be restarted after a successful new build.

## Live patient booking

/search now lists real approved facilities with pagination and name/city/type
filters. /facilities/[facilityId] shows the public profile, services and live
facility-local availability. Selecting a slot opens /appointments/new with
facilityId, date and slotId. The existing Patient guard/login returnTo flow keeps
that selection through sign-in and revalidates it against current availability.

The frontend uses GET /api/v1/facilities, GET /api/v1/facilities/:facilityId,
GET /api/v1/facilities/:facilityId/slots?date=YYYY-MM-DD and the existing
POST /api/v1/patient/appointments. Only slotId and an optional trimmed
appointmentNote are submitted. Success is rendered inline only after 201 BOOKED,
using the returned confirmation ID, facility and slot times. It is not inferred
from URL parameters and is not persisted as a fake appointment record.

A 409 clears the chosen slot and reloads availability. A pending POST is protected
by a ref lock and disabled controls. Uncertain network/server outcomes do not
silently retry booking; the UI asks the patient to verify with the facility.
Cookie credentials/CSRF and refresh behavior use the existing shared API client.
No client-side tokens or new browser storage are introduced. The old demo
appointment-history screens are not a live patient appointment-list integration;
this flow does not route its confirmation through those screens.

Run npm run test:booking, npm run test:auth, npx tsc --noEmit and npm run build.
Manual check: browse as a guest, select a future slot, sign in as Patient, confirm
once, and verify BOOKED with the returned ID. In two signed-in Patient sessions,
select the same slot: one succeeds and the other sees refreshed availability.
Restart the backend to expose the new public endpoints; restart npm run start
in FE after rebuilding, or use npm run dev for source changes.
