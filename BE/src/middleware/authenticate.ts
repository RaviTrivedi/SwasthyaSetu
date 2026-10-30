import { API_ERROR_MESSAGES, INTERNAL_ERROR_MESSAGES } from '../constants/messages.js';
import type { RequestHandler, Response } from "express";
import { jwtVerify } from "jose";
import { z } from "zod";
import { sessionConfig } from "../config/session.js";
import { HttpError } from "../errors/http-error.js";
import { Role } from "../constants/roles.js";

const claimsSchema = z.object({
  sub: z.uuid(),
  role: z.enum(Role),
  iat: z.number().int(),
  exp: z.number().int(),
});
const authContext = Symbol("verifiedAuthentication");
type Authentication = { userId: string; role: Role };

// Controllers call this after authenticate. res.locals belongs to this one request;
// the Symbol key keeps the verified context separate from ordinary string keys.
export function getAuthentication(res: Response): Authentication {
  const context = (res.locals as { [authContext]?: Authentication })[
    authContext
  ];
  if (!context) throw new HttpError(401, API_ERROR_MESSAGES.UNAUTHORIZED);
  return context;
}

// Factory runs at setup; the returned async function runs on each protected request.
export function createAuthenticate(config = sessionConfig): RequestHandler {
  return async (req, res, next) => {
    res.set("Cache-Control", "no-store");
    const match = /^Bearer ([^\s]+)$/i.exec(req.get("authorization") ?? "");
    if (!match) throw new HttpError(401, API_ERROR_MESSAGES.UNAUTHORIZED);
    const settings = config();
    try {
      // await pauses this handler until verification finishes. No controller runs
      // yet. Invalid/expired signatures throw and become a generic 401 below.
      const { payload } = await jwtVerify(match[1]!, settings.signingKey, {
        algorithms: ["HS256"],
        typ: "JWT",
        requiredClaims: ["sub", "role", "iat", "exp"],
        maxTokenAge: settings.accessTtlSeconds,
      });
      const claims = claimsSchema.parse(payload);
      if (
        claims.exp <= claims.iat ||
        claims.exp - claims.iat > settings.accessTtlSeconds
      ) {
        throw new Error(INTERNAL_ERROR_MESSAGES.INVALID_TOKEN_LIFETIME);
      }
      (res.locals as { [authContext]?: Authentication })[authContext] = {
        userId: claims.sub,
        role: claims.role,
      };
    } catch {
      throw new HttpError(401, API_ERROR_MESSAGES.UNAUTHORIZED);
    }
    // Identity is now verified: continue to the protected route's controller.
    // This verifies the JWT; it does not look up refresh-session revocation in SQL.
    next();
  };
}

export const authenticate = createAuthenticate();
