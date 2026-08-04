const prisma = require('../config/database');
const { normalizeLicenseType, priceForLicense, remainingEditions } = require('../utils/digitalCommerce');

const artworkInclude = {
  images: { orderBy: [{ isPrimary: 'desc' }, { order: 'asc' }] },
};

const serialize = item => ({
  ...item.artwork,
  price: priceForLicense(item.artwork, item.licenseType),
  licenseType: item.licenseType,
  editionRemaining: remainingEditions(item.artwork),
  isAvailable: item.artwork.status === 'AVAILABLE' && remainingEditions(item.artwork) !== 0,
  cartAddedAt: item.createdAt,
});

const loadCart = customerId => prisma.cartItem.findMany({
  where: { customerId },
  include: { artwork: { include: artworkInclude } },
  orderBy: { createdAt: 'asc' },
});
const isUnavailable = item => item.artwork.status !== 'AVAILABLE' || remainingEditions(item.artwork) === 0;

exports.getCart = async (req, res) => {
  try {
    const items = await loadCart(req.user.id);
    res.json({ items: items.map(serialize), unavailableCount: items.filter(isUnavailable).length });
  } catch (error) {
    console.error('Failed to load cart:', error);
    res.status(500).json({ error: 'Failed to load cart' });
  }
};

exports.mergeCart = async (req, res) => {
  try {
    const requestedItems = Array.isArray(req.body.items)
      ? req.body.items
      : (Array.isArray(req.body.artworkIds) ? req.body.artworkIds.map(id => ({ id })) : []);
    const uniqueItems = [...new Map(requestedItems.filter(item => item?.id).map(item => [String(item.id), item])).values()].slice(0, 20);
    const artworkIds = uniqueItems.map(item => String(item.id));
    if (artworkIds.length) {
      const currentItems = await prisma.cartItem.findMany({ where: { customerId: req.user.id }, select: { artworkId: true } });
      const currentIds = new Set(currentItems.map(item => item.artworkId));
      const availableSlots = Math.max(20 - currentItems.length, 0);
      const validArtworks = await prisma.artwork.findMany({ where: { id: { in: artworkIds } } });
      const validArtworkIds = validArtworks.map(item => item.id);
      const artworkById = new Map(validArtworks.map(item => [item.id, item]));
      const requestById = new Map(uniqueItems.map(item => [String(item.id), item]));
      const idsToMerge = [...validArtworkIds.filter(id => currentIds.has(id)), ...validArtworkIds.filter(id => !currentIds.has(id)).slice(0, availableSlots)];
      await prisma.$transaction(idsToMerge.map(artworkId => {
        const licenseType = normalizeLicenseType(artworkById.get(artworkId), requestById.get(artworkId)?.licenseType);
        return prisma.cartItem.upsert({
        where: { customerId_artworkId: { customerId: req.user.id, artworkId } },
        create: { customerId: req.user.id, artworkId, licenseType },
        update: { licenseType },
      });
      }));
    }
    const items = await loadCart(req.user.id);
    res.json({ items: items.map(serialize), unavailableCount: items.filter(isUnavailable).length });
  } catch (error) {
    console.error('Failed to merge cart:', error);
    res.status(500).json({ error: 'Failed to synchronize cart' });
  }
};

exports.addItem = async (req, res) => {
  try {
    const artwork = await prisma.artwork.findUnique({ where: { id: req.params.artworkId }, include: artworkInclude });
    if (!artwork) return res.status(404).json({ error: 'Artwork not found' });
    if (artwork.status !== 'AVAILABLE') return res.status(409).json({ error: 'This artwork is no longer available' });
    if (remainingEditions(artwork) === 0) return res.status(409).json({ error: 'This digital edition is sold out' });
    const requestedLicense = String(req.body.licenseType || '').toUpperCase();
    if (requestedLicense === 'COMMERCIAL_USE' && normalizeLicenseType(artwork, requestedLicense) !== 'COMMERCIAL_USE') {
      return res.status(400).json({ error: 'A commercial licence is not available for this artwork' });
    }
    const licenseType = normalizeLicenseType(artwork, requestedLicense);
    const existing = await prisma.cartItem.findUnique({ where: { customerId_artworkId: { customerId: req.user.id, artworkId: artwork.id } } });
    const count = existing ? 0 : await prisma.cartItem.count({ where: { customerId: req.user.id } });
    if (count >= 20) return res.status(400).json({ error: 'Your cart can contain up to 20 artworks' });
    const item = await prisma.cartItem.upsert({
      where: { customerId_artworkId: { customerId: req.user.id, artworkId: artwork.id } },
      create: { customerId: req.user.id, artworkId: artwork.id, licenseType },
      update: { licenseType },
    });
    res.status(201).json(serialize({ ...item, artwork }));
  } catch (error) {
    console.error('Failed to add cart item:', error);
    res.status(500).json({ error: 'Failed to add artwork to cart' });
  }
};

exports.removeItem = async (req, res) => {
  try {
    await prisma.cartItem.deleteMany({ where: { customerId: req.user.id, artworkId: req.params.artworkId } });
    res.status(204).send();
  } catch (error) {
    console.error('Failed to remove cart item:', error);
    res.status(500).json({ error: 'Failed to remove artwork from cart' });
  }
};

exports.clearCart = async (req, res) => {
  try {
    await prisma.cartItem.deleteMany({ where: { customerId: req.user.id } });
    res.status(204).send();
  } catch (error) {
    console.error('Failed to clear cart:', error);
    res.status(500).json({ error: 'Failed to clear cart' });
  }
};
