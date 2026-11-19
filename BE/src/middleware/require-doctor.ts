import type { RequestHandler } from 'express';
import { getAuthentication } from './authenticate.js';
import { findUserProfileById } from '../repositories/user.repository.js';
import { Role } from '../constants/roles.js';
import { HttpError } from '../errors/http-error.js';
import { API_ERROR_MESSAGES } from '../constants/messages.js';

export function createRequireDoctor(findUser = findUserProfileById): RequestHandler {
  return async (_req, res, next) => {
    const { userId, role } = getAuthentication(res);
    if (role !== Role.DOCTOR) throw new HttpError(403, API_ERROR_MESSAGES.DOCTOR_REQUIRED);
    const user = await findUser(userId);
    if (!user || user.disabledAt || user.role !== Role.DOCTOR) throw new HttpError(403, API_ERROR_MESSAGES.DOCTOR_REQUIRED);
    next();
  };
}
export const requireDoctor = createRequireDoctor();
