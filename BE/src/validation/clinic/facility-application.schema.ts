import { z } from 'zod';
import { FacilityType } from '../../generated/prisma/enums.js';

export const facilityApplicationSchema = z.strictObject({
  facilityName: z.string().trim().min(1).max(200),
  facilityType: z.enum(FacilityType),
  contactPersonName: z.string().trim().min(1).max(100),
  contactEmail: z.string().trim().toLowerCase().max(254).pipe(z.email()),
  // International format: leading + followed by 8–15 digits; no formatting separators.
  contactPhone: z.string().trim().regex(/^\+[1-9]\d{7,14}$/),
  address: z.string().trim().min(1).max(500),
  city: z.string().trim().min(1).max(100),
  description: z.string().trim().max(2000).optional(),
  services: z.array(z.string().trim().min(1).max(100)).min(1).max(50),
});

export type FacilityApplicationInput = z.infer<typeof facilityApplicationSchema>;
