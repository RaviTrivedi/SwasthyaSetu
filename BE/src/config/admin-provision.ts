import { registerSchema } from "../validation/patient/register.schema.js";
import { z } from "zod";

export const ADMIN_PROVISION_MESSAGES = {
  invalid:
    "Set ADMIN_EMAIL, ADMIN_PASSWORD (12-128 characters), and optionally ADMIN_FIRST_NAME (1-100 characters).",
  exists:
    "Account already exists. Provisioning will not change its role or password.",
  failed:
    "Admin provisioning failed. Check database configuration and applied migrations.",
  success: "Admin account created.",
} as const;

const schema = registerSchema.extend({ password: z.string().min(8).max(128) });
export function adminProvisionConfig(source: NodeJS.ProcessEnv = process.env) {
  const result = schema.safeParse({
    email: source.ADMIN_EMAIL,
    password: source.ADMIN_PASSWORD,
    firstName: source.ADMIN_FIRST_NAME ?? "Platform Admin",
  });
  if (!result.success) throw new Error(ADMIN_PROVISION_MESSAGES.invalid);
  return result.data;
}
