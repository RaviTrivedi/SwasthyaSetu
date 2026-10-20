# Healthcare Discovery & Appointment Booking Platform

## Product Requirements Document (PRD)

**Status:** Draft for review  
**Version:** 0.1  
**Date:** 13 October 2026

## 1. Product summary

A healthcare marketplace that helps patients discover nearby hospitals, clinics, and doctors, explore care by medical specialty or health concern, and request appointments. Clinics and hospitals manage their own organization profiles, doctors, services, schedules, and appointment requests. Clinic staff must approve appointment requests before they are confirmed.

The product will launch as a responsive web experience. A React Native Expo patient app will follow, using the same backend API and PostgreSQL database. The marketplace supports multiple clinics and hospitals, with organization data and staff access separated by organization.

## 2. Problem and opportunity

Patients often have difficulty finding nearby care, understanding which specialty to choose, seeing appointment availability, and contacting a clinic to arrange a visit. Clinics need a structured way to present their services and manage incoming appointment requests. The platform brings discovery and booking together while leaving appointment approval and clinic operations under clinic control.

## 3. Goals

- Let patients find relevant nearby care and submit appointment requests.
- Let patients explore hospitals, clinics, and doctors by specialty or health concern.
- Let clinics manage their public presence, doctors, services, schedules, and bookings.
- Require clinic approval before any appointment becomes confirmed.
- Require every listed doctor to be affiliated with at least one approved clinic or hospital.
- Provide platform administrators tools to review clinic onboarding and operate the marketplace.
- Deliver web first, then mobile, with shared business rules and APIs.

## 4. Non-goals for initial release

These are not committed to the first release and require separate decisions: clinical diagnosis or treatment recommendations; emergency triage; telemedicine/video consultations; online payments; insurance claims; pharmacy/e-prescribing integrations; lab ordering; inpatient admission and bed management; health-record interoperability; public ratings and reviews; multi-language support; and automated clinical decision support.

The platform is a discovery and scheduling tool, not a substitute for medical assessment. Search by a health concern helps users find an appropriate service and does not diagnose them.

## 5. User roles

### 5.1 Patient

A person looking for care and requesting appointments with a chosen clinic, hospital, or affiliated doctor.

### 5.2 Doctor

A healthcare professional associated with at least one clinic or hospital. A doctor cannot publish a standalone profile or accept marketplace bookings without an active organization affiliation. Doctors can have affiliations with multiple organizations if permitted by each organization.

### 5.3 Clinic or hospital staff

Authorized staff who manage an organization workspace. The first release may use one staff role; finer roles such as owner, manager, and receptionist can be defined later. Staff can access only the organization(s) to which they are assigned.

### 5.4 Platform administrator

Platform operations role that reviews organization onboarding, manages marketplace categories and accounts, handles reports/support, and views operational metrics. Admin access to patient clinical information should be restricted and audited.

## 6. Product surfaces

### Web (first release)

- Public discovery and provider detail pages.
- Patient account and booking management.
- Clinic/hospital workspace for organization setup and operations.
- Doctor workspace for schedule and appointment work, subject to permissions.
- Platform administration workspace.

### Mobile (subsequent release)

- Expo app focused on patient discovery, booking, appointment management, and notifications.
- Uses the same API, identity, booking rules, and data as the web application.
- Clinic management remains supported on the web in the initial mobile release unless later prioritized.

## 7. Core patient experience

1. Patient opens the marketplace.
2. Patient shares location or enters a location manually.
3. Patient sees nearby hospitals and clinics, and can browse larger hospitals.
4. Patient can browse by specialty or health concern (examples: eye care, ENT, orthopedics, women’s health, general medicine).
5. Patient searches and filters results. Proposed listing information: name/type, distance/address, specialties/services, available appointment times, consultation fee if supplied, and rating/reviews only if those are later included.
6. Patient opens a clinic, hospital, or doctor profile and reviews relevant details.
7. Patient chooses a service, affiliated doctor, appointment type, and available time.
8. Patient submits an appointment request. The request is **Pending clinic approval**; it is not yet confirmed.
9. Clinic staff approve or reject the request. The patient receives the outcome and can view the appointment status.
10. Patient can request a change or cancel, subject to the cancellation policy.

## 8. Functional requirements

### 8.1 Discovery and search

