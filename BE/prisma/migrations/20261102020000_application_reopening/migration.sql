CREATE TABLE "FacilityApplicationReopening" (
  "id" UUID NOT NULL PRIMARY KEY,
  "applicationId" UUID NOT NULL,
  "reopenedByAdminId" UUID NOT NULL,
  "reopenedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "previousReviewedByAdminId" UUID,
  "previousReviewedAt" TIMESTAMPTZ(3),
  "previousRejectionReason" VARCHAR(2000),
  CONSTRAINT "FacilityApplicationReopening_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "FacilityApplication"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "FacilityApplicationReopening_reopenedByAdminId_fkey" FOREIGN KEY ("reopenedByAdminId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "FacilityApplicationReopening_applicationId_idx" ON "FacilityApplicationReopening"("applicationId");
