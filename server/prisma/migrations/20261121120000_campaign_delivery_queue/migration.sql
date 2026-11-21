-- AlterTable
ALTER TABLE "EmailCampaign"
ADD COLUMN "skippedCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "preparedAt" TIMESTAMP(3),
ADD COLUMN "startedAt" TIMESTAMP(3),
ADD COLUMN "completedAt" TIMESTAMP(3),
ADD COLUMN "lastProcessedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "CampaignDelivery" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "firstName" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "messageId" TEXT,
    "claimedAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CampaignDelivery_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CampaignDelivery_campaignId_customerId_key" ON "CampaignDelivery"("campaignId", "customerId");
CREATE INDEX "CampaignDelivery_campaignId_status_createdAt_idx" ON "CampaignDelivery"("campaignId", "status", "createdAt");
CREATE INDEX "CampaignDelivery_status_claimedAt_idx" ON "CampaignDelivery"("status", "claimedAt");

-- AddForeignKey
ALTER TABLE "CampaignDelivery" ADD CONSTRAINT "CampaignDelivery_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "EmailCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CampaignDelivery" ADD CONSTRAINT "CampaignDelivery_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
