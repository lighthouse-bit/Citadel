CREATE TYPE "ArtworkProductType" AS ENUM ('PHYSICAL', 'DIGITAL');

ALTER TABLE "Artwork"
ADD COLUMN "productType" "ArtworkProductType" NOT NULL DEFAULT 'PHYSICAL';

CREATE TABLE "DigitalAsset" (
    "id" TEXT NOT NULL,
    "publicId" TEXT NOT NULL,
    "format" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL DEFAULT 'image',
    "originalFilename" TEXT NOT NULL,
    "bytes" INTEGER,
    "downloadLimit" INTEGER NOT NULL DEFAULT 5,
    "licenseName" TEXT NOT NULL DEFAULT 'Personal Use License',
    "licenseText" TEXT NOT NULL,
    "artworkId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "DigitalAsset_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "DigitalAsset_downloadLimit_check" CHECK ("downloadLimit" BETWEEN 1 AND 25)
);

CREATE TABLE "DigitalEntitlement" (
    "id" TEXT NOT NULL,
    "licenseType" TEXT NOT NULL DEFAULT 'PERSONAL_USE',
    "downloadLimit" INTEGER NOT NULL DEFAULT 5,
    "downloadCount" INTEGER NOT NULL DEFAULT 0,
    "lastDownloadedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "customerId" TEXT NOT NULL,
    "artworkId" TEXT NOT NULL,
    "orderItemId" TEXT NOT NULL,
    CONSTRAINT "DigitalEntitlement_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "DigitalEntitlement_downloadLimit_check" CHECK ("downloadLimit" BETWEEN 1 AND 25),
    CONSTRAINT "DigitalEntitlement_downloadCount_check" CHECK ("downloadCount" >= 0)
);

CREATE TABLE "DigitalDownload" (
    "id" TEXT NOT NULL,
    "entitlementId" TEXT NOT NULL,
    "userAgent" TEXT,
    "downloadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DigitalDownload_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DigitalAsset_publicId_key" ON "DigitalAsset"("publicId");
CREATE UNIQUE INDEX "DigitalAsset_artworkId_key" ON "DigitalAsset"("artworkId");
CREATE UNIQUE INDEX "DigitalEntitlement_orderItemId_key" ON "DigitalEntitlement"("orderItemId");
CREATE INDEX "DigitalEntitlement_customerId_createdAt_idx" ON "DigitalEntitlement"("customerId", "createdAt");
CREATE INDEX "DigitalEntitlement_artworkId_idx" ON "DigitalEntitlement"("artworkId");
CREATE INDEX "DigitalDownload_entitlementId_downloadedAt_idx" ON "DigitalDownload"("entitlementId", "downloadedAt");

ALTER TABLE "DigitalAsset" ADD CONSTRAINT "DigitalAsset_artworkId_fkey" FOREIGN KEY ("artworkId") REFERENCES "Artwork"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DigitalEntitlement" ADD CONSTRAINT "DigitalEntitlement_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DigitalEntitlement" ADD CONSTRAINT "DigitalEntitlement_artworkId_fkey" FOREIGN KEY ("artworkId") REFERENCES "Artwork"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DigitalEntitlement" ADD CONSTRAINT "DigitalEntitlement_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "OrderItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DigitalDownload" ADD CONSTRAINT "DigitalDownload_entitlementId_fkey" FOREIGN KEY ("entitlementId") REFERENCES "DigitalEntitlement"("id") ON DELETE CASCADE ON UPDATE CASCADE;
