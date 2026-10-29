import { z } from 'zod';
import { registerSchema } from './register.schema.js';

export const resetRequestSchema = z.strictObject({ email: registerSchema.shape.email });
export const resetConfirmSchema = z.strictObject({
  token: z.string().regex(/^[A-Za-z0-9_-]{43}$/),
  newPassword: registerSchema.shape.password,
});
