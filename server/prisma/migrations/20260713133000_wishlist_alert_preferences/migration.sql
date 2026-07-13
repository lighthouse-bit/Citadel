ALTER TABLE "Customer"
  ADD COLUMN "wishlistAvailabilityAlerts" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "wishlistPriceAlerts" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "newArtworkAlerts" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "marketingEmails" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "emailPreferencesUpdatedAt" TIMESTAMP(3);

CREATE TABLE "WishlistAlert" (
  "id" TEXT NOT NULL,
  "customerId" TEXT NOT NULL,
  "artworkId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "oldValue" TEXT,
  "newValue" TEXT,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "error" TEXT,
  "messageId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "sentAt" TIMESTAMP(3),
  "openedAt" TIMESTAMP(3),
  "clickedAt" TIMESTAMP(3),
  CONSTRAINT "WishlistAlert_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "WishlistAlert_customerId_createdAt_idx" ON "WishlistAlert"("customerId", "createdAt");
CREATE INDEX "WishlistAlert_artworkId_type_createdAt_idx" ON "WishlistAlert"("artworkId", "type", "createdAt");
CREATE INDEX "WishlistAlert_status_createdAt_idx" ON "WishlistAlert"("status", "createdAt");

ALTER TABLE "WishlistAlert"
  ADD CONSTRAINT "WishlistAlert_customerId_fkey"
  FOREIGN KEY ("customerId") REFERENCES "Customer"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "WishlistAlert"
  ADD CONSTRAINT "WishlistAlert_artworkId_fkey"
  FOREIGN KEY ("artworkId") REFERENCES "Artwork"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
