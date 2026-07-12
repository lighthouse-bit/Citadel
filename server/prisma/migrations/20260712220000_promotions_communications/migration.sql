CREATE TABLE "Promotion" (
  "id" TEXT NOT NULL, "code" TEXT NOT NULL, "name" TEXT NOT NULL,
  "discountType" TEXT NOT NULL, "value" DECIMAL(10,2) NOT NULL,
  "minimumOrder" DECIMAL(10,2), "maximumDiscount" DECIMAL(10,2),
  "usageLimit" INTEGER, "usageCount" INTEGER NOT NULL DEFAULT 0,
  "startsAt" TIMESTAMP(3), "endsAt" TIMESTAMP(3), "isActive" BOOLEAN NOT NULL DEFAULT true,
  "categories" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[], "artworkIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Promotion_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Promotion_code_key" ON "Promotion"("code");
CREATE INDEX "Promotion_isActive_startsAt_endsAt_idx" ON "Promotion"("isActive", "startsAt", "endsAt");

CREATE TABLE "EmailTemplate" (
  "id" TEXT NOT NULL, "name" TEXT NOT NULL, "subject" TEXT NOT NULL, "htmlBody" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "EmailTemplate_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "EmailCampaign" (
  "id" TEXT NOT NULL, "name" TEXT NOT NULL, "subject" TEXT NOT NULL, "htmlBody" TEXT NOT NULL,
  "segment" TEXT NOT NULL DEFAULT 'VERIFIED', "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "recipientCount" INTEGER NOT NULL DEFAULT 0, "deliveredCount" INTEGER NOT NULL DEFAULT 0, "failedCount" INTEGER NOT NULL DEFAULT 0,
  "sentAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "EmailCampaign_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "EmailCampaign_status_createdAt_idx" ON "EmailCampaign"("status", "createdAt");
ALTER TABLE "Order" ADD COLUMN "discountAmount" DECIMAL(10,2) NOT NULL DEFAULT 0, ADD COLUMN "promotionCode" TEXT;
