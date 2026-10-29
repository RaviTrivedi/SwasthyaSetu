import type { RequestHandler } from 'express';
import { HttpError } from '../../errors/http-error.js';
import type { LoginPatient } from '../../services/patient/login.service.js';
import { loginSchema } from '../../validation/patient/login.schema.js';
import { issueSession, type IssueSession } from '../../services/patient/session.service.js';
import { refreshCookieName, refreshCookieOptions } from '../../config/refresh-cookie.js';

export function createLoginController(login: LoginPatient, issue: IssueSession = issueSession): RequestHandler {
  return async (req, res) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new HttpError(400, 'Invalid login input');
    }
    const user = await login(parsed.data);
    const session = await issue(user);
    res.cookie(refreshCookieName, session.refreshToken, refreshCookieOptions(session));
    res.set('Cache-Control', 'no-store');
    res.status(200).json({ user, accessToken: session.accessToken });
  };
}
