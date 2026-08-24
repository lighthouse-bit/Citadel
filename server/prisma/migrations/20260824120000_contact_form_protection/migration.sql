CREATE TABLE "ContactRateLimit" (
    "key" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "windowStart" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ContactRateLimit_pkey" PRIMARY KEY ("key")
);

CREATE INDEX "ContactRateLimit_updatedAt_idx" ON "ContactRateLimit"("updatedAt");
