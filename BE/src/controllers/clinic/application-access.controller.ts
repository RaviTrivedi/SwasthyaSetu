import type { RequestHandler } from 'express';
import { getAuthentication } from '../../middleware/authenticate.js';
import { getDoctorApplicationAccess } from '../../services/clinic/application-access.service.js';
export const applicationAccessController: RequestHandler = async (_req, res) => {
  res.json(await getDoctorApplicationAccess(getAuthentication(res).userId));
};
