const cloudinary = require('../config/cloudinary');
const prisma = require('../config/database');
const { recordAudit } = require('../utils/auditService');
const { createCustomerNotification } = require('../services/customerNotificationService');
const { sendDigitalDeliveryEmail } = require('../utils/emailService');

const entitlementInclude = {
  artwork: {
    select: {
      id: true,
      title: true,
      slug: true,
      images: { orderBy: [{ isPrimary: 'desc' }, { order: 'asc' }], take: 1 },
      digitalAsset: true,
    },
  },
  orderItem: { select: { order: { select: { id: true, orderNumber: true, createdAt: true } } } },
};

const serialize = (entitlement) => ({
  id: entitlement.id,
  artwork: {
    id: entitlement.artwork.id,
    title: entitlement.artwork.title,
    slug: entitlement.artwork.slug,
    previewUrl: entitlement.artwork.images[0]?.url || null,
  },
  licenseType: entitlement.licenseType,
  licenseName: entitlement.licenseName,
  editionNumber: entitlement.editionNumber,
  editionSize: entitlement.editionSize,
  format: entitlement.artwork.digitalAsset?.format?.toUpperCase() || null,
  bytes: entitlement.artwork.digitalAsset?.bytes || null,
  downloadCount: entitlement.downloadCount,
  downloadLimit: entitlement.downloadLimit,
  remainingDownloads: Math.max(entitlement.downloadLimit - entitlement.downloadCount, 0),
  lastDownloadedAt: entitlement.lastDownloadedAt,
  purchasedAt: entitlement.orderItem.order.createdAt,
  orderNumber: entitlement.orderItem.order.orderNumber,
  revoked: Boolean(entitlement.revokedAt),
  verificationPath: `/certificate/${entitlement.id}`,
});

const maskedOwner = customer => [customer.firstName, customer.lastName]
  .filter(Boolean)
  .map(name => `${String(name).trim().charAt(0).toUpperCase()}.`)
  .join(' ') || 'Private collector';

exports.verifyCertificate = async (req, res) => {
  try {
    const certificateId = String(req.params.id || '');
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(certificateId)) {
      return res.status(404).json({ error: 'Certificate not found' });
    }
    const entitlement = await prisma.digitalEntitlement.findUnique({
      where: { id: certificateId },
      select: {
        id: true,
        licenseType: true,
        licenseName: true,
        editionNumber: true,
        editionSize: true,
        createdAt: true,
        revokedAt: true,
        customer: { select: { firstName: true, lastName: true } },
        artwork: { select: { id: true, title: true, slug: true, images: { orderBy: [{ isPrimary: 'desc' }, { order: 'asc' }], take: 1 } } },
      },
    });
    if (!entitlement) return res.status(404).json({ error: 'Certificate not found' });
    res.setHeader('Cache-Control', 'no-store');
    return res.json({
      certificateId: entitlement.id,
      status: entitlement.revokedAt ? 'REVOKED' : 'VALID',
      owner: maskedOwner(entitlement.customer),
      artwork: {
        id: entitlement.artwork.id,
        title: entitlement.artwork.title,
        slug: entitlement.artwork.slug,
        previewUrl: entitlement.artwork.images[0]?.url || null,
      },
      licence: { type: entitlement.licenseType, name: entitlement.licenseName },
      edition: entitlement.editionNumber ? { number: entitlement.editionNumber, size: entitlement.editionSize } : null,
      issuedAt: entitlement.createdAt,
      revokedAt: entitlement.revokedAt,
    });
  } catch (error) {
    console.error('Failed to verify digital certificate:', error);
    return res.status(500).json({ error: 'Certificate verification is temporarily unavailable' });
  }
};

exports.listLibrary = async (req, res) => {
  try {
    const entitlements = await prisma.digitalEntitlement.findMany({
      where: { customerId: req.user.id },
      include: entitlementInclude,
      orderBy: { createdAt: 'desc' },
    });
    return res.json({ items: entitlements.map(serialize) });
  } catch (error) {
    console.error('Failed to load digital library:', error);
    return res.status(500).json({ error: 'Failed to load your digital collection' });
  }
};

