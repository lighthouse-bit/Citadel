// server/src/controllers/artworkController.js
// ✅ Controller kept lean — routes handle logic directly
// This file kept for any future controller-based refactoring

const prisma = require('../config/database');
const { deleteFromCloudinary } = require('../services/imageService');

// Get all artworks (with filtering & pagination)
exports.getAllArtworks = async (req, res) => {
  try {
    const {
      page     = 1,
      limit    = 12,
      category,
      status,
      featured,
      sort     = 'createdAt',
      order    = 'desc',
      search,
    } = req.query;

    const skip  = (parseInt(page) - 1) * parseInt(limit);
    const where = {};

    if (category) where.category = category.toUpperCase();

    if (status) {
      where.status = status.toUpperCase();
    } else {
      where.status = { in: ['AVAILABLE', 'SOLD', 'RESERVED', 'NOT_FOR_SALE'] };
    }

    if (featured === 'true') where.featured = true;

    if (search) {
      where.OR = [
        { title:       { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { medium:      { contains: search, mode: 'insensitive' } },
      ];
    }

    const [artworks, total] = await Promise.all([
      prisma.artwork.findMany({
        where,
        include: {
          images: { orderBy: { order: 'asc' } },
          tags:   { include: { tag: true } },
        },
        orderBy: { [sort]: order },
        skip,
        take: parseInt(limit),
      }),
      prisma.artwork.count({ where }),
    ]);

    res.json({
      artworks,
      pagination: {
        page:  parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error('Error fetching artworks:', error);
    res.status(500).json({ error: 'Failed to fetch artworks' });
  }
};

// Get single artwork by ID
exports.getArtworkById = async (req, res) => {
  try {
    const { id } = req.params;

    const artwork = await prisma.artwork.findUnique({
      where:   { id },
      include: {
        images: { orderBy: { order: 'asc' } },
        tags:   { include: { tag: true } },
      },
    });

    if (!artwork) {
      return res.status(404).json({ error: 'Artwork not found' });
    }

    res.json(artwork);
  } catch (error) {
    console.error('Error fetching artwork:', error);
    res.status(500).json({ error: 'Failed to fetch artwork' });
  }
};

// Get featured artworks
exports.getFeaturedArtworks = async (req, res) => {
  try {
    const artworks = await prisma.artwork.findMany({
      where: {
        featured: true,
        status:   'AVAILABLE',
      },
      include: {
        images: { where: { isPrimary: true } },
      },
      orderBy: { displayOrder: 'asc' },
      take: 6,
    });

    res.json(artworks);
  } catch (error) {
    console.error('Error fetching featured artworks:', error);
    res.status(500).json({ error: 'Failed to fetch featured artworks' });
  }
};

// Delete artwork (Admin)
exports.deleteArtwork = async (req, res) => {
  try {
    const { id } = req.params;

    const artwork = await prisma.artwork.findUnique({
      where:   { id },
      include: { images: true },
    });

    if (!artwork) {
      return res.status(404).json({ error: 'Artwork not found' });
    }

    for (const image of artwork.images) {
      await deleteFromCloudinary(image.publicId).catch(() => {});
    }

    await prisma.artwork.delete({ where: { id } });

    res.json({ message: 'Artwork deleted successfully' });
  } catch (error) {
    console.error('Error deleting artwork:', error);
    res.status(500).json({ error: 'Failed to delete artwork' });
  }
};