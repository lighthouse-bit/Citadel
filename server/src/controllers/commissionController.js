// server/src/controllers/commissionController.js
const prisma = require('../config/database');

// ─────────────────────────────────────────────────────────
// Create commission request (Public/User)
// POST /api/commissions
// ✅ Now accepts JSON with Cloudinary URLs — no file upload
// ─────────────────────────────────────────────────────────
exports.createCommission = async (req, res) => {
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
      referenceImages = [], // ✅ Array of {url, publicId, originalName} from Cloudinary
    } = req.body;

    let customerId;
    const loggedInUser = req.user;

    if (loggedInUser) {
      customerId = loggedInUser.id;
      if (phone) {
        await prisma.customer.update({
          where: { id: customerId },
          data:  { phone },
        }).catch(err => console.log('Phone update skipped', err));
      }
    } else {
      // Guest user — find or create customer
      let customer = await prisma.customer.findUnique({
        where: { email },
      });

      if (!customer) {
        customer = await prisma.customer.create({
          data: { email, firstName, lastName, phone },
        });
      }
      customerId = customer.id;
    }

    // ✅ Use Cloudinary URLs directly — no upload needed
    const imageData = referenceImages
      .filter(img => img.url && img.publicId)
      .map(img => ({
        url:          img.url,
        publicId:     img.publicId,
        originalName: img.originalName || 'reference-image',
      }));

    const estimatedPrice   = calculateEstimatedPrice(artStyle, size);
    const commissionNumber = `COM-${Date.now().toString(36).toUpperCase()}`;

    const commission = await prisma.commission.create({
      data: {
        commissionNumber,
        artStyle,
        size,
        description,
        estimatedPrice,
        deadline:        deadline ? new Date(deadline) : null,
        customerId,
        referenceImages: { create: imageData },
      },
      include: {
        customer:        true,
        referenceImages: true,
      },
    });

    // ✅ Create admin notification
    await prisma.notification.create({
      data: {
        type:    'COMMISSION',
        message: `New Commission Request from ${firstName || commission.customer.firstName} ${lastName || commission.customer.lastName}`,
        link:    `/admin/commissions/${commission.id}`,
      },
    }).catch(() => {}); // Don't fail if notification fails

    res.status(201).json({
      message: 'Commission request submitted successfully',
      commission,
    });
  } catch (error) {
    console.error('Error creating commission:', error);
    res.status(500).json({ error: 'Failed to submit commission request' });
  }
};

