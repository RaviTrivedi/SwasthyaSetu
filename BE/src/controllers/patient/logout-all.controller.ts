import type { RequestHandler } from 'express';
import { browserConfig } from '../../config/session.js';
import { refreshCookieName, refreshCookieOptions } from '../../config/refresh-cookie.js';
import { getAuthentication } from '../../middleware/authenticate.js';
import type { LogoutAll } from '../../services/patient/logout-all.service.js';

export function createLogoutAllController(logout: LogoutAll, config = browserConfig): RequestHandler {
  return async (_req, res) => {
    const { userId } = getAuthentication(res);
    const options = refreshCookieOptions(config());
    await logout(userId);
    res.clearCookie(refreshCookieName, options);
    res.set('Cache-Control', 'no-store');
    res.status(200).json({ message: 'Logged out from all devices' });
  };
}
