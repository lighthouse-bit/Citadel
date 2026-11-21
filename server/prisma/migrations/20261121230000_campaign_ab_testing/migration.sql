ALTER TABLE "EmailCampaign"
ADD COLUMN "subjectB" TEXT,
ADD COLUMN "abTestEnabled" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "CampaignDelivery"
ADD COLUMN "variant" TEXT NOT NULL DEFAULT 'A';

CREATE INDEX "CampaignDelivery_campaignId_variant_idx" ON "CampaignDelivery"("campaignId", "variant");
