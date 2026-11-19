import { isIP } from 'node:net';
import { API_ERROR_MESSAGES } from '../../constants/messages.js';
import { accessCookieName, accessCookieOptions } from '../../config/access-cookie.js';
import type { RequestHandler } from 'express';
import { HttpError } from '../../errors/http-error.js';
import type { LoginPatient } from '../../services/patient/login.service.js';
import { loginSchema } from '../../validation/patient/login.schema.js';
import { issueSession, type IssueSession } from '../../services/patient/session.service.js';
import { refreshCookieName, refreshCookieOptions } from '../../config/refresh-cookie.js';

export function createLoginController(login: LoginPatient, issue: IssueSession = issueSession): RequestHandler {
  // The factory runs when routes are configured; this returned function runs per request.
  return async (req, res) => {
    // Validate before calling the service. Express forwards thrown errors to errorHandler.
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new HttpError(400, API_ERROR_MESSAGES.INVALID_LOGIN_INPUT);
    }
    // await pauses this handler until verification finishes, then creates a persisted session.
    const user = await login(parsed.data);
    const session = await issue(user, req.ip && isIP(req.ip) ? req.ip : null);
    res.cookie(refreshCookieName, session.refreshToken, refreshCookieOptions(session));
    res.cookie(accessCookieName, session.accessToken, { ...accessCookieOptions(session), expires: session.accessExpiresAt });
    res.set('Cache-Control', 'no-store');
    // Sending JSON ends the response; no next() is needed on this successful path.
    res.status(200).json({ user });
  };
}
