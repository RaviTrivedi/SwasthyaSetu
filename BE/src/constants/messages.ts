// Public API response text. Keep secrets and provider/database details out of these.
export const API_ERROR_MESSAGES = {
  INVALID_DOCTOR_APPOINTMENTS_QUERY: 'Use page (1-100000), pageSize (1-100), and an optional date in YYYY-MM-DD format. Owner and facility IDs are not accepted.',
  INVALID_MARKETPLACE_QUERY: "Use a valid facility UUID, date=YYYY-MM-DD for slots, or supported list filters: page (1-100000), pageSize (1-50), query, city, facilityType (CLINIC or HOSPITAL).",
  INVALID_ADMIN_DIRECTORY_QUERY: "Provide page (1-100000), pageSize (1-100), and supported filters only. Doctor applicationStatus must be PENDING, APPROVED or REJECTED; user role must be PATIENT, ADMIN or DOCTOR; slot status must be AVAILABLE, BOOKED or UNAVAILABLE. Slot facilityId must be a UUID and from/to must be ISO timestamps with a timezone, with from before to.",
  OPENING_HOURS_NOT_FOUND: "Set opening hours for your approved facility before requesting slots.",
  INVALID_OPENING_HOURS: "Provide an IANA timezone and all seven unique days (0=Sunday through 6=Saturday). Use non-overlapping HH:mm periods with open before close; an empty periods array means closed. Additional fields are not allowed.",
  INVALID_SLOT_RANGE: "Provide date=YYYY-MM-DD or from/to dates, at most 31 days inclusive, from today through the next 365 days in the facility timezone. No additional fields are allowed.",
  SCHEDULE_CONFLICT: "The facility schedule changed concurrently. Please retry the request.",
  PATIENT_REQUIRED: "This action requires an active Patient account. Sign in through the patient login endpoint.",
  INVALID_APPOINTMENT: "Provide a valid slotId and optionally appointmentNote (1-2000 characters). Patient, facility, doctor, status and approval fields are not accepted.",
  SLOT_UNAVAILABLE: "This slot is already booked or no longer available. Please choose another slot.",
  DOCTOR_REQUIRED: "This action requires an active Doctor account. Sign in through the clinic login endpoint.",
  INVALID_FACILITY_SERVICE: "Provide a service name of 1-100 characters and a valid service ID when updating or deleting. No additional fields are accepted.",
  FACILITY_SERVICE_NOT_FOUND: "The service was not found in your approved facility.",
  FACILITY_SERVICE_LIMIT: "A facility may offer at most 50 services.",
  NOT_FOUND: "The requested resource was not found. Check the endpoint URL, HTTP method, and resource ID.",
  FACILITY_PROFILE_NOT_FOUND: "No approved facility profile found",
  FACILITY_PROFILE_EXISTS: "Facility profile already exists",
  MULTIPLE_FACILITIES: "Multiple approved applications exist; a single facility cannot be selected",
  INVALID_FACILITY_PROFILE: "The facility profile contains missing, invalid, or unsupported fields. Check the profile field formats and limits; owner, status, and approval fields cannot be edited here.",
  PROFILE_UPDATE_CONFLICT: "Facility profile changed concurrently; please retry",
  APPLICATION_NOT_REJECTED: "Only rejected applications can be reopened",
  CSRF_HEADER_REQUIRED: "Request blocked by CSRF protection. Send the X-CSRF-Protection header with the value 1 for this request.",
  ADMIN_REQUIRED: "This action requires an active platform admin account. Sign in through the admin login endpoint.",
  FORBIDDEN: "Your account does not have permission to perform this action.",
  INVALID_APPLICATION_REVIEW: "Check the application ID, status, pagination, and review fields. Rejection requires a non-empty reason of at most 2000 characters; reviewer ID cannot be supplied.",
  APPLICATION_ALREADY_REVIEWED: "Facility application is no longer pending",
  INVALID_FACILITY_APPLICATION: "Provide valid facility details, contact information, address, city, and at least one service. Status, applicant ID, and approval fields are assigned by the server.",
  INVALID_JSON: "The request body is not valid JSON. Check its syntax and send Content-Type: application/json.",
  BODY_TOO_LARGE: "The request body exceeds the size limit for this endpoint. Reduce the payload and try again.",
  INTERNAL_SERVER_ERROR: "The server could not complete this request. Try again later; use the X-Request-ID response header when reporting the problem.",
  ORIGIN_NOT_ALLOWED: "This website origin is not permitted to access the API. Use the configured frontend origin.",
  UNAUTHORIZED: "A valid sign-in session is required. Sign in again and send your access cookie or Bearer token.",
  INVALID_LOGIN_INPUT: "Provide a valid email address and a password. Extra fields such as role are not accepted.",
  INVALID_CREDENTIALS: "Invalid email or password",
  INVALID_REGISTRATION_INPUT: "Provide firstName (1-100 characters), a valid email, and password (8-128 characters). Extra fields such as role are not accepted.",
  EMAIL_ALREADY_REGISTERED: "Email is already registered",
  INVALID_REFRESH_TOKEN: "Your session cannot be refreshed because the refresh cookie is missing, invalid, expired, or already used. Sign in again.",
  INVALID_RESET_REQUEST: "Provide a valid email address in the email field. No additional fields are accepted.",
  INVALID_RESET_TOKEN: "The reset link is invalid, expired, already used, or not valid for this account type. Request a new link and provide a newPassword of 8-128 characters.",
  RESET_DELIVERY_UNAVAILABLE: "Password reset email delivery is currently unavailable. Please try again later.",
} as const;

