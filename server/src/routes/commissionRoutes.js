// server/src/routes/commissionRoutes.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const { authenticateAdmin } = require('../middleware/auth');
const prisma = require('../config/database');
const { uploadToCloudinary } = require('../services/imageService');

const upload = multer({ storage: multer.memoryStorage() });

// Submit commission request (Public)
router.post('/', upload.array('referenceImages', 5), async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      phone,
      artStyle,
      size,
      description,
      deadline,
    } = req.body;

    // Find or create customer
    let customer = await prisma.customer.findUnique({
      where: { email },
    });

    if (!customer) {
      customer = await prisma.customer.create({
        data: {
          email,
          firstName,
          lastName,
          phone,
        },
      });
    }

    // Upload reference images
    const uploadedImages = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        try {
          const result = await uploadToCloudinary(file, 'commissions');
          uploadedImages.push({
            url: result.secure_url,
            publicId: result.public_id,
            originalName: file.originalname,
          });
        } catch (uploadError) {
          console.error('Image upload error:', uploadError);
        }
      }
    }

    // Calculate estimated price
    const estimatedPrice = calculateEstimatedPrice(artStyle, size);

    // Generate commission number
    const commissionNumber = `COM-${Date.now().toString(36).toUpperCase()}`;

    // Create commission
    const commission = await prisma.commission.create({
      data: {
        commissionNumber,
        artStyle,
        size,
        description,
        estimatedPrice,
        deadline: deadline ? new Date(deadline) : null,
        customerId: customer.id,
        referenceImages: {
          create: uploadedImages,
        },
      },
      include: {
        customer: true,
        referenceImages: true,
      },
    });

    res.status(201).json({
      message: 'Commission request submitted successfully',
      commission,
    });
  } catch (error) {
    console.error('Error creating commission:', error);
    res.status(500).json({ error: 'Failed to submit commission request' });
  }
});

// Get all commissions (Admin)
router.get('/', authenticateAdmin, async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = status ? { status: status.toUpperCase() } : {};

    const [commissions, total] = await Promise.all([
      prisma.commission.findMany({
        where,
        include: {
          customer: true,
          referenceImages: true,
          progressImages: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit),
      }),
      prisma.commission.count({ where }),
    ]);

    res.json({
      commissions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error('Error fetching commissions:', error);
    res.status(500).json({ error: 'Failed to fetch commissions' });
  }
});

// Get single commission (Admin)
router.get('/:id', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const commission = await prisma.commission.findUnique({
      where: { id },
      include: {
        customer: true,
        referenceImages: true,
        progressImages: {
          orderBy: { createdAt: 'asc' },
        },
        notes: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!commission) {
      return res.status(404).json({ error: 'Commission not found' });
    }

    res.json(commission);
  } catch (error) {
    console.error('Error fetching commission:', error);
    res.status(500).json({ error: 'Failed to fetch commission' });
  }
});

// Update commission status (Admin)
router.patch('/:id/status', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, finalPrice, note } = req.body;

    const updateData = {
      status: status.toUpperCase(),
    };

    if (finalPrice) {
      updateData.finalPrice = parseFloat(finalPrice);
    }

    if (status === 'IN_PROGRESS') {
      updateData.startedAt = new Date();
    }

    if (status === 'COMPLETED') {
      updateData.completedAt = new Date();
    }

    const commission = await prisma.commission.update({
      where: { id },
      data: updateData,
      include: { customer: true },
    });

    // Add note if provided
    if (note) {
      await prisma.commissionNote.create({
        data: {
          content: note,
          isInternal: false,
          commissionId: id,
        },
      });
    }

    res.json(commission);
  } catch (error) {
    console.error('Error updating commission:', error);
    res.status(500).json({ error: 'Failed to update commission' });
  }
});

// Add progress image (Admin)
router.post('/:id/progress', authenticateAdmin, upload.single('image'), async (req, res) => {
  try {
    const { id } = req.params;
    const { description } = req.body;

    if (!req.file) {
      return res.status(400).json({ error: 'No image provided' });
    }

    const result = await uploadToCloudinary(req.file, 'commission-progress');

    const progressImage = await prisma.commissionProgress.create({
      data: {
        imageUrl: result.secure_url,
        publicId: result.public_id,
        description,
        commissionId: id,
      },
    });

    res.status(201).json(progressImage);
  } catch (error) {
    console.error('Error adding progress image:', error);
    res.status(500).json({ error: 'Failed to add progress image' });
  }
});

// Helper function
function calculateEstimatedPrice(artStyle, size) {
  const stylePrices = {
    realistic: 500,
    abstract: 400,
    impressionist: 450,
    contemporary: 450,
    charcoal: 250,
    watercolor: 350,
  };

  const sizeMultipliers = {
    small: 1,
    medium: 1.8,
    large: 2.5,
    xlarge: 3.5,
  };

  const basePrice = stylePrices[artStyle?.toLowerCase()] || 400;
  const multiplier = sizeMultipliers[size?.toLowerCase()] || 1;

  return basePrice * multiplier;
}

module.exports = router;