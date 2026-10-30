import { API_SUCCESS_MESSAGES } from '../../constants/messages.js';
import type { RequestHandler } from "express";
import { browserConfig } from "../../config/session.js";
import {
  readRefreshCookie,
  refreshCookieName,
  refreshCookieOptions,
} from "../../config/refresh-cookie.js";
import type { LogoutSession } from "../../services/patient/logout.service.js";

export function createLogoutController(
  logout: LogoutSession,
  config = browserConfig
): RequestHandler {
  return async (req, res) => {
    res.set("Cache-Control", "no-store");
    const options = refreshCookieOptions(config());
    // Clear even on persistence errors, but let the centralized handler report failure.
    res.clearCookie(refreshCookieName, options);
    await logout(readRefreshCookie(req.get("cookie")));
    res.status(200).json({ message: API_SUCCESS_MESSAGES.LOGGED_OUT });
  };
}
