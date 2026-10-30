import type { RequestHandler } from 'express';
import { getAuthentication } from '../../middleware/authenticate.js';
import type { GetCurrentUser } from '../../services/patient/me.service.js';

export function createMeController(getUser: GetCurrentUser): RequestHandler {
  return async (_req, res) => {
    const { userId } = getAuthentication(res);
    const user = await getUser(userId);
    res.status(200).json({ user });
  };
}