export const API_SUCCESS_MESSAGES = {
  LOGGED_OUT: "Logged out",
  LOGGED_OUT_ALL: "Logged out from all devices",
  RESET_REQUEST_RECEIVED: "Password reset request received",
  PASSWORD_RESET_COMPLETE: "Password reset complete. Please sign in again.",
} as const;

// Configuration failures are internal diagnostics, not public API responses.
export const CONFIG_ERROR_MESSAGES = {
  INVALID_NODE_ENV: "NODE_ENV must be development, test, or production.",
  INVALID_PORT: "PORT must be an integer between 1 and 65535.",
  DEVELOPMENT_DELIVERY_ONLY:
    "Development file delivery is only allowed in development.",
  INVALID_DELIVERY_MODE:
    "PASSWORD_RESET_DELIVERY must be resend or development-file.",
  INVALID_RESEND_KEY:
    "RESEND_API_KEY must contain a valid Resend API key when Resend delivery is enabled.",
  INVALID_RESET_SENDER:
    "PASSWORD_RESET_FROM must be an email address on your verified Resend sending domain.",
  DATABASE_URL_REQUIRED:
    "DATABASE_URL is required when database functionality is enabled.",
  INVALID_DATABASE_URL:
    "DATABASE_URL must be a PostgreSQL URL with a host, user, database name, and valid port.",
  INVALID_COOKIE_SECURE: "COOKIE_SECURE must be true or false.",
  INSECURE_COOKIES_LOCAL_ONLY:
    "Insecure cookies are allowed only for local development origins.",
  SECURE_COOKIE_REQUIRES_HTTPS: "Secure cookies require an HTTPS API_ORIGIN.",
  INVALID_SAME_SITE: "COOKIE_SAME_SITE must be lax, strict, or none.",
  SAME_SITE_NONE_REQUIRES_SECURE:
    "SameSite=None requires Secure cookies and HTTPS.",
  INVALID_ACCESS_TOKEN_SECRET:
    "ACCESS_TOKEN_SECRET must be 32 random bytes encoded as 64 hexadecimal characters.",
  invalidOrigin: (name: string) =>
    `${name} must be an explicit HTTP(S) origin (HTTPS in production).`,
} as const;

export const INTERNAL_ERROR_MESSAGES = {
  INVALID_URL: "Invalid URL",
  INVALID_TOKEN_LIFETIME: "Invalid lifetime",
  DELIVERY_FAILED: "Delivery failed",
  RESET_DELIVERY_FAILED: "Password reset delivery failed",
  API_START_FAILED: "Failed to start API:",
} as const;



