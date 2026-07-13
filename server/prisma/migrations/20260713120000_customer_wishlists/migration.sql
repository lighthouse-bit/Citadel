CREATE TABLE "WishlistItem" (
  "id" TEXT NOT NULL,
  "customerId" TEXT NOT NULL,
  "artworkId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WishlistItem_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WishlistItem_customerId_artworkId_key"
  ON "WishlistItem"("customerId", "artworkId");
CREATE INDEX "WishlistItem_customerId_createdAt_idx"
  ON "WishlistItem"("customerId", "createdAt");
CREATE INDEX "WishlistItem_artworkId_idx" ON "WishlistItem"("artworkId");

ALTER TABLE "WishlistItem"
  ADD CONSTRAINT "WishlistItem_customerId_fkey"
  FOREIGN KEY ("customerId") REFERENCES "Customer"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "WishlistItem"
  ADD CONSTRAINT "WishlistItem_artworkId_fkey"
  FOREIGN KEY ("artworkId") REFERENCES "Artwork"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
