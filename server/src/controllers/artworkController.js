// server/src/controllers/artworkController.js
const prisma = require('../config/database');
const { uploadToCloudinary, deleteFromCloudinary } = require('../services/imageService');

// Get all artworks (with filtering & pagination)
exports.getAllArtworks = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 12,
      category,
      status,
      featured,
      sort = 'createdAt',
      order = 'desc',
      search,
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {};

    if (category) {
      where.category = category.toUpperCase();
    }

    if (status) {
      // ✅ If specific status requested (e.g. admin filtering), use it
      where.status = status.toUpperCase();
    } else {
      // ✅ Public gallery: show ALL statuses except NOT_FOR_SALE hidden option
      // Show AVAILABLE, SOLD, RESERVED — all visible with badges
      where.status = { in: ['AVAILABLE', 'SOLD', 'RESERVED', 'NOT_FOR_SALE'] };
    }

    if (featured === 'true') {
      where.featured = true;
    }

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
      where: { id },
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
        // ✅ Featured section only shows available items
        status: 'AVAILABLE',
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

// Create artwork (Admin)
exports.createArtwork = async (req, res) => {
  try {
    const {
      title, description, price, category, medium,
      year, width, height, depth, unit, status,
      featured, metaTitle, metaDesc,
    } = req.body;

    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    const existingSlug = await prisma.artwork.findUnique({ where: { slug } });
    const finalSlug    = existingSlug ? `${slug}-${Date.now()}` : slug;

    const uploadedImages = [];
    if (req.files && req.files.length > 0) {
      for (let i = 0; i < req.files.length; i++) {
        const result = await uploadToCloudinary(req.files[i], 'artworks');
        uploadedImages.push({
          url:       result.secure_url,
          publicId:  result.public_id,
          isPrimary: i === 0,
          order:     i,
        });
      }
    }

    const artwork = await prisma.artwork.create({
      data: {
        title,
        description,
        price:     parseFloat(price),
        category:  category.toUpperCase(),
        medium,
        year:      year   ? parseInt(year)     : null,
        width:     width  ? parseFloat(width)  : null,
        height:    height ? parseFloat(height) : null,
        depth:     depth  ? parseFloat(depth)  : null,
        unit:      unit || 'inches',
        status:    status?.toUpperCase() || 'AVAILABLE',
        featured:  featured === 'true' || featured === true,
        slug:      finalSlug,
        metaTitle: metaTitle || title,
        metaDesc:  metaDesc  || description.substring(0, 160),
        images:    { create: uploadedImages },
      },
      include: {
        images: true,
        tags:   { include: { tag: true } },
      },
    });

    res.status(201).json(artwork);
  } catch (error) {
    console.error('Error creating artwork:', error);
    res.status(500).json({ error: 'Failed to create artwork', details: error.message });
  }
};

// Update artwork (Admin)
exports.updateArtwork = async (req, res) => {
  try {
    const { id }       = req.params;
    const updateData   = { ...req.body };

    if (updateData.price)    updateData.price    = parseFloat(updateData.price);
    if (updateData.year)     updateData.year     = parseInt(updateData.year);
    if (updateData.width)    updateData.width    = parseFloat(updateData.width);
    if (updateData.height)   updateData.height   = parseFloat(updateData.height);
    if (updateData.category) updateData.category = updateData.category.toUpperCase();
    if (updateData.status)   updateData.status   = updateData.status.toUpperCase();
    if (updateData.featured !== undefined) {
      updateData.featured = updateData.featured === 'true' || updateData.featured === true;
    }

    if (req.files && req.files.length > 0) {
      const uploadedImages = [];
      for (let i = 0; i < req.files.length; i++) {
        const result = await uploadToCloudinary(req.files[i], 'artworks');
        uploadedImages.push({
          url:       result.secure_url,
          publicId:  result.public_id,
          isPrimary: i === 0,
          order:     i,
        });
      }
      updateData.images = { create: uploadedImages };
    }

    const artwork = await prisma.artwork.update({
      where:   { id },
      data:    updateData,
      include: {
        images: true,
        tags:   { include: { tag: true } },
      },
    });

    res.json(artwork);
  } catch (error) {
    console.error('Error updating artwork:', error);
    res.status(500).json({ error: 'Failed to update artwork' });
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
      await deleteFromCloudinary(image.publicId);
    }

    await prisma.artwork.delete({ where: { id } });

    res.json({ message: 'Artwork deleted successfully' });
  } catch (error) {
    console.error('Error deleting artwork:', error);
    res.status(500).json({ error: 'Failed to delete artwork' });
  }
};