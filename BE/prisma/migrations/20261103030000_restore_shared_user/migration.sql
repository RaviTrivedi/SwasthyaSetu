BEGIN;
-- Reverse the account registry split without deleting identities or sessions.
ALTER TABLE "Account" ADD COLUMN "passwordHash" TEXT, ADD COLUMN "roleId" INTEGER;
UPDATE "Account" a SET "passwordHash" = c."passwordHash", "roleId" = c."roleId"
FROM (
 SELECT "id", "passwordHash", "roleId" FROM "User"
 UNION ALL SELECT "id", "passwordHash", "roleId" FROM "Admin"
 UNION ALL SELECT "id", "passwordHash", "roleId" FROM "FacilityStaff"
) c WHERE a."id" = c."id";
-- Abort rather than discard any identity whose credentials are missing.
ALTER TABLE "Account" ALTER COLUMN "passwordHash" SET NOT NULL;
ALTER TABLE "Account" ALTER COLUMN "roleId" SET NOT NULL;
ALTER TABLE "Account" ALTER COLUMN "roleId" SET DEFAULT 1;
DROP TABLE "User", "Admin", "FacilityStaff";
ALTER TABLE "Account" DROP CONSTRAINT "Account_email_normalized";
ALTER TABLE "Account" DROP COLUMN "kind";
DROP TYPE "AccountKind";
ALTER TABLE "Account" RENAME TO "User";
ALTER TABLE "User" RENAME CONSTRAINT "Account_pkey" TO "User_pkey";
ALTER INDEX "Account_email_key" RENAME TO "User_email_key";
ALTER TABLE "User" ADD CONSTRAINT "User_roleId_fkey"
 FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
-- PostgreSQL keeps existing session/reset/application foreign keys attached to
-- the renamed identity table. User IDs, role assignments and hashes are preserved.
COMMIT;
