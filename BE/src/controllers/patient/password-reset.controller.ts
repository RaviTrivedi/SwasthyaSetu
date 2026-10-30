import { API_ERROR_MESSAGES, API_SUCCESS_MESSAGES } from '../../constants/messages.js';
import type { RequestHandler } from "express";
import { HttpError } from "../../errors/http-error.js";
import { browserConfig } from "../../config/session.js";
import {
  refreshCookieName,
  refreshCookieOptions,
} from "../../config/refresh-cookie.js";
import {
  resetRequestSchema,
  resetConfirmSchema,
} from "../../validation/patient/password-reset.schema.js";
import type { PasswordReset } from "../../services/patient/password-reset.service.js";

export function createResetRequestController(
  service: PasswordReset
): RequestHandler {
  return async (req, res) => {
    res.set("Cache-Control", "no-store");
    const parsed = resetRequestSchema.safeParse(req.body);
    if (!parsed.success)
      throw new HttpError(400, API_ERROR_MESSAGES.INVALID_RESET_REQUEST);
    await service.request(parsed.data.email);
    res.status(200).json({ message: API_SUCCESS_MESSAGES.RESET_REQUEST_RECEIVED });
  };
}

export function createResetConfirmController(
  service: PasswordReset
): RequestHandler {
  return async (req, res) => {
    res.set("Cache-Control", "no-store");
    const parsed = resetConfirmSchema.safeParse(req.body);
    if (!parsed.success) throw new HttpError(400, API_ERROR_MESSAGES.INVALID_RESET_TOKEN);
    const cookieOptions = refreshCookieOptions(browserConfig());
    await service.confirm(parsed.data.token, parsed.data.newPassword);
    res.clearCookie(refreshCookieName, cookieOptions);
    res
      .status(200)
      .json({ message: API_SUCCESS_MESSAGES.PASSWORD_RESET_COMPLETE });
  };
}