- Display nearby hospitals and clinics, ordered by proximity when a location is available.
- Allow a patient to enter a location if they do not grant device location permission.
- Support browsing hospitals and their departments/services.
- Organize discovery categories using medical specialties and care services, not “diagnosis types.”
- Support search by location, organization/doctor name, specialty/service, and (if defined) availability and fee.
- Clearly label organization type and doctor affiliation.
- Do not imply a medical diagnosis from symptoms or body-area browsing.

### 8.2 Organization onboarding and profiles

- Clinic/hospital staff can submit an organization for platform review.
- Organization profile includes name, type, locations, address, contact details, operating hours, services/specialties, and relevant public description.
- Platform admin can approve, reject, request changes, or suspend an organization.
- Only approved and active organizations are publicly discoverable.
- Organization workspace data is isolated from other organizations.

### 8.3 Doctor affiliation and profile

- A doctor profile must be linked to at least one approved clinic or hospital before it can be listed or receive bookings.
- The system must represent and display the doctor’s organization affiliations.
- Affiliation must be authorized by the clinic/hospital. Exact invitation/request/approval workflow remains open.
- Doctor profile may include name, credentials, specialty, languages, experience, biography, consultation modes, and affiliated locations, subject to verification requirements to be defined.

### 8.4 Schedules and availability

- Organization staff and/or authorized doctors can configure working hours, appointment duration, breaks, exceptions, and leave.
- Availability shown to patients must account for the doctor, location, service, duration, and existing bookings/requests according to the agreed slot policy.
- Time zones must be handled consistently and displayed in the patient’s local context.
- Concurrent requests for the same slot must not create multiple confirmed appointments. Booking must use server-side validation and transactional safeguards.
- Whether a pending request temporarily holds a slot, and for how long, remains an open decision.

### 8.5 Appointment management

- Patient can request, view, reschedule, and cancel appointments.
- Clinic staff can view requests and approve or reject them, with optional reason/message.
- Appointment status must distinguish at minimum: Pending, Confirmed, Rejected, Cancelled, Completed, and No-show. Exact transitions and who can apply them must be specified.
- Approval must re-check availability to avoid conflicts.
- Notifications should be sent for request submission, approval/rejection, changes, cancellation, and reminders, via channels chosen for the first release.
- Clinic response deadline, auto-expiry behavior, cancellation rules, rescheduling rules, and no-response handling remain open.

### 8.6 Patient account and privacy

- Patient can register, sign in/out, recover access, and manage contact/profile information.
- Patient can view their own appointment history and status.
- Collect only information needed to discover and book care for the first release.
- Medical notes and prescriptions are not required for the first release unless explicitly added after privacy and access review.
- Patients must be able to understand what data is collected and how it is used.

### 8.7 Doctor workspace

- View assigned schedule and relevant appointment details.
- Update appointment status where authorized.
- Access only the patient information needed for care associated with their appointments.
- Consultation notes, diagnoses, prescriptions, and sharing visit summaries are optional scope and require further decisions on privacy, retention, and audit.

### 8.8 Clinic/hospital workspace

- Manage organization profile, locations, operating hours, departments/services, and consultation fees.
- Add/invite doctors and manage affiliations.
- Configure schedules and availability.
- Review, approve, reject, reschedule, and cancel appointment requests.
- View operational booking data for the organization.
- Manage staff membership and permissions (basic staff role at minimum; more granular roles to be decided).

### 8.9 Platform administration

- Review organization applications and verification details.
- Manage user and organization accounts, specialties, and service categories.
- Respond to support/reporting cases.
- View platform-level operational metrics.
- Record and audit privileged actions.
- Platform staff should not routinely access clinical information.

## 9. Non-functional requirements

- **Security:** role-based authorization; tenant/organization isolation enforced server-side; secure authentication and session/token handling; rate limiting; input validation; protection against common web vulnerabilities; secure secret management.
- **Privacy:** data minimization; clear consent and privacy notices; retention/deletion policy; access logging for sensitive records; privacy review before storing clinical data.
- **Reliability:** appointment operations must be transaction-safe and resilient to duplicate submissions and retries.
- **Performance:** discovery, profiles, and appointment views should remain responsive under expected launch traffic; numeric service targets to be agreed before production.
- **Accessibility:** responsive layouts, keyboard support, readable contrast, labels and validation usable with assistive technology.
- **Maintainability:** shared typed API contracts, documented status transitions, automated checks for authorization and booking conflicts.
- **Observability:** structured application logs, error monitoring, and operational audit events without logging unnecessary sensitive data.
- **Localization:** support India as initial market is a working assumption; currency, phone, address, and time-zone handling to be confirmed.