exports.createDownload = async (req, res) => {
  try {
    const entitlement = await prisma.digitalEntitlement.findFirst({
      where: { id: req.params.id, customerId: req.user.id },
      include: entitlementInclude,
    });
    if (!entitlement) return res.status(404).json({ error: 'Digital artwork not found in your collection' });
    if (entitlement.revokedAt) return res.status(403).json({ error: 'Download access has been revoked' });
    if (!entitlement.artwork.digitalAsset) return res.status(409).json({ error: 'The downloadable file is temporarily unavailable' });

    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.digitalEntitlement.updateMany({
        where: {
          id: entitlement.id,
          customerId: req.user.id,
          revokedAt: null,
          downloadCount: { lt: entitlement.downloadLimit },
        },
        data: { downloadCount: { increment: 1 }, lastDownloadedAt: new Date() },
      });
      if (result.count !== 1) return false;
      await tx.digitalDownload.create({
        data: {
          entitlementId: entitlement.id,
          userAgent: String(req.headers['user-agent'] || '').slice(0, 500) || null,
        },
      });
      return true;
    });
    if (!updated) return res.status(429).json({ error: 'You have reached the download limit for this artwork' });

    const expiresAt = Math.floor(Date.now() / 1000) + 10 * 60;
    const asset = entitlement.artwork.digitalAsset;
    const url = cloudinary.utils.private_download_url(asset.publicId, asset.format, {
      resource_type: asset.resourceType,
      type: 'authenticated',
      attachment: true,
      expires_at: expiresAt,
    });
    return res.json({ url, expiresAt: new Date(expiresAt * 1000).toISOString() });
  } catch (error) {
    console.error('Failed to create digital download:', error);
    return res.status(500).json({ error: 'Could not prepare the secure download' });
  }
};

const escapeHtml = (value) => String(value || '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;');

exports.downloadLicense = async (req, res) => {
  try {
    const entitlement = await prisma.digitalEntitlement.findFirst({
      where: { id: req.params.id, customerId: req.user.id },
      include: {
        ...entitlementInclude,
        customer: { select: { firstName: true, lastName: true, email: true } },
      },
    });
    if (!entitlement) return res.status(404).json({ error: 'Digital artwork not found in your collection' });
    const asset = entitlement.artwork.digitalAsset;
    if (!asset) return res.status(409).json({ error: 'License details are unavailable' });

    const safeFilename = entitlement.artwork.title.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase() || 'artwork';
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    const licenceLabel = entitlement.licenseType === 'COMMERCIAL_USE' ? 'commercial-use' : 'personal-use';
    const editionLine = entitlement.editionNumber ? `<p><strong>Edition:</strong> ${escapeHtml(entitlement.editionNumber)} of ${escapeHtml(entitlement.editionSize)}</p>` : '';
    const verificationUrl = `${String(process.env.CLIENT_URL || 'https://highmarc.com').replace(/\/$/, '')}/certificate/${entitlement.id}`;
    res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}-${licenceLabel}-license.html"`);
    return res.send(`<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(entitlement.licenseName)}</title><style>body{font-family:Georgia,serif;color:#1c1917;max-width:760px;margin:60px auto;padding:32px;line-height:1.7}h1{font-size:34px}small{color:#78716c}.seal{border:1px solid #d6d3d1;padding:24px;margin:30px 0;background:#fafaf9}pre{white-space:pre-wrap;font:inherit}a{color:#b45309}</style></head><body><small>HIGHMARC ART ATELIER</small><h1>${escapeHtml(entitlement.licenseName)}</h1><p>This certifies that <strong>${escapeHtml(`${entitlement.customer.firstName} ${entitlement.customer.lastName}`.trim())}</strong> (${escapeHtml(entitlement.customer.email)}) purchased a ${escapeHtml(licenceLabel.replace('-', ' '))} digital licence for <strong>${escapeHtml(entitlement.artwork.title)}</strong>.</p><div class="seal"><p><strong>Certificate:</strong> ${escapeHtml(entitlement.id)}</p><p><strong>Order:</strong> ${escapeHtml(entitlement.orderItem.order.orderNumber)}</p>${editionLine}<p><strong>Issued:</strong> ${escapeHtml(new Date(entitlement.createdAt).toLocaleDateString('en-GB'))}</p><p><strong>Verify:</strong> <a href="${escapeHtml(verificationUrl)}">${escapeHtml(verificationUrl)}</a></p></div><h2>Licence terms</h2><pre>${escapeHtml(entitlement.licenseText)}</pre><p><small>This certificate records the licence issued at the time of purchase. Copyright remains with the artist.</small></p></body></html>`);
  } catch (error) {
    console.error('Failed to generate digital license:', error);
    return res.status(500).json({ error: 'Could not generate the licence document' });
  }
};

