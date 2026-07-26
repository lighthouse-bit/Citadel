-- Verified customers may leave one review per purchased artwork.
CREATE TABLE "Review" (
    "id" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "title" TEXT,
    "comment" TEXT NOT NULL,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "customerId" TEXT NOT NULL,
    "artworkId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Review_rating_check" CHECK ("rating" BETWEEN 1 AND 5)
);

CREATE UNIQUE INDEX "Review_customerId_artworkId_key" ON "Review"("customerId", "artworkId");
CREATE INDEX "Review_artworkId_isPublished_createdAt_idx" ON "Review"("artworkId", "isPublished", "createdAt");
CREATE INDEX "Review_orderId_idx" ON "Review"("orderId");

ALTER TABLE "Review"
ADD CONSTRAINT "Review_customerId_fkey"
FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Review"
ADD CONSTRAINT "Review_artworkId_fkey"
FOREIGN KEY ("artworkId") REFERENCES "Artwork"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Review"
ADD CONSTRAINT "Review_orderId_fkey"
FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
