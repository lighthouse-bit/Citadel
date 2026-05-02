// server/src/routes/artworkRoutes.js
const express = require('express');
const router = express.Router();
const prisma = require('../config/database');
const { authenticateAdmin } = require('../middleware/auth');
const { deleteFromCloudinary } = require('../services/imageService');

// ── Get all artworks (Public) ────────────────────────────────────────────────
router.get('/', async (req, res) => {
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
    if (status)   where.status   = status.toUpperCase();
    if (featured === 'true') where.featured = true;

    if (search) {
      where.OR = [
        { title:       { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [artworks, total] = await Promise.all([
      prisma.artwork.findMany({
        where,
        include: {
          images: { orderBy: { order: 'asc' } },
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
});

// ── Get featured artworks (Public) ──────────────────────────────────────────
router.get('/featured', async (req, res) => {
  try {
    const artworks = await prisma.artwork.findMany({
      where: {
        featured: true,
        status:   { in: ['AVAILABLE', 'NOT_FOR_SALE'] },
      },
      include: {
        images: {
          orderBy: { order: 'asc' },
          take:    1,
        },
      },
      orderBy: { displayOrder: 'asc' },
      take: 6,
    });

    res.json(artworks);
  } catch (error) {
    console.error('Error fetching featured artworks:', error);
    res.status(500).json({ error: 'Failed to fetch featured artworks' });
  }
});

// ── Get single artwork by ID (Public) ───────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const artwork = await prisma.artwork.findUnique({
      where:   { id },
      include: {
        images: { orderBy: { order: 'asc' } },
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
});

// ── Create artwork (Admin) ───────────────────────────────────────────────────
// ✅ Now accepts JSON with Cloudinary URLs — no file upload through server
router.post('/', authenticateAdmin, async (req, res) => {
  try {
    const {
      title,
      description,
      price,
      category,
      medium,
      year,
      width,
      height,
      depth,
      unit,
      status,
      featured,
      metaTitle,
      metaDesc,
      images = [], // ✅ Array of {url, publicId, isPrimary, order} from Cloudinary
    } = req.body;

    // Generate slug
    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    const existingSlug = await prisma.artwork.findUnique({ where: { slug } });
    const finalSlug    = existingSlug ? `${slug}-${Date.now()}` : slug;

    // ✅ Use Cloudinary URLs directly — no upload needed
    const imageData = images
      .filter(img => img.url && img.publicId) // only valid images
      .map((img, i) => ({
        url:       img.url,
        publicId:  img.publicId,
        isPrimary: i === 0,
        order:     i,
      }));

    const artwork = await prisma.artwork.create({
      data: {
        title,
        description,
        price:     parseFloat(price),
        category:  (category || 'PAINTING').toUpperCase(),
        medium:    medium    || null,
        year:      year      ? parseInt(year)     : null,
        width:     width     ? parseFloat(width)  : null,
        height:    height    ? parseFloat(height) : null,
        depth:     depth     ? parseFloat(depth)  : null,
        unit:      unit      || 'inches',
        status:    (status   || 'AVAILABLE').toUpperCase(),
        featured:  featured  === true || featured === 'true',
        slug:      finalSlug,
        metaTitle: metaTitle || title,
        metaDesc:  metaDesc  || description?.substring(0, 160),
        images:    { create: imageData },
      },
      include: {
        images: { orderBy: { order: 'asc' } },
      },
    });

    // ✅ Create notification for new artwork
    await prisma.notification.create({
      data: {
        type:    'SYSTEM',
        message: `New artwork "${title}" has been added`,
        link:    `/admin/artworks/${artwork.id}`,
      },
    }).catch(() => {}); // Don't fail if notification fails

    res.status(201).json(artwork);
  } catch (error) {
    console.error('Error creating artwork:', error);
    res.status(500).json({ error: 'Failed to create artwork', details: error.message });
  }
});

// ── Update artwork (Admin) ───────────────────────────────────────────────────
// ✅ Now accepts JSON with Cloudinary URLs — no file upload through server
router.put('/:id', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      description,
      price,
      category,
      medium,
      year,
      width,
      height,
      depth,
      unit,
      status,
      featured,
      images, // ✅ Array from frontend with existing + new Cloudinary images
    } = req.body;

    // Build update data
    const updateData = {};
    if (title       !== undefined) updateData.title       = title;
    if (description !== undefined) updateData.description = description;
    if (price       !== undefined) updateData.price       = parseFloat(price);
    if (category    !== undefined) updateData.category    = category.toUpperCase();
    if (medium      !== undefined) updateData.medium      = medium;
    if (year        !== undefined) updateData.year        = parseInt(year);
    if (width       !== undefined) updateData.width       = width ? parseFloat(width) : null;
    if (height      !== undefined) updateData.height      = height ? parseFloat(height) : null;
    if (depth       !== undefined) updateData.depth       = depth ? parseFloat(depth) : null;
    if (unit        !== undefined) updateData.unit        = unit;
    if (status      !== undefined) updateData.status      = status.toUpperCase();
    if (featured    !== undefined) updateData.featured    = featured === true || featured === 'true';

    // ✅ Handle images — add only NEW ones (not existing)
    if (images && Array.isArray(images)) {
      const newImages = images.filter(img => !img.existing && img.url && img.publicId);

      if (newImages.length > 0) {
        // Get current image count for ordering
        const existingCount = await prisma.artworkImage.count({
          where: { artworkId: id },
        });

        await prisma.artworkImage.createMany({
          data: newImages.map((img, i) => ({
            url:       img.url,
            publicId:  img.publicId,
            isPrimary: existingCount === 0 && i === 0,
            order:     existingCount + i,
            artworkId: id,
          })),
        });
      }

      // ✅ Handle removed existing images
      const keptExistingIds = images
        .filter(img => img.existing && img.id)
        .map(img => img.id);

      // Find images that were removed
      const allExisting = await prisma.artworkImage.findMany({
        where: { artworkId: id },
      });

      const removedImages = allExisting.filter(
        img => !keptExistingIds.includes(img.id)
      );

      // Delete removed images from Cloudinary + DB
      for (const img of removedImages) {
        if (img.publicId) {
          await deleteFromCloudinary(img.publicId).catch(() => {});
        }
        await prisma.artworkImage.delete({ where: { id: img.id } }).catch(() => {});
      }
    }

    const artwork = await prisma.artwork.update({
      where:   { id },
      data:    updateData,
      include: {
        images: { orderBy: { order: 'asc' } },
      },
    });

    res.json(artwork);
  } catch (error) {
    console.error('Error updating artwork:', error);
    res.status(500).json({ error: 'Failed to update artwork' });
  }
});

// ── Delete artwork (Admin) ───────────────────────────────────────────────────
router.delete('/:id', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const artwork = await prisma.artwork.findUnique({
      where:   { id },
      include: { images: true },
    });

    if (!artwork) {
      return res.status(404).json({ error: 'Artwork not found' });
    }

    // Delete images from Cloudinary
    for (const image of artwork.images) {
      if (image.publicId && !image.publicId.startsWith('placeholder')) {
        await deleteFromCloudinary(image.publicId).catch(() => {});
      }
    }

    // Delete artwork (cascade deletes images from DB)
    await prisma.artwork.delete({ where: { id } });

    res.json({ message: 'Artwork deleted successfully' });
  } catch (error) {
    console.error('Error deleting artwork:', error);
    res.status(500).json({ error: 'Failed to delete artwork' });
  }
});

module.exports = router;