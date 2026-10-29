import type { RequestHandler, Response } from 'express';
import { jwtVerify } from 'jose';
import { z } from 'zod';
import { sessionConfig } from '../config/session.js';
import { HttpError } from '../errors/http-error.js';

const claimsSchema = z.object({
  sub: z.uuid(), role: z.literal('PATIENT'),
  iat: z.number().int(), exp: z.number().int(),
});
const authContext = Symbol('verifiedAuthentication');
type Authentication = { userId: string; role: 'PATIENT' };

export function getAuthentication(res: Response): Authentication {
  const context = (res.locals as { [authContext]?: Authentication })[authContext];
  if (!context) throw new HttpError(401, 'Unauthorized');
  return context;
}

export function createAuthenticate(config = sessionConfig): RequestHandler {
  return async (req, res, next) => {
    res.set('Cache-Control', 'no-store');
    const match = /^Bearer ([^\s]+)$/i.exec(req.get('authorization') ?? '');
    if (!match) throw new HttpError(401, 'Unauthorized');
    const settings = config();
    try {
      const { payload } = await jwtVerify(match[1]!, settings.signingKey, {
        algorithms: ['HS256'], typ: 'JWT',
        requiredClaims: ['sub', 'role', 'iat', 'exp'],
        maxTokenAge: settings.accessTtlSeconds,
      });
      const claims = claimsSchema.parse(payload);
      if (claims.exp <= claims.iat || claims.exp - claims.iat > settings.accessTtlSeconds) {
        throw new Error('Invalid lifetime');
      }
      (res.locals as { [authContext]?: Authentication })[authContext] = {
        userId: claims.sub, role: claims.role,
      };
    } catch {
      throw new HttpError(401, 'Unauthorized');
    }
    next();
  };
}

export const authenticate = createAuthenticate();
