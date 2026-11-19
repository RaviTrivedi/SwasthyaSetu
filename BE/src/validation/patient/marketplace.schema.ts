import { z } from 'zod';
const integer = (max: number) => z.string().regex(/^[1-9]\d*$/).transform(Number).pipe(z.number().int().max(max));
export const marketplaceQuery = z.strictObject({ page: integer(100000).default(1), pageSize: integer(50).default(20), query: z.string().trim().max(100).optional(), city: z.string().trim().max(100).optional(), facilityType: z.enum(['CLINIC','HOSPITAL']).optional() });
export const facilityIdSchema = z.uuid();
export const availabilityQuery = z.strictObject({ date: z.iso.date() });
export type MarketplaceQuery = z.infer<typeof marketplaceQuery>;
