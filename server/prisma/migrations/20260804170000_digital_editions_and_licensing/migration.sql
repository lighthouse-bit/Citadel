ALTER TABLE "Artwork"
ADD COLUMN "editionSize" INTEGER,
ADD COLUMN "editionsIssued" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "editionsReserved" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "commercialLicenseEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "commercialPrice" DECIMAL(10,2);

ALTER TABLE "Artwork"
ADD CONSTRAINT "Artwork_editionSize_check" CHECK ("editionSize" IS NULL OR "editionSize" BETWEEN 1 AND 10000),
ADD CONSTRAINT "Artwork_editionsIssued_check" CHECK ("editionsIssued" >= 0),
ADD CONSTRAINT "Artwork_editionsReserved_check" CHECK ("editionsReserved" >= 0),
ADD CONSTRAINT "Artwork_edition_inventory_check" CHECK ("editionSize" IS NULL OR "editionsIssued" + "editionsReserved" <= "editionSize"),
ADD CONSTRAINT "Artwork_commercialPrice_check" CHECK ("commercialPrice" IS NULL OR "commercialPrice" > 0);

ALTER TABLE "CartItem" ADD COLUMN "licenseType" TEXT NOT NULL DEFAULT 'PERSONAL_USE';
ALTER TABLE "OrderItem"
ADD COLUMN "licenseType" TEXT NOT NULL DEFAULT 'PERSONAL_USE',
ADD COLUMN "editionReserved" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "DigitalAsset"
ADD COLUMN "commercialLicenseName" TEXT NOT NULL DEFAULT 'Commercial Use License',
ADD COLUMN "commercialLicenseText" TEXT NOT NULL DEFAULT 'Commercial use is permitted only under the terms stated in the issued licence. Copyright remains with the artist.';

ALTER TABLE "DigitalEntitlement"
ADD COLUMN "licenseName" TEXT NOT NULL DEFAULT 'Personal Use License',
ADD COLUMN "licenseText" TEXT NOT NULL DEFAULT 'Personal use only. Copyright remains with the artist.',
ADD COLUMN "editionNumber" INTEGER,
ADD COLUMN "editionSize" INTEGER;

ALTER TABLE "DigitalEntitlement"
ADD CONSTRAINT "DigitalEntitlement_editionNumber_check" CHECK ("editionNumber" IS NULL OR "editionNumber" > 0),
ADD CONSTRAINT "DigitalEntitlement_editionSize_check" CHECK ("editionSize" IS NULL OR "editionSize" > 0);

CREATE INDEX "DigitalEntitlement_artworkId_editionNumber_idx" ON "DigitalEntitlement"("artworkId", "editionNumber");
