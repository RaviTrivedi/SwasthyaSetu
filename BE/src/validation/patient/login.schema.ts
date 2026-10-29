import { z } from 'zod';

export const loginSchema = z.strictObject({
  email: z.string().trim().toLowerCase().max(254).pipe(z.email()),
  // Login verifies existing credentials; do not apply registration's minimum.
  password: z.string().min(1).max(128),
});

export type LoginInput = z.infer<typeof loginSchema>;
