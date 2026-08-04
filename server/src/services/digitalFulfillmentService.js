const prisma = require('../config/database');

const fulfillArtworkOrder = async (orderId) => prisma.$transaction(async (tx) => {
  const order = await tx.order.findUnique({
    where: { id: orderId },
    include: {
      items: {
        include: {
          artwork: { include: { digitalAsset: true } },
        },
      },
    },
  });
  if (!order) throw new Error('Order not found during fulfilment');
  if (order.paymentStatus !== 'FULLY_PAID') return { digitalEntitlements: 0, physicalArtworks: 0 };

  const physicalArtworkIds = order.items
    .filter((item) => item.artwork.productType === 'PHYSICAL')
    .map((item) => item.artworkId);
  if (physicalArtworkIds.length) {
    await tx.artwork.updateMany({
      where: { id: { in: physicalArtworkIds }, status: { in: ['AVAILABLE', 'RESERVED'] } },
      data: { status: 'SOLD' },
    });
  }

  let digitalEntitlements = 0;
  for (const item of order.items.filter((entry) => entry.artwork.productType === 'DIGITAL')) {
    if (!item.artwork.digitalAsset) throw new Error(`Digital master is missing for artwork ${item.artworkId}`);
    const existing = await tx.digitalEntitlement.findUnique({ where: { orderItemId: item.id } });
    if (existing) continue;

    let editionNumber = null;
    if (item.artwork.editionSize != null) {
      const allocated = await tx.$queryRaw`
        UPDATE "Artwork"
        SET "editionsReserved" = GREATEST("editionsReserved" - 1, 0),
            "editionsIssued" = "editionsIssued" + 1,
            status = CASE
              WHEN "editionsIssued" + 1 >= "editionSize" THEN 'SOLD'::"ArtworkStatus"
              ELSE status
            END,
            "updatedAt" = NOW()
        WHERE id = ${item.artworkId} AND "editionsReserved" > 0
        RETURNING "editionsIssued"
      `;
      if (!allocated.length) throw new Error(`Edition reservation is missing for artwork ${item.artworkId}`);
      editionNumber = Number(allocated[0].editionsIssued);
    }

    const commercial = item.licenseType === 'COMMERCIAL_USE';
    await tx.digitalEntitlement.create({
      data: {
        customerId: order.customerId,
        artworkId: item.artworkId,
        orderItemId: item.id,
        downloadLimit: item.artwork.digitalAsset.downloadLimit,
        licenseType: item.licenseType,
        licenseName: commercial ? item.artwork.digitalAsset.commercialLicenseName : item.artwork.digitalAsset.licenseName,
        licenseText: commercial ? item.artwork.digitalAsset.commercialLicenseText : item.artwork.digitalAsset.licenseText,
        editionNumber,
        editionSize: item.artwork.editionSize,
      },
    });
    if (item.editionReserved) await tx.orderItem.update({ where: { id: item.id }, data: { editionReserved: false } });
    digitalEntitlements += 1;
  }

  return { digitalEntitlements, physicalArtworks: physicalArtworkIds.length };
});

module.exports = { fulfillArtworkOrder };
