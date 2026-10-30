import { API_ERROR_MESSAGES } from "../constants/messages.js";
import cors from "cors";
import type { RequestHandler } from "express";
import { browserConfig } from "../config/session.js";
import { HttpError } from "../errors/http-error.js";

/**
 * Called by app.ts before routing. Checks the requesting website's origin and
 * adds CORS headers; it does not authenticate the user or check an access token.
 * req = incoming request, res = outgoing response, next = continue Express flow.
 */
export const browserAccess: RequestHandler = (req, res, next) => {
  // Read/validate settings and return here; browserConfig does not call middleware.
  const config = browserConfig();
  // Origin identifies the website making the request, not the API's destination.
  // Non-browser clients can omit it, so its absence is allowed by this check.
  const origin = req.get("origin");
  // Reject untrusted browser origins before any cookie-creating side effects.
  if (
    origin &&
    origin !== config.frontendOrigin &&
    origin !== config.apiOrigin
  ) {
    // next(error) skips routing and goes to errorHandler in app.ts.
    next(new HttpError(403, API_ERROR_MESSAGES.ORIGIN_NOT_ALLOWED));
    // next() does not stop JavaScript execution; return prevents running CORS too.
    return;
  }
  // cors(options) creates a middleware function; (req, res, next) runs it now.
  // For ordinary requests it adds headers and calls next() -> routes/index.ts.
  // For a preflight OPTIONS request it normally responds 204 and ends the flow.
  cors({
    origin: config.frontendOrigin,
    // Allows credentialed browser requests; the frontend still needs
    // fetch(..., { credentials: 'include' }) to send/receive cookies cross-origin.
    credentials: true,
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })(req, res, next);
};
