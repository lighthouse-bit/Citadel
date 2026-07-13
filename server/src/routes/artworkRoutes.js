// server/src/routes/artworkRoutes.js
const express = require('express');
const router = express.Router();
const prisma = require('../config/database');
const { authenticateAdmin, authenticateCustomer, authenticateUser } = require('../middleware/auth');
const discoveryController = require('../controllers/discoveryController');
const { deleteFromCloudinary } = require('../services/imageService');
const { recordAudit } = require('../utils/auditService');
const { previewWishlistAlertAudience, sendSimilarArtworkAlerts, sendWishlistChangeAlerts } = require('../services/wishlistAlertService');

// ── Get all artworks (Public) ────────────────────────────────────────────────
router.get('/', authenticateUser, async (req, res) => {
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
      medium,
      minPrice,
      maxPrice,
      minYear,
      maxYear,
      minWidth,
      maxWidth,
      minHeight,
      maxHeight,
    } = req.query;

    const safePage = Math.max(parseInt(page, 10) || 1, 1);
    const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 12, 1), 100);
    const skip  = (safePage - 1) * safeLimit;
    const where = {};

    if (category) where.category = category.toUpperCase();
    if (status && req.user?.role === 'admin') where.status = status.toUpperCase();
    else if (status) where.status = { equals: status.toUpperCase(), notIn: ['DRAFT', 'ARCHIVED'] };
    else if (req.user?.role !== 'admin') where.status = { notIn: ['DRAFT', 'ARCHIVED'] };
    if (featured === 'true') where.featured = true;
    if (medium) where.medium = { contains: String(medium).slice(0, 100), mode: 'insensitive' };

    const numericRange = (minimum, maximum) => ({
      ...(Number.isFinite(Number(minimum)) && minimum !== '' && { gte: Number(minimum) }),
      ...(Number.isFinite(Number(maximum)) && maximum !== '' && { lte: Number(maximum) }),
    });
    const priceRange = numericRange(minPrice, maxPrice);
    const yearRange = numericRange(minYear, maxYear);
    const widthRange = numericRange(minWidth, maxWidth);
    const heightRange = numericRange(minHeight, maxHeight);
    if (Object.keys(priceRange).length) where.price = priceRange;
    if (Object.keys(yearRange).length) where.year = yearRange;
    if (Object.keys(widthRange).length) where.width = widthRange;
    if (Object.keys(heightRange).length) where.height = heightRange;

    if (search) {
      const safeSearch = String(search).trim().slice(0, 100);
      where.OR = [
        { title:       { contains: safeSearch, mode: 'insensitive' } },
        { description: { contains: safeSearch, mode: 'insensitive' } },
        { medium: { contains: safeSearch, mode: 'insensitive' } },
        { tags: { some: { tag: { name: { contains: safeSearch, mode: 'insensitive' } } } } },
      ];
    }

    const direction = order === 'asc' ? 'asc' : 'desc';
    const orderBy = sort === 'popular'
      ? [{ wishlistItems: { _count: 'desc' } }, { orderItems: { _count: 'desc' } }, { createdAt: 'desc' }]
      : sort === 'wishlisted'
        ? [{ wishlistItems: { _count: 'desc' } }, { createdAt: 'desc' }]
        : { [['createdAt', 'price', 'title', 'updatedAt', 'year'].includes(sort) ? sort : 'createdAt']: direction };

    const [artworks, total] = await Promise.all([
      prisma.artwork.findMany({
        where,
        include: {
          images: { orderBy: [{ isPrimary: 'desc' }, { order: 'asc' }] },
          tags: { include: { tag: true } },
          _count: { select: { orderItems: true, wishlistItems: true } },
        },
        orderBy,
        skip,
        take: safeLimit,
      }),
      prisma.artwork.count({ where }),
    ]);

    res.json({
      artworks,
      pagination: {
        page: safePage,
        limit: safeLimit,
        total,
        pages: Math.ceil(total / safeLimit),
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

router.get('/facets', discoveryController.getFacets);
router.get('/suggestions', discoveryController.getSuggestions);
router.get('/recommendations', authenticateUser, discoveryController.getRecommendations);
router.get('/recently-viewed', authenticateCustomer, discoveryController.getRecentlyViewed);
router.get('/:id/related', discoveryController.getRelated);
router.post('/:id/view', authenticateUser, discoveryController.recordView);

router.get('/admin/stats', authenticateAdmin, async (req, res) => {
  try {
    const [total, available, sold, drafts, archived, aggregate] = await Promise.all([
      prisma.artwork.count(), prisma.artwork.count({ where: { status: 'AVAILABLE' } }), prisma.artwork.count({ where: { status: 'SOLD' } }),
      prisma.artwork.count({ where: { status: 'DRAFT' } }), prisma.artwork.count({ where: { status: 'ARCHIVED' } }),
      prisma.artwork.aggregate({ where: { status: 'AVAILABLE' }, _sum: { price: true } }),
    ]);
    res.json({ total, available, sold, drafts, archived, availableValue: Number(aggregate._sum.price || 0) });
  } catch (error) { console.error(error); res.status(500).json({ error: 'Failed to load inventory statistics' }); }
});

router.get('/admin/export', authenticateAdmin, async (req, res) => {
  try {
    const where = {};
    if (req.query.status) where.status = req.query.status.toUpperCase();
    if (req.query.category) where.category = req.query.category.toUpperCase();
    if (req.query.search) where.OR = [{ title: { contains: req.query.search, mode: 'insensitive' } }, { medium: { contains: req.query.search, mode: 'insensitive' } }];
    const artworks = await prisma.artwork.findMany({ where, include: { _count: { select: { orderItems: true } }, tags: { include: { tag: true } } }, orderBy: { createdAt: 'desc' }, take: 5000 });
    const escape = value => `"${String(value ?? '').replace(/"/g, '""')}"`;
    const rows = [['Title','Category','Medium','Price','Status','Featured','Sales','Tags','Created'], ...artworks.map(a => [a.title,a.category,a.medium,a.price,a.status,a.featured,a._count.orderItems,a.tags.map(t => t.tag.name).join('; '),a.createdAt.toISOString()])];
    await recordAudit(req, 'EXPORT_ARTWORKS', 'Artwork', null, { count: artworks.length, filters: req.query });
    res.setHeader('Content-Type', 'text/csv; charset=utf-8'); res.setHeader('Content-Disposition', `attachment; filename="artworks-${new Date().toISOString().slice(0,10)}.csv"`);
    res.send(rows.map(row => row.map(escape).join(',')).join('\n'));
  } catch (error) { console.error(error); res.status(500).json({ error: 'Failed to export artworks' }); }
});

router.patch('/admin/bulk', authenticateAdmin, async (req, res) => {
  try {
    const { artworkIds, status, featured } = req.body;
    if (!Array.isArray(artworkIds) || !artworkIds.length || artworkIds.length > 100) return res.status(400).json({ error: 'Select between 1 and 100 artworks' });
    const data = {};
    if (status !== undefined) data.status = status.toUpperCase();
    if (featured !== undefined) data.featured = Boolean(featured);
    if (!Object.keys(data).length) return res.status(400).json({ error: 'No bulk change supplied' });
    const previousArtworks = await prisma.artwork.findMany({ where: { id: { in: artworkIds } }, include: { images: { orderBy: { order: 'asc' }, take: 1 } } });
    const result = await prisma.artwork.updateMany({ where: { id: { in: artworkIds } }, data });
    const updatedArtworks = await prisma.artwork.findMany({ where: { id: { in: artworkIds } }, include: { images: { orderBy: { order: 'asc' }, take: 1 } } });
    const alertSummaries = await Promise.all(updatedArtworks.map(artwork => sendWishlistChangeAlerts({ previous: previousArtworks.find(item => item.id === artwork.id), artwork })));
    await recordAudit(req, 'BULK_UPDATE_ARTWORKS', 'Artwork', null, { artworkIds, ...data });
    res.json({ updated: result.count, alerts: alertSummaries.reduce((sum, summary) => sum + summary.sent, 0) });
  } catch (error) { console.error(error); res.status(500).json({ error: 'Failed to update artworks' }); }
});

router.get('/admin/:id/history', authenticateAdmin, async (req, res) => {
  try {
    const logs = await prisma.auditLog.findMany({
      where: { entity: 'Artwork', entityId: req.params.id },
      include: { admin: { select: { name: true, email: true } } },
      orderBy: { createdAt: 'desc' }, take: 100,
    });
    res.json(logs);
  } catch (error) { console.error(error); res.status(500).json({ error: 'Failed to load artwork history' }); }
});

router.get('/admin/:id/alert-audience', authenticateAdmin, async (req, res) => {
  try {
    const previous = await prisma.artwork.findUnique({ where: { id: req.params.id }, select: { id: true, price: true, status: true } });
    if (!previous) return res.status(404).json({ error: 'Artwork not found' });
    const proposed = {
      ...previous,
      price: req.query.price !== undefined ? Number(req.query.price) : previous.price,
      status: req.query.status ? String(req.query.status).toUpperCase() : previous.status,
    };
    res.json(await previewWishlistAlertAudience({ artworkId: previous.id, previous, proposed }));
  } catch (error) {
    console.error('Failed to preview wishlist alert audience:', error);
    res.status(500).json({ error: 'Failed to preview alert audience' });
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
        tags: { include: { tag: true } },
        _count: { select: { orderItems: true, wishlistItems: true } },
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
    // 🔍 TEMPORARY DEBUG — remove after fixing
     console.log('=== CREATE ARTWORK DEBUG ===');
    console.log('1. Content-Type:', req.headers['content-type']);
    console.log('2. Body keys:', Object.keys(req.body));
    console.log('3. images value:', req.body.images);
    console.log('4. images type:', typeof req.body.images);
    console.log('5. images is array:', Array.isArray(req.body.images));
    console.log('6. Full body:', JSON.stringify(req.body, null, 2));
    console.log('============================');
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
    await recordAudit(req, 'CREATE_ARTWORK', 'Artwork', artwork.id, { title: artwork.title });
    const alertSummary = await sendSimilarArtworkAlerts(artwork);

    res.status(201).json({ ...artwork, alertSummary });
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

    const existingArtwork = await prisma.artwork.findUnique({ where: { id }, select: { price: true, status: true, featured: true } });
    if (!existingArtwork) return res.status(404).json({ error: 'Artwork not found' });

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

      const remainingImages = images.filter(img => (img.existing && keptExistingIds.includes(img.id)) || (!img.existing && img.url && img.publicId));
      const currentImages = await prisma.artworkImage.findMany({ where: { artworkId: id }, orderBy: { createdAt: 'asc' } });
      await prisma.$transaction(currentImages.map((image, index) => {
        const requestedIndex = remainingImages.findIndex(item => item.id === image.id || item.publicId === image.publicId);
        const orderIndex = requestedIndex >= 0 ? requestedIndex : index;
        return prisma.artworkImage.update({ where: { id: image.id }, data: { order: orderIndex, isPrimary: orderIndex === 0 } });
      }));
    }

    const artwork = await prisma.artwork.update({
      where:   { id },
      data:    updateData,
      include: {
        images: { orderBy: { order: 'asc' } },
      },
    });
    await recordAudit(req, 'UPDATE_ARTWORK', 'Artwork', artwork.id, {
      fields: Object.keys(updateData),
      priceChange: updateData.price !== undefined && Number(existingArtwork.price) !== Number(updateData.price) ? { from: Number(existingArtwork.price), to: Number(updateData.price) } : undefined,
      statusChange: updateData.status && existingArtwork.status !== updateData.status ? { from: existingArtwork.status, to: updateData.status } : undefined,
    });
    const alertSummary = await sendWishlistChangeAlerts({ previous: existingArtwork, artwork });

    res.json({ ...artwork, alertSummary });
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
      include: { images: true, _count: { select: { orderItems: true } } },
    });

    if (!artwork) {
      return res.status(404).json({ error: 'Artwork not found' });
    }

    if (artwork._count.orderItems > 0) {
      return res.status(409).json({ error: 'This artwork belongs to an order and cannot be deleted. Archive it instead.' });
    }

    // Delete images from Cloudinary
    for (const image of artwork.images) {
      if (image.publicId && !image.publicId.startsWith('placeholder')) {
        await deleteFromCloudinary(image.publicId).catch(() => {});
      }
    }

    // Delete artwork (cascade deletes images from DB)
    await prisma.artwork.delete({ where: { id } });
    await recordAudit(req, 'DELETE_ARTWORK', 'Artwork', id, { title: artwork.title });

    res.json({ message: 'Artwork deleted successfully' });
  } catch (error) {
    console.error('Error deleting artwork:', error);
    res.status(500).json({ error: 'Failed to delete artwork' });
  }
});

module.exports = router;
