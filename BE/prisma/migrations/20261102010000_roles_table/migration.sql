BEGIN;
CREATE TABLE "roles" (
  "id" SERIAL NOT NULL,
  "name" VARCHAR(50) NOT NULL,
  CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "roles_name_key" ON "roles"("name");
INSERT INTO "roles" ("id", "name") VALUES
  (1, 'PATIENT'), (2, 'ADMIN'), (3, 'DOCTOR'), (4, 'STAFF');
SELECT setval(pg_get_serial_sequence('roles', 'id'), 4);
ALTER TABLE "User" ADD COLUMN "roleId" INTEGER;
UPDATE "User" AS u SET "roleId" = r."id" FROM "roles" AS r WHERE r."name" = u."role"::text;
ALTER TABLE "User" ALTER COLUMN "roleId" SET NOT NULL;
ALTER TABLE "User" ALTER COLUMN "roleId" SET DEFAULT 1;
ALTER TABLE "User" ADD CONSTRAINT "User_roleId_fkey"
FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
-- Only remove the old representation after every user is mapped successfully.
ALTER TABLE "User" DROP COLUMN "role";
DROP TYPE "Role";
COMMIT;
