import type { RequestHandler } from 'express';
import { z } from 'zod';
import { adminDirectory } from '../../services/admin/directory.service.js';
import { doctorListSchema, slotListSchema, userListSchema } from '../../validation/admin/directory.schema.js';
import { HttpError } from '../../errors/http-error.js';
import { API_ERROR_MESSAGES } from '../../constants/messages.js';

export function createAdminDirectoryControllers(service = adminDirectory) {
  function list<T>(schema: z.ZodType<T>, read: (input: T) => Promise<unknown>): RequestHandler {
    return async (req, res) => {
      const parsed = schema.safeParse(req.query);
      if (!parsed.success) throw new HttpError(400, API_ERROR_MESSAGES.INVALID_ADMIN_DIRECTORY_QUERY);
      res.json(await read(parsed.data));
    };
  }
  return { doctors: list(doctorListSchema, service.doctors), users: list(userListSchema, service.users), slots: list(slotListSchema, service.slots) };
}