const adminInclude = {
  customer: { select: { id: true, firstName: true, lastName: true, email: true } },
  artwork: { select: { id: true, title: true, editionSize: true, images: { orderBy: [{ isPrimary: 'desc' }, { order: 'asc' }], take: 1 } } },
  orderItem: { select: { price: true, order: { select: { id: true, orderNumber: true, createdAt: true, paymentStatus: true } } } },
};

const serializeAdmin = entitlement => ({
  id: entitlement.id,
  customer: entitlement.customer,
  artwork: {
    ...entitlement.artwork,
    previewUrl: entitlement.artwork.images[0]?.url || null,
    images: undefined,
  },
  order: entitlement.orderItem.order,
  paidPrice: Number(entitlement.orderItem.price),
  licenseType: entitlement.licenseType,
  licenseName: entitlement.licenseName,
  editionNumber: entitlement.editionNumber,
  editionSize: entitlement.editionSize,
  downloadCount: entitlement.downloadCount,
  downloadLimit: entitlement.downloadLimit,
  lastDownloadedAt: entitlement.lastDownloadedAt,
  revokedAt: entitlement.revokedAt,
  createdAt: entitlement.createdAt,
});

exports.adminSummary = async (req, res) => {
  try {
    const from = req.query.from ? new Date(`${req.query.from}T00:00:00.000Z`) : null;
    const to = req.query.to ? new Date(`${req.query.to}T23:59:59.999Z`) : null;
    if ((from && Number.isNaN(from.getTime())) || (to && Number.isNaN(to.getTime()))) return res.status(400).json({ error: 'Invalid report date range' });
    const paidOrder = { paymentStatus: 'FULLY_PAID', ...((from || to) && { createdAt: { ...(from && { gte: from }), ...(to && { lte: to }) } }) };
    const paidDigitalWhere = { artwork: { is: { productType: 'DIGITAL' } }, order: { is: paidOrder } };

    const [sales, entitlements, downloads, revoked, licenceMix, collectors, topReleaseRows] = await Promise.all([
      prisma.orderItem.aggregate({ where: paidDigitalWhere, _sum: { price: true }, _count: { _all: true } }),
      prisma.digitalEntitlement.count(),
      prisma.digitalEntitlement.aggregate({ _sum: { downloadCount: true } }),
      prisma.digitalEntitlement.count({ where: { revokedAt: { not: null } } }),
      prisma.digitalEntitlement.groupBy({ by: ['licenseType'], _count: { _all: true } }),
      prisma.digitalEntitlement.groupBy({ by: ['customerId'] }),
      prisma.orderItem.groupBy({ by: ['artworkId'], where: paidDigitalWhere, _sum: { price: true }, _count: { _all: true }, orderBy: { _count: { artworkId: 'desc' } }, take: 5 }),
    ]);
    const artworkIds = topReleaseRows.map(item => item.artworkId);
    const releases = artworkIds.length ? await prisma.artwork.findMany({ where: { id: { in: artworkIds } }, select: { id: true, title: true, editionSize: true, editionsIssued: true } }) : [];
    const releaseById = new Map(releases.map(item => [item.id, item]));
    return res.json({
      summary: {
        revenue: Number(sales._sum.price || 0),
        sales: sales._count._all,
        entitlements,
        downloads: downloads._sum.downloadCount || 0,
        collectors: collectors.length,
        revoked,
      },
      licenceMix: licenceMix.map(item => ({ type: item.licenseType, count: item._count._all })),
      topReleases: topReleaseRows.map(item => ({ ...releaseById.get(item.artworkId), sales: item._count._all, revenue: Number(item._sum.price || 0) })),
    });
  } catch (error) {
    console.error('Failed to load digital sales summary:', error);
    return res.status(500).json({ error: 'Failed to load digital sales summary' });
  }
};

