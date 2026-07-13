CREATE TABLE "CustomerArtworkView" (
  "id" TEXT NOT NULL,
  "customerId" TEXT NOT NULL,
  "artworkId" TEXT NOT NULL,
  "viewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CustomerArtworkView_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CustomerArtworkView_customerId_artworkId_key" ON "CustomerArtworkView"("customerId", "artworkId");
CREATE INDEX "CustomerArtworkView_customerId_viewedAt_idx" ON "CustomerArtworkView"("customerId", "viewedAt");
CREATE INDEX "CustomerArtworkView_artworkId_idx" ON "CustomerArtworkView"("artworkId");

ALTER TABLE "CustomerArtworkView"
  ADD CONSTRAINT "CustomerArtworkView_customerId_fkey"
  FOREIGN KEY ("customerId") REFERENCES "Customer"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CustomerArtworkView"
  ADD CONSTRAINT "CustomerArtworkView_artworkId_fkey"
  FOREIGN KEY ("artworkId") REFERENCES "Artwork"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
