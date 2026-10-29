import type { RequestHandler } from 'express';
import { HttpError } from '../../errors/http-error.js';
import { browserConfig } from '../../config/session.js';
import { refreshCookieName, refreshCookieOptions } from '../../config/refresh-cookie.js';
import { resetRequestSchema, resetConfirmSchema } from '../../validation/patient/password-reset.schema.js';
import { invalidResetMessage, type PasswordReset } from '../../services/patient/password-reset.service.js';

export function createResetRequestController(service: PasswordReset): RequestHandler {
  return async (req, res) => {
    res.set('Cache-Control', 'no-store');
    const parsed = resetRequestSchema.safeParse(req.body);
    if (!parsed.success) throw new HttpError(400, 'Invalid password reset request');
    await service.request(parsed.data.email);
    res.status(200).json({ message: 'Password reset request received' });
  };
}

export function createResetConfirmController(service: PasswordReset): RequestHandler {
  return async (req, res) => {
    res.set('Cache-Control', 'no-store');
    const parsed = resetConfirmSchema.safeParse(req.body);
    if (!parsed.success) throw new HttpError(400, invalidResetMessage);
    const cookieOptions = refreshCookieOptions(browserConfig());
    await service.confirm(parsed.data.token, parsed.data.newPassword);
    res.clearCookie(refreshCookieName, cookieOptions);
    res.status(200).json({ message: 'Password reset complete. Please sign in again.' });
  };
}
