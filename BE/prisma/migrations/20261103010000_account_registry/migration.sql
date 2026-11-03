BEGIN;
-- Fail rather than silently merge identities with equivalent email addresses.
DO $$ BEGIN
 IF EXISTS (SELECT lower(btrim("email")) FROM "User" GROUP BY lower(btrim("email")) HAVING count(*) > 1) THEN
  RAISE EXCEPTION 'Resolve duplicate normalized account emails before migrating';
 END IF;
END $$;
ALTER TABLE "User" RENAME TO "Account";
ALTER TABLE "Account" RENAME CONSTRAINT "User_pkey" TO "Account_pkey";
ALTER INDEX "User_email_key" RENAME TO "Account_email_key";
CREATE TYPE "AccountKind" AS ENUM ('USER', 'ADMIN', 'FACILITY_STAFF');
ALTER TABLE "Account" ADD COLUMN "kind" "AccountKind" NOT NULL DEFAULT 'USER';
UPDATE "Account" a SET "kind" = CASE r."name" WHEN 'ADMIN' THEN 'ADMIN'::"AccountKind" WHEN 'STAFF' THEN 'FACILITY_STAFF'::"AccountKind" ELSE 'USER'::"AccountKind" END FROM "roles" r WHERE a."roleId" = r."id";
UPDATE "Account" SET "email" = lower(btrim("email"));
ALTER TABLE "Account" ADD CONSTRAINT "Account_email_normalized" CHECK ("email" = lower(btrim("email")));
CREATE UNIQUE INDEX "Account_id_kind_key" ON "Account"("id", "kind");
CREATE TABLE "User" (
 "id" UUID PRIMARY KEY, "kind" "AccountKind" NOT NULL DEFAULT 'USER' CHECK ("kind" = 'USER'),
 "roleId" INTEGER NOT NULL DEFAULT 1 REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 "passwordHash" TEXT NOT NULL,
 FOREIGN KEY ("id", "kind") REFERENCES "Account"("id", "kind") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE "Admin" (
 "id" UUID PRIMARY KEY, "kind" "AccountKind" NOT NULL DEFAULT 'ADMIN' CHECK ("kind" = 'ADMIN'),
 "roleId" INTEGER NOT NULL DEFAULT 2 REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 "passwordHash" TEXT NOT NULL,
 FOREIGN KEY ("id", "kind") REFERENCES "Account"("id", "kind") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE "FacilityStaff" (
 "id" UUID PRIMARY KEY, "kind" "AccountKind" NOT NULL DEFAULT 'FACILITY_STAFF' CHECK ("kind" = 'FACILITY_STAFF'),
 "roleId" INTEGER NOT NULL DEFAULT 4 REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 "passwordHash" TEXT NOT NULL,
 FOREIGN KEY ("id", "kind") REFERENCES "Account"("id", "kind") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "User" SELECT "id", "kind", "roleId", "passwordHash" FROM "Account" WHERE "kind" = 'USER';
INSERT INTO "Admin" SELECT "id", "kind", "roleId", "passwordHash" FROM "Account" WHERE "kind" = 'ADMIN';
INSERT INTO "FacilityStaff" SELECT "id", "kind", "roleId", "passwordHash" FROM "Account" WHERE "kind" = 'FACILITY_STAFF';
ALTER TABLE "Account" DROP COLUMN "roleId", DROP COLUMN "passwordHash";
-- Existing foreign keys follow the renamed Account table, preserving all IDs,
-- sessions, reset tokens, applicants and reviewer audit references.

CREATE UNIQUE INDEX "User_id_kind_key" ON "User"("id", "kind");
CREATE UNIQUE INDEX "Admin_id_kind_key" ON "Admin"("id", "kind");
CREATE UNIQUE INDEX "FacilityStaff_id_kind_key" ON "FacilityStaff"("id", "kind");

COMMIT;
