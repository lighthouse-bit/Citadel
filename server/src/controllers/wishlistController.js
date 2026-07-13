const prisma = require('../config/database');

const artworkInclude = {
  images: { orderBy: [{ isPrimary: 'desc' }, { order: 'asc' }] },
  _count: { select: { wishlistItems: true } },
};

exports.list = async (req, res) => {
  try {
    const items = await prisma.wishlistItem.findMany({
      where: { customerId: req.user.id },
      include: { artwork: { include: artworkInclude } },
      orderBy: { createdAt: 'desc' },
    });
    res.json({
      artworks: items.map(({ artwork, createdAt }) => ({ ...artwork, wishlistedAt: createdAt })),
      artworkIds: items.map(item => item.artworkId),
    });
  } catch (error) {
    console.error('Failed to load wishlist:', error);
    res.status(500).json({ error: 'Failed to load wishlist' });
  }
};

exports.add = async (req, res) => {
  try {
    const artwork = await prisma.artwork.findUnique({ where: { id: req.params.artworkId }, select: { id: true } });
    if (!artwork) return res.status(404).json({ error: 'Artwork not found' });
    await prisma.wishlistItem.upsert({
      where: { customerId_artworkId: { customerId: req.user.id, artworkId: artwork.id } },
      create: { customerId: req.user.id, artworkId: artwork.id },
      update: {},
    });
    const count = await prisma.wishlistItem.count({ where: { artworkId: artwork.id } });
    res.status(201).json({ saved: true, artworkId: artwork.id, wishlistCount: count });
  } catch (error) {
    console.error('Failed to save wishlist item:', error);
    res.status(500).json({ error: 'Failed to save artwork' });
  }
};

exports.remove = async (req, res) => {
  try {
    await prisma.wishlistItem.deleteMany({
      where: { customerId: req.user.id, artworkId: req.params.artworkId },
    });
    const count = await prisma.wishlistItem.count({ where: { artworkId: req.params.artworkId } });
    res.json({ saved: false, artworkId: req.params.artworkId, wishlistCount: count });
  } catch (error) {
    console.error('Failed to remove wishlist item:', error);
    res.status(500).json({ error: 'Failed to remove artwork' });
  }
};
