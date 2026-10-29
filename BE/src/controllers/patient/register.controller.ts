import type { RequestHandler } from 'express';
import { HttpError } from '../../errors/http-error.js';
import type { RegisterPatient } from '../../services/patient/register.service.js';
import { registerSchema } from '../../validation/patient/register.schema.js';

export function createRegisterController(register: RegisterPatient): RequestHandler {
  return async (req, res) => {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      // Do not echo submitted values (particularly passwords) in errors.
      throw new HttpError(400, 'Invalid registration input');
    }
    const user = await register(parsed.data);
    res.status(201).json(user);
  };
}
