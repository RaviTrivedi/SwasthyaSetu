import { z } from "zod";

export const registerSchema = z.strictObject({
  firstName: z.string().trim().min(1).max(100),
  email: z.string().trim().toLowerCase().max(254).pipe(z.email()),
  // Preserve password whitespace exactly; never normalize passwords.
  password: z.string().min(8).max(128),
});

export type RegisterInput = z.infer<typeof registerSchema>;
