// Public API response text. Keep secrets and provider/database details out of these.
export const API_ERROR_MESSAGES = {
  NOT_FOUND: "Not found",
  INVALID_JSON: "Invalid JSON body",
  BODY_TOO_LARGE: "Request body too large",
  INTERNAL_SERVER_ERROR: "Internal server error",
  ORIGIN_NOT_ALLOWED: "Origin not allowed",
  UNAUTHORIZED: "Unauthorized",
  INVALID_LOGIN_INPUT: "Invalid login input",
  INVALID_CREDENTIALS: "Invalid email or password",
  INVALID_REGISTRATION_INPUT: "Invalid registration input",
  EMAIL_ALREADY_REGISTERED: "Email is already registered",
  INVALID_REFRESH_TOKEN: "Invalid refresh token",
  INVALID_RESET_REQUEST: "Invalid password reset request",
  INVALID_RESET_TOKEN: "Invalid or expired reset token",
  RESET_DELIVERY_UNAVAILABLE: "Password reset delivery is unavailable",
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
