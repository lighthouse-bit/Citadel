// server/src/routes/artworkRoutes.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const prisma = require('../config/database');
const { authenticateAdmin } = require('../middleware/auth');
const { uploadToCloudinary, deleteFromCloudinary } = require('../services/imageService');

const upload = multer({ storage: multer.memoryStorage() });

// Get all artworks (Public)
router.get('/', async (req, res) => {
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
      where.status = status.toUpperCase();
    }
    
    if (featured === 'true') {
      where.featured = true;
    }
    
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [artworks, total] = await Promise.all([
      prisma.artwork.findMany({
        where,
        include: {
          images: {
            orderBy: { order: 'asc' },
          },
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
        page: parseInt(page),
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

// Get featured artworks (Public)
router.get('/featured', async (req, res) => {
  try {
    const artworks = await prisma.artwork.findMany({
      where: {
        featured: true,
        status: { in: ['AVAILABLE', 'NOT_FOR_SALE'] },
      },
      include: {
        images: {
          orderBy: { order: 'asc' },
          take: 1,
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

// Get single artwork by ID (Public)
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const artwork = await prisma.artwork.findUnique({
      where: { id },
      include: {
        images: {
          orderBy: { order: 'asc' },
        },
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

// Create artwork (Admin)
router.post('/', authenticateAdmin, upload.array('images', 10), async (req, res) => {
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
    } = req.body;

    // Generate slug
    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    // Check if slug exists
    const existingSlug = await prisma.artwork.findUnique({ where: { slug } });
    const finalSlug = existingSlug ? `${slug}-${Date.now()}` : slug;

    // Upload images
    const uploadedImages = [];
    if (req.files && req.files.length > 0) {
      for (let i = 0; i < req.files.length; i++) {
        try {
          const result = await uploadToCloudinary(req.files[i], 'artworks');
          uploadedImages.push({
            url: result.secure_url,
            publicId: result.public_id,
            isPrimary: i === 0,
            order: i,
          });
        } catch (uploadError) {
          console.error('Image upload error:', uploadError);
        }
      }
    }

    // Create artwork
    const artwork = await prisma.artwork.create({
      data: {
        title,
        description,
        price: parseFloat(price),
        category: (category || 'PAINTING').toUpperCase(),
        medium: medium || null,
        year: year ? parseInt(year) : null,
        width: width ? parseFloat(width) : null,
        height: height ? parseFloat(height) : null,
        depth: depth ? parseFloat(depth) : null,
        unit: unit || 'inches',
        status: (status || 'AVAILABLE').toUpperCase(),
        featured: featured === 'true' || featured === true,
        slug: finalSlug,
        images: {
          create: uploadedImages,
        },
      },
      include: {
        images: true,
      },
    });

    res.status(201).json(artwork);
  } catch (error) {
    console.error('Error creating artwork:', error);
    res.status(500).json({ error: 'Failed to create artwork', details: error.message });
  }
});

// Update artwork (Admin)
router.put('/:id', authenticateAdmin, upload.array('images', 10), async (req, res) => {
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
    } = req.body;

    const updateData = {};

    if (title) updateData.title = title;
    if (description) updateData.description = description;
    if (price) updateData.price = parseFloat(price);
    if (category) updateData.category = category.toUpperCase();
    if (medium !== undefined) updateData.medium = medium;
    if (year) updateData.year = parseInt(year);
    if (width) updateData.width = parseFloat(width);
    if (height) updateData.height = parseFloat(height);
    if (depth) updateData.depth = parseFloat(depth);
    if (unit) updateData.unit = unit;
    if (status) updateData.status = status.toUpperCase();
    if (featured !== undefined) updateData.featured = featured === 'true' || featured === true;

    // Handle new images
    if (req.files && req.files.length > 0) {
      const existingImages = await prisma.artworkImage.findMany({
        where: { artworkId: id },
      });

      for (let i = 0; i < req.files.length; i++) {
        try {
          const result = await uploadToCloudinary(req.files[i], 'artworks');
          await prisma.artworkImage.create({
            data: {
              url: result.secure_url,
              publicId: result.public_id,
              isPrimary: existingImages.length === 0 && i === 0,
              order: existingImages.length + i,
              artworkId: id,
            },
          });
        } catch (uploadError) {
          console.error('Image upload error:', uploadError);
        }
      }
    }

    const artwork = await prisma.artwork.update({
      where: { id },
      data: updateData,
      include: {
        images: {
          orderBy: { order: 'asc' },
        },
      },
    });

    res.json(artwork);
  } catch (error) {
    console.error('Error updating artwork:', error);
    res.status(500).json({ error: 'Failed to update artwork' });
  }
});

// Delete artwork (Admin)
router.delete('/:id', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // Get artwork with images
    const artwork = await prisma.artwork.findUnique({
      where: { id },
      include: { images: true },
    });

    if (!artwork) {
      return res.status(404).json({ error: 'Artwork not found' });
    }

    // Delete images from Cloudinary
    for (const image of artwork.images) {
      if (image.publicId && !image.publicId.startsWith('placeholder')) {
        try {
          await deleteFromCloudinary(image.publicId);
        } catch (err) {
          console.error('Error deleting image from Cloudinary:', err);
        }
      }
    }

    // Delete artwork (cascade will delete images from DB)
    await prisma.artwork.delete({ where: { id } });

    res.json({ message: 'Artwork deleted successfully' });
  } catch (error) {
    console.error('Error deleting artwork:', error);
    res.status(500).json({ error: 'Failed to delete artwork' });
  }
});

module.exports = router;