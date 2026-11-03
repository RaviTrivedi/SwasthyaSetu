import { getDatabase } from '../../config/database.js';
import type { Prisma } from '../../generated/prisma/client.js';
import type { ApplicationListInput } from '../../validation/admin/facility-application.schema.js';

export const reviewSelect = {
  id: true, applicantId: true, facilityName: true, facilityType: true,
  contactPersonName: true, contactEmail: true, contactPhone: true,
  address: true, city: true, description: true, services: true, status: true,
  createdAt: true, updatedAt: true, reviewedByAdminId: true, reviewedAt: true,
  rejectionReason: true, applicant: { select: { id: true, firstName: true, email: true } },
} satisfies Prisma.FacilityApplicationSelect;

export async function listApplications(input: ApplicationListInput) {
  const where = input.status ? { status: input.status } : {};
  const [items, total] = await getDatabase().$transaction([
    getDatabase().facilityApplication.findMany({ where, select: reviewSelect,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      skip: (input.page - 1) * input.pageSize, take: input.pageSize }),
    getDatabase().facilityApplication.count({ where }),
  ], { isolationLevel: 'RepeatableRead' });
  return { items, total, page: input.page, pageSize: input.pageSize };
}

export function findApplication(id: string) {
  return getDatabase().facilityApplication.findUnique({ where: { id }, select: reviewSelect });
}

export async function reviewApplication(id: string, adminId: string, decision: 'APPROVED' | 'REJECTED' | 'PENDING', reason: string | null) {
  return getDatabase().$transaction(async tx => {
    await tx.$queryRaw`SELECT "id" FROM "FacilityApplication" WHERE "id" = ${id}::uuid FOR UPDATE`;
    const previous = await tx.facilityApplication.findUnique({ where: { id } });
    const reopening = decision === 'PENDING';
    // The status predicate is checked by PostgreSQL while updating the row.
    // Competing reviews wait, then see a non-PENDING row and update zero records.
    const result = await tx.facilityApplication.updateMany({
      where: { id, status: reopening ? 'REJECTED' : 'PENDING' },
      data: { status: decision, reviewedByAdminId: reopening ? null : adminId,
        reviewedAt: reopening ? null : new Date(), rejectionReason: decision === 'REJECTED' ? reason : null },
    });
    if (!result.count) {
      const exists = await tx.facilityApplication.findUnique({ where: { id }, select: { id: true } });
      return { outcome: exists ? 'conflict' : 'missing' } as const;
    }
    if (reopening && previous) {
      // Audit insert and state change commit together, or both roll back.
      await tx.facilityApplicationReopening.create({ data: {
        applicationId: id, reopenedByAdminId: adminId,
        previousReviewedByAdminId: previous.reviewedByAdminId,
        previousReviewedAt: previous.reviewedAt,
        previousRejectionReason: previous.rejectionReason,
      } });
    }
    const application = await tx.facilityApplication.findUniqueOrThrow({ where: { id }, select: reviewSelect });
    return { outcome: 'reviewed', application } as const;
  });
}
