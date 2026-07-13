CREATE TABLE "CartItem" (
  "id" TEXT NOT NULL,
  "customerId" TEXT NOT NULL,
  "artworkId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CartItem_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CartItem_customerId_artworkId_key" ON "CartItem"("customerId", "artworkId");
CREATE INDEX "CartItem_customerId_createdAt_idx" ON "CartItem"("customerId", "createdAt");
CREATE INDEX "CartItem_artworkId_idx" ON "CartItem"("artworkId");

ALTER TABLE "CartItem"
  ADD CONSTRAINT "CartItem_customerId_fkey"
  FOREIGN KEY ("customerId") REFERENCES "Customer"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CartItem"
  ADD CONSTRAINT "CartItem_artworkId_fkey"
  FOREIGN KEY ("artworkId") REFERENCES "Artwork"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
