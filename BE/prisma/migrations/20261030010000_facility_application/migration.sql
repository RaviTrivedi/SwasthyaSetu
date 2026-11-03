CREATE TYPE "FacilityType" AS ENUM ('CLINIC', 'HOSPITAL');
CREATE TYPE "FacilityApplicationStatus" AS ENUM ('PENDING');

CREATE TABLE "FacilityApplication" (
    "id" UUID NOT NULL,
    "applicantId" UUID NOT NULL,
    "facilityName" VARCHAR(200) NOT NULL,
    "facilityType" "FacilityType" NOT NULL,
    "contactPersonName" VARCHAR(100) NOT NULL,
    "contactEmail" VARCHAR(254) NOT NULL,
    "contactPhone" VARCHAR(16) NOT NULL,
    "address" VARCHAR(500) NOT NULL,
    "city" VARCHAR(100) NOT NULL,
    "description" VARCHAR(2000),
    "services" TEXT[] NOT NULL,
    "status" "FacilityApplicationStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "FacilityApplication_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "FacilityApplication_applicantId_idx" ON "FacilityApplication"("applicantId");
ALTER TABLE "FacilityApplication" ADD CONSTRAINT "FacilityApplication_applicantId_fkey"
FOREIGN KEY ("applicantId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
