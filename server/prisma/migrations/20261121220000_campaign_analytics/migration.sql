ALTER TABLE "EmailCampaign"
ADD COLUMN "openedCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "clickedCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "unsubscribeCount" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "CampaignDelivery"
ADD COLUMN "openedAt" TIMESTAMP(3),
ADD COLUMN "openCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "clickedAt" TIMESTAMP(3),
ADD COLUMN "clickCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "unsubscribedAt" TIMESTAMP(3);

CREATE INDEX "CampaignDelivery_campaignId_openedAt_idx" ON "CampaignDelivery"("campaignId", "openedAt");
CREATE INDEX "CampaignDelivery_campaignId_clickedAt_idx" ON "CampaignDelivery"("campaignId", "clickedAt");
