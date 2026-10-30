import { CONFIG_ERROR_MESSAGES } from '../constants/messages.js';
import "./env.js";

/**
 * Shared settings for CORS and refresh cookies. Called during startup and by
 * request handlers. Returns configuration only; it does not create a session.
 * Tests can pass a separate source object instead of changing process.env.
 */
export function browserConfig(source: NodeJS.ProcessEnv = process.env): {
  frontendOrigin: string;
  apiOrigin: string;
  secure: boolean;
  sameSite: "lax" | "strict" | "none";
} {
  const production = source.NODE_ENV === "production";
  // Nested helper: read one origin, validate it, and return a parsed URL.
  // Production has no localhost fallback: deployment must supply both origins.
  function origin(name: string, fallback: string): URL {
    const value = source[name] ?? (production ? "" : fallback);

    try {
      const url = new URL(value);

      // Require an origin such as https://app.example.com, without paths,
      // trailing slashes, or embedded credentials.
      if (
        !["http:", "https:"].includes(url.protocol) ||
        url.origin !== value ||
        url.username ||
        url.password
      )
        throw new Error();
      if (production && url.protocol !== "https:") throw new Error();
      return url;
    } catch {
      throw new Error(
        CONFIG_ERROR_MESSAGES.invalidOrigin(name)
      );
    }
  }
  const frontend = origin("FRONTEND_ORIGIN", "http://localhost:3000");
  const api = origin("API_ORIGIN", `http://localhost:${source.PORT ?? "4000"}`);
  // Env values are strings. Convert explicitly; Boolean('false') would be true.
  const rawSecure =
    source.COOKIE_SECURE ?? (api.protocol === "https:" ? "true" : "false");
  if (!["true", "false"].includes(rawSecure))
    throw new Error(CONFIG_ERROR_MESSAGES.INVALID_COOKIE_SECURE);
  const secure = rawSecure === "true";
  const loopback = (url: URL) =>
    ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  if (!secure && (production || !loopback(api) || !loopback(frontend))) {
    throw new Error(
      CONFIG_ERROR_MESSAGES.INSECURE_COOKIES_LOCAL_ONLY
    );
  }
  if (secure && api.protocol !== "https:")
    throw new Error(CONFIG_ERROR_MESSAGES.SECURE_COOKIE_REQUIRES_HTTPS);
  // Decide when browsers may send the refresh cookie across sites.
  // This is the app's conservative default, not a full same-site domain detector;
  // deployments can override it for their frontend/API domain arrangement.
  const sameSite =
    source.COOKIE_SAME_SITE ??
    (frontend.hostname === api.hostname && frontend.protocol === api.protocol
      ? "lax"
      : "none");
  if (sameSite !== "lax" && sameSite !== "strict" && sameSite !== "none") {
    throw new Error(CONFIG_ERROR_MESSAGES.INVALID_SAME_SITE);
  }
  if (sameSite === "none" && !secure)
    throw new Error(CONFIG_ERROR_MESSAGES.SAME_SITE_NONE_REQUIRES_SECURE);
  return {
    frontendOrigin: frontend.origin,
    apiOrigin: api.origin,
    secure,
    sameSite,
  };
}

/**
 * Extend browser settings with the signing key and token lifetimes. Login/refresh
 * use these values to issue tokens; authenticate uses them to verify tokens.
 * Calling this function does not read or write PostgreSQL.
 */
export function sessionConfig(source: NodeJS.ProcessEnv = process.env) {
  const browser = browserConfig(source);
  const secret = source.ACCESS_TOKEN_SECRET;
  if (!secret || !/^[a-fA-F0-9]{64}$/.test(secret)) {
    throw new Error(
      CONFIG_ERROR_MESSAGES.INVALID_ACCESS_TOKEN_SECRET
    );
  }
  return {
    ...browser,
    // Decode the configured hex secret into the bytes used by JWT signing.
    signingKey: Buffer.from(secret, "hex"),
    accessTtlSeconds: 900,
    refreshTtlSeconds: 2592000,
  };
}
