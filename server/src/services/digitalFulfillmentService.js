const prisma = require('../config/database');
const { sendDigitalDeliveryEmail } = require('../utils/emailService');
const { recordOperationalEvent } = require('../utils/operationalEvents');

const fulfillTransaction = async (orderId) => prisma.$transaction(async (tx) => {
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

  const newEntitlementIds = [];
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
    const entitlement = await tx.digitalEntitlement.create({
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
    newEntitlementIds.push(entitlement.id);
    if (item.editionReserved) await tx.orderItem.update({ where: { id: item.id }, data: { editionReserved: false } });
  }

  return { digitalEntitlements: newEntitlementIds.length, newEntitlementIds, physicalArtworks: physicalArtworkIds.length };
});

const sendNewEntitlementEmail = async (orderId, entitlementIds) => {
  if (!entitlementIds.length) return;
  try {
    const entitlements = await prisma.digitalEntitlement.findMany({
      where: { id: { in: entitlementIds } },
      include: {
        customer: { select: { email: true, firstName: true } },
        artwork: { select: { title: true } },
        orderItem: { select: { order: { select: { orderNumber: true } } } },
      },
      orderBy: { createdAt: 'asc' },
    });
    if (!entitlements.length) return;
    const first = entitlements[0];
    await sendDigitalDeliveryEmail({
      email: first.customer.email,
      firstName: first.customer.firstName,
      orderNumber: first.orderItem.order.orderNumber,
      items: entitlements.map(item => ({
        certificateId: item.id,
        title: item.artwork.title,
        licenseName: item.licenseName,
        editionNumber: item.editionNumber,
        editionSize: item.editionSize,
      })),
    });
  } catch (error) {
    console.error('Digital delivery email failed:', error.message);
    await recordOperationalEvent('DIGITAL_DELIVERY_EMAIL_FAILURE', error.message, { orderId, entitlementIds });
  }
};

const fulfillArtworkOrder = async (orderId) => {
  const result = await fulfillTransaction(orderId);
  await sendNewEntitlementEmail(orderId, result.newEntitlementIds || []);
  return result;
};

module.exports = { fulfillArtworkOrder, sendNewEntitlementEmail };