exports.adminListEntitlements = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);
    const search = String(req.query.search || '').trim().slice(0, 100);
    const licenceType = String(req.query.licenseType || '').toUpperCase();
    const access = String(req.query.access || '').toUpperCase();
    const where = {
      ...(licenceType && ['PERSONAL_USE', 'COMMERCIAL_USE'].includes(licenceType) && { licenseType: licenceType }),
      ...(access === 'ACTIVE' && { revokedAt: null }),
      ...(access === 'REVOKED' && { revokedAt: { not: null } }),
      ...(search && { OR: [
        { customer: { is: { email: { contains: search, mode: 'insensitive' } } } },
        { customer: { is: { firstName: { contains: search, mode: 'insensitive' } } } },
        { customer: { is: { lastName: { contains: search, mode: 'insensitive' } } } },
        { artwork: { is: { title: { contains: search, mode: 'insensitive' } } } },
        { orderItem: { is: { order: { is: { orderNumber: { contains: search, mode: 'insensitive' } } } } } },
      ] }),
    };
    const [items, total] = await Promise.all([
      prisma.digitalEntitlement.findMany({ where, include: adminInclude, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit }),
      prisma.digitalEntitlement.count({ where }),
    ]);
    return res.json({ items: items.map(serializeAdmin), pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (error) {
    console.error('Failed to list digital entitlements:', error);
    return res.status(500).json({ error: 'Failed to load digital licences' });
  }
};

exports.adminUpdateAccess = async (req, res) => {
  try {
    const action = String(req.body.action || '').toUpperCase();
    if (!['REVOKE', 'RESTORE', 'RESET_DOWNLOADS'].includes(action)) return res.status(400).json({ error: 'Choose a valid access action' });
    const reason = String(req.body.reason || '').trim().slice(0, 500);
    if (action === 'REVOKE' && reason.length < 3) return res.status(400).json({ error: 'A reason is required when revoking access' });
    const existing = await prisma.digitalEntitlement.findUnique({ where: { id: req.params.id }, include: adminInclude });
    if (!existing) return res.status(404).json({ error: 'Digital licence not found' });
    const data = action === 'REVOKE'
      ? { revokedAt: new Date() }
      : action === 'RESTORE'
        ? { revokedAt: null }
        : { downloadCount: 0, lastDownloadedAt: null };
    const updated = await prisma.digitalEntitlement.update({ where: { id: existing.id }, data, include: adminInclude });
    await recordAudit(req, `DIGITAL_ACCESS_${action}`, 'DigitalEntitlement', existing.id, {
      reason: reason || null,
      customerId: existing.customer.id,
      artworkId: existing.artwork.id,
      previousDownloadCount: existing.downloadCount,
    });
    const messages = {
      REVOKE: `Download access for ${existing.artwork.title} has been paused. Contact support if you need assistance.`,
      RESTORE: `Download access for ${existing.artwork.title} has been restored.`,
      RESET_DOWNLOADS: `Your download allowance for ${existing.artwork.title} has been renewed.`,
    };
    await createCustomerNotification({ customerId: existing.customer.id, type: 'SYSTEM', message: messages[action], link: '/account' })
      .catch(error => console.error('Digital access notification failed:', error.message));
    return res.json(serializeAdmin(updated));
  } catch (error) {
    console.error('Failed to update digital access:', error);
    return res.status(500).json({ error: 'Failed to update digital access' });
  }
};

exports.adminResendDeliveryEmail = async (req, res) => {
  try {
    const entitlement = await prisma.digitalEntitlement.findUnique({ where: { id: req.params.id }, include: adminInclude });
    if (!entitlement) return res.status(404).json({ error: 'Digital licence not found' });
    await sendDigitalDeliveryEmail({
      email: entitlement.customer.email,
      firstName: entitlement.customer.firstName,
      orderNumber: entitlement.orderItem.order.orderNumber,
      items: [{
        certificateId: entitlement.id,
        title: entitlement.artwork.title,
        licenseName: entitlement.licenseName,
        editionNumber: entitlement.editionNumber,
        editionSize: entitlement.editionSize,
      }],
    });
    await recordAudit(req, 'RESEND_DIGITAL_DELIVERY_EMAIL', 'DigitalEntitlement', entitlement.id, {
      customerId: entitlement.customer.id,
      artworkId: entitlement.artwork.id,
    });
    return res.json({ success: true, message: `Delivery email sent to ${entitlement.customer.email}` });
  } catch (error) {
    console.error('Failed to resend digital delivery email:', error);
    return res.status(500).json({ error: 'Failed to send the delivery email' });
  }
};