## 10. Proposed architecture and technology

- Web frontend: Next.js + TypeScript.
- API: Node.js + Express + TypeScript.
- Database: PostgreSQL + Prisma ORM.
- Location search: PostgreSQL geospatial support (PostGIS) may be added if radius/distance query needs justify it.
- Mobile client later: React Native + Expo.
- File storage: managed object storage if profile images or documents are needed.
- Notifications: email/SMS/push provider to be selected after channel and cost requirements are decided.

The web and Expo clients will use the same API and booking rules. PostgreSQL is recommended because clinics, doctors, affiliations, schedules, patients, and appointments have relational constraints and appointment approval needs transactional consistency.

## 11. Success measures

Initial candidate measures (targets to be set after validation):

- Patient search-to-profile and profile-to-request conversion.
- Appointment requests approved, rejected, or left unanswered.
- Time from request to clinic decision.
- Booking conflict/duplicate rate.
- Clinic onboarding completion and approval time.
- Patient cancellation and clinic cancellation rates.
- Patient and clinic task completion/error rates.

## 12. Risks and dependencies

- Healthcare privacy and regulatory obligations depend on launch geography and data collected; these must be reviewed before production use with real patient data.
- Organization and doctor credential verification process is not yet specified.
- Availability and pending-slot reservation rules affect booking fairness and conflicts.
- Clinic response-time expectations affect patient trust and appointment reliability.
- Location accuracy depends on address quality and geocoding/location services.
- Reviews, fees, online payments, and clinical records may add moderation, privacy, and operational complexity.

## 13. Open decisions

1. Initial geography and applicable legal/privacy requirements.
2. Patient account required before booking, or guest request allowed.
3. Can a patient book a specific doctor, a service at a clinic, or both?
4. Does a pending request reserve the slot? If so, for how long?
5. Clinic response deadline and what happens if no response arrives.
6. Appointment cancellation and rescheduling policy.
7. Booking duration, buffer time, walk-ins, and recurring schedules.
8. Doctor affiliation flow: clinic invitation, doctor request, or both.
9. Verification documents and who verifies clinics, hospitals, and doctors.
10. Whether ratings/reviews and consultation fees appear in the first release.
11. Notification channels for first release (email, SMS, WhatsApp, push).
12. Whether online payments, prescriptions, consultation notes, or telemedicine are in scope.
13. Patient age/minor and guardian booking handling.
14. Staff permission levels and doctor access to patient data.
15. Product branding, app name, and visual theme.

## 14. Delivery phases

### Phase 0 — Requirements and validation

Resolve open decisions, validate workflows with representative patients and clinic staff, and define privacy/security needs.

### Phase 1 — Web MVP

Build marketplace discovery, organization onboarding/review, doctor affiliation, schedules, patient appointment requests, clinic approval, account management, and notifications selected for MVP.

### Phase 2 — Web expansion

Add prioritized operational reporting, improved clinic controls, and any approved secondary features such as reviews or payments.

### Phase 3 — Expo patient app

Build patient discovery, booking, appointment management, and push notifications on the shared API.

### Phase 4 — Production readiness

Complete security/privacy review, load and recovery testing, monitoring, support processes, and launch readiness for the selected jurisdiction.

## 15. Current agreements

- The product is a marketplace where patients discover and compare healthcare options.
- Patients can find nearby hospitals and clinics, browse larger hospitals, and browse by specialty or health concern.
- Patients submit appointment requests; clinic/hospital staff approval is required before confirmation.
- Doctors must be affiliated with at least one clinic or hospital to be listed or accept appointments.
- Multiple clinics/hospitals use the platform with separate organization workspaces and data access.
- Build the web app first, then the Expo mobile app on the same backend.
- Proposed stack: Next.js, Node/Express/TypeScript, PostgreSQL/Prisma, then Expo.
- Provider listing details are a starting point and can be reduced during design if they feel crowded.

| Part | Area                                                   |
| ---- | ------------------------------------------------------ |
| 1    | Patient Home page                                      |
| 2    | Patient search results                                 |
| 3    | Clinic or hospital details                             |
| 4    | Doctor selection and profile                           |
| 5    | Appointment time selection                             |
| 6    | Booking details and phone OTP                          |
| 7    | Booking request confirmation                           |
| 8    | Patient appointments and profile                       |
| 9    | Clinic and hospital workspace                          |
| 10   | Doctor workspace                                       |
| 11   | Platform admin workspace                               |
| 12   | Connect the web app to the API and prepare for release |
