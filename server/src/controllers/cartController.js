const prisma = require('../config/database');

const artworkInclude = {
  images: { orderBy: [{ isPrimary: 'desc' }, { order: 'asc' }] },
};

const serialize = item => ({
  ...item.artwork,
  isAvailable: item.artwork.status === 'AVAILABLE',
  cartAddedAt: item.createdAt,
});

const loadCart = customerId => prisma.cartItem.findMany({
  where: { customerId },
  include: { artwork: { include: artworkInclude } },
  orderBy: { createdAt: 'asc' },
});

exports.getCart = async (req, res) => {
  try {
    const items = await loadCart(req.user.id);
    res.json({ items: items.map(serialize), unavailableCount: items.filter(item => item.artwork.status !== 'AVAILABLE').length });
  } catch (error) {
    console.error('Failed to load cart:', error);
    res.status(500).json({ error: 'Failed to load cart' });
  }
};

exports.mergeCart = async (req, res) => {
  try {
    const artworkIds = [...new Set((Array.isArray(req.body.artworkIds) ? req.body.artworkIds : []).map(String).filter(Boolean))].slice(0, 20);
    if (artworkIds.length) {
      const currentItems = await prisma.cartItem.findMany({ where: { customerId: req.user.id }, select: { artworkId: true } });
      const currentIds = new Set(currentItems.map(item => item.artworkId));
      const availableSlots = Math.max(20 - currentItems.length, 0);
      const validArtworkIds = (await prisma.artwork.findMany({ where: { id: { in: artworkIds } }, select: { id: true } })).map(item => item.id);
      const idsToMerge = [...validArtworkIds.filter(id => currentIds.has(id)), ...validArtworkIds.filter(id => !currentIds.has(id)).slice(0, availableSlots)];
      await prisma.$transaction(idsToMerge.map(artworkId => prisma.cartItem.upsert({
        where: { customerId_artworkId: { customerId: req.user.id, artworkId } },
        create: { customerId: req.user.id, artworkId },
        update: {},
      })));
    }
    const items = await loadCart(req.user.id);
    res.json({ items: items.map(serialize), unavailableCount: items.filter(item => item.artwork.status !== 'AVAILABLE').length });
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
    const existing = await prisma.cartItem.findUnique({ where: { customerId_artworkId: { customerId: req.user.id, artworkId: artwork.id } } });
    const count = existing ? 0 : await prisma.cartItem.count({ where: { customerId: req.user.id } });
    if (count >= 20) return res.status(400).json({ error: 'Your cart can contain up to 20 artworks' });
    const item = await prisma.cartItem.upsert({
      where: { customerId_artworkId: { customerId: req.user.id, artworkId: artwork.id } },
      create: { customerId: req.user.id, artworkId: artwork.id },
      update: {},
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
