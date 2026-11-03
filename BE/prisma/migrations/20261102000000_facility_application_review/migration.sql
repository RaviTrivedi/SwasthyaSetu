ALTER TYPE "Role" ADD VALUE 'ADMIN';
ALTER TYPE "FacilityApplicationStatus" ADD VALUE 'APPROVED';
ALTER TYPE "FacilityApplicationStatus" ADD VALUE 'REJECTED';
ALTER TABLE "FacilityApplication"
ADD COLUMN "reviewedByAdminId" UUID,
ADD COLUMN "reviewedAt" TIMESTAMPTZ(3),
ADD COLUMN "rejectionReason" VARCHAR(2000);
ALTER TABLE "FacilityApplication" ADD CONSTRAINT "FacilityApplication_reviewedByAdminId_fkey"
FOREIGN KEY ("reviewedByAdminId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
