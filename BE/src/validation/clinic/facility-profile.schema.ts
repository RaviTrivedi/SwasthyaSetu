import { facilityApplicationSchema } from './facility-application.schema.js';
import { z } from 'zod';

export const facilityProfileSchema = facilityApplicationSchema.partial().refine(
  input => Object.keys(input).length > 0,
);
export type FacilityProfileInput = z.infer<typeof facilityProfileSchema>;
