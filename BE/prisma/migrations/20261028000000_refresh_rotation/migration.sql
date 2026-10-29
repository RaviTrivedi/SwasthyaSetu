ALTER TABLE "Session" ADD COLUMN "consumedTokenHashes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
CREATE INDEX "Session_consumedTokenHashes_idx" ON "Session" USING GIN ("consumedTokenHashes");