// ─────────────────────────────────────────────────────────
// Get all commissions (Admin)
// GET /api/commissions
// ─────────────────────────────────────────────────────────
exports.getAllCommissions = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const skip  = (parseInt(page) - 1) * parseInt(limit);
    const where = status ? { status: status.toUpperCase() } : {};

    const [commissions, total] = await Promise.all([
      prisma.commission.findMany({
        where,
        include: {
          customer:        true,
          referenceImages: true,
          progressImages:  true,
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
        page:  parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error('Error fetching commissions:', error);
    res.status(500).json({ error: 'Failed to fetch commissions' });
  }
};

// ─────────────────────────────────────────────────────────
// Get current user's commissions (User)
// GET /api/commissions/my-commissions
// ─────────────────────────────────────────────────────────
exports.getMyCommissions = async (req, res) => {
  try {
    const customerId = req.user?.id;

    if (!customerId) {
      return res.status(401).json({ error: 'Please log in to view your commissions' });
    }

    const commissions = await prisma.commission.findMany({
      where:   { customerId },
      include: {
        referenceImages: true,
        progressImages:  true,
        notes: {
          where:   { isInternal: false },
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ commissions });
  } catch (error) {
    console.error('Error fetching user commissions:', error);
    res.status(500).json({ error: 'Failed to fetch commissions' });
  }
};

// ─────────────────────────────────────────────────────────
// Get single commission by ID for logged-in user (User)
// GET /api/commissions/my-commissions/:id
// ─────────────────────────────────────────────────────────
exports.getMyCommissionById = async (req, res) => {
  try {
    const { id }     = req.params;
    const customerId = req.user?.id;

    if (!customerId) {
      return res.status(401).json({
        error: 'Please log in to view this commission',
      });
    }

    const commission = await prisma.commission.findFirst({
      where: {
        id,
        customerId, // Security: user can only see THEIR OWN commission
      },
      include: {
        customer: {
          select: {
            id:        true,
            email:     true,
            firstName: true,
            lastName:  true,
            phone:     true,
          },
        },
        referenceImages: true,
        progressImages: {
          orderBy: { createdAt: 'asc' },
        },
        notes: {
          where:   { isInternal: false },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!commission) {
      return res.status(404).json({
        error: 'Commission not found or you do not have access to it',
      });
    }

    res.json({ commission });
  } catch (error) {
    console.error('Error fetching commission by ID:', error);
    res.status(500).json({ error: 'Failed to fetch commission' });
  }
};

// ─────────────────────────────────────────────────────────
// Get single commission by ID (Admin)
// GET /api/commissions/:id
// ─────────────────────────────────────────────────────────
exports.getCommissionById = async (req, res) => {
  try {
    const { id } = req.params;

    const commission = await prisma.commission.findUnique({
      where: { id },
      include: {
        customer:        true,
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
};

// ─────────────────────────────────────────────────────────
// Update commission status (Admin)
// PATCH /api/commissions/:id/status
// ─────────────────────────────────────────────────────────
exports.updateCommissionStatus = async (req, res) => {
  try {
    const { id }                       = req.params;
    const { status, finalPrice, note } = req.body;

    const updateData = {
      status: status.toUpperCase(),
    };

    if (finalPrice) {
      updateData.finalPrice    = parseFloat(finalPrice);
      updateData.depositAmount = parseFloat(finalPrice) * 0.70;
      updateData.balanceAmount = parseFloat(finalPrice) * 0.30;
    }

    if (status.toUpperCase() === 'IN_PROGRESS') {
      updateData.startedAt = new Date();
    }

    if (status.toUpperCase() === 'COMPLETED') {
      updateData.completedAt = new Date();
    }

    const commission = await prisma.commission.update({
      where:   { id },
      data:    updateData,
      include: { customer: true },
    });

    if (note) {
      await prisma.commissionNote.create({
        data: {
          content:      note,
          isInternal:   false,
          commissionId: id,
        },
      });
    }

    if (status.toUpperCase() === 'ACCEPTED') {
      await prisma.notification.create({
        data: {
          type:    'COMMISSION',
          message: `Commission #${commission.commissionNumber} has been accepted. Please pay your deposit to begin.`,
          link:    `/commission/payment/${commission.id}`,
        },
      }).catch(() => {});
    }

    res.json(commission);
  } catch (error) {
    console.error('Error updating commission:', error);
    res.status(500).json({ error: 'Failed to update commission' });
  }
};

// ─────────────────────────────────────────────────────────
// Add progress image (Admin)
// POST /api/commissions/:id/progress
// ✅ Now accepts JSON with Cloudinary URL — no file upload
// ─────────────────────────────────────────────────────────
exports.addProgressImage = async (req, res) => {
  try {
    const { id }                       = req.params;
    const { url, publicId, description } = req.body;

    // ✅ Validate required fields
    if (!url || !publicId) {
      return res.status(400).json({
        error: 'Image URL and publicId are required',
      });
    }

    const progressImage = await prisma.commissionProgress.create({
      data: {
        imageUrl:     url,
        publicId:     publicId,
        description:  description || null,
        commissionId: id,
      },
    });

    res.status(201).json(progressImage);
  } catch (error) {
    console.error('Error adding progress image:', error);
    res.status(500).json({ error: 'Failed to add progress image' });
  }
};

// ─────────────────────────────────────────────────────────
// Confirm payment after Stripe succeeds (User)
// POST /api/commissions/:id/confirm-payment
// ─────────────────────────────────────────────────────────
exports.confirmPayment = async (req, res) => {
  try {
    const { id }                           = req.params;
    const { paymentIntentId, paymentType } = req.body;
    const customerId                       = req.user?.id;

    if (!customerId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!paymentType || !['deposit', 'balance'].includes(paymentType)) {
      return res.status(400).json({ error: 'Invalid payment type' });
    }

    const commission = await prisma.commission.findFirst({
      where:   { id, customerId },
      include: { customer: true },
    });

    if (!commission) {
      return res.status(404).json({ error: 'Commission not found' });
    }

    if (paymentType === 'deposit') {
      if (
        commission.paymentStatus === 'DEPOSIT_PAID' ||
        commission.paymentStatus === 'FULLY_PAID'
      ) {
        return res.json({ success: true, message: 'Already updated' });
      }

      await prisma.commission.update({
        where: { id },
        data: {
          paymentStatus: 'DEPOSIT_PAID',
          status:        'IN_PROGRESS',
          depositPaidAt: new Date(),
          startedAt:     new Date(),
          depositAmount: commission.finalPrice
            ? parseFloat(commission.finalPrice) * 0.70
            : undefined,
        },
      });

      await prisma.notification.create({
        data: {
          type:    'COMMISSION',
          message: `💰 Deposit received for Commission #${commission.commissionNumber} from ${commission.customer.firstName} ${commission.customer.lastName}`,
          link:    `/admin/commissions/${commission.id}`,
        },
      }).catch(() => {});

    } else if (paymentType === 'balance') {
      if (commission.paymentStatus === 'FULLY_PAID') {
        return res.json({ success: true, message: 'Already updated' });
      }

      await prisma.commission.update({
        where: { id },
        data: {
          paymentStatus: 'FULLY_PAID',
          status:        'COMPLETED',
          balancePaidAt: new Date(),
          completedAt:   new Date(),
        },
      });

      await prisma.notification.create({
        data: {
          type:    'COMMISSION',
          message: `✅ Final balance received for Commission #${commission.commissionNumber} from ${commission.customer.firstName} ${commission.customer.lastName}. Commission complete!`,
          link:    `/admin/commissions/${commission.id}`,
        },
      }).catch(() => {});
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error confirming payment:', error);
    res.status(500).json({ error: 'Failed to confirm payment' });
  }
};

// ─────────────────────────────────────────────────────────
// Helper: Calculate estimated price
// ─────────────────────────────────────────────────────────
function calculateEstimatedPrice(artStyle, size) {
  const stylePrices = {
    realistic:     500,
    abstract:      400,
    impressionist: 450,
    contemporary:  450,
    charcoal:      250,
    watercolor:    350,
  };

  const sizeMultipliers = {
    small:  1,
    medium: 1.8,
    large:  2.5,
    xlarge: 3.5,
  };

  const basePrice  = stylePrices[artStyle?.toLowerCase()] || 400;
  const multiplier = sizeMultipliers[size?.toLowerCase()] || 1;

  return basePrice * multiplier;
}