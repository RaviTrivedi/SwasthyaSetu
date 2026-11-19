import { z } from 'zod';
export const facilityServiceSchema = z.strictObject({ name: z.string().trim().min(1).max(100) });
export const facilityServiceIdSchema = z.uuid();
