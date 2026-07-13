// server/src/controllers/commissionController.js
const prisma = require('../config/database');
const { createCustomerNotification } = require('../services/customerNotificationService');
const { recordAudit } = require('../utils/auditService');

const COMMISSION_STATUSES = ['PENDING', 'REVIEWING', 'ACCEPTED', 'IN_PROGRESS', 'REVISION', 'COMPLETED', 'CANCELLED'];

const commissionWhere = ({ status, paymentStatus, search, overdue }) => {
  const where = {};
  if (status) where.status = status.toUpperCase();
  if (paymentStatus) where.paymentStatus = paymentStatus.toUpperCase();
  if (search?.trim()) {
    const query = search.trim();
    where.OR = [
      { commissionNumber: { contains: query, mode: 'insensitive' } },
      { artStyle: { contains: query, mode: 'insensitive' } },
      { customer: { is: { email: { contains: query, mode: 'insensitive' } } } },
      { customer: { is: { firstName: { contains: query, mode: 'insensitive' } } } },
      { customer: { is: { lastName: { contains: query, mode: 'insensitive' } } } },
    ];
  }
  if (overdue === 'true') {
    where.deadline = { lt: new Date() };
    where.status = { notIn: ['COMPLETED', 'CANCELLED'] };
  }
  return where;
};

const withWorkflowSummary = commission => ({
  ...commission,
  isOverdue: Boolean(commission.deadline && new Date(commission.deadline) < new Date() && !['COMPLETED', 'CANCELLED'].includes(commission.status)),
  amountDue: commission.paymentStatus === 'UNPAID'
    ? Number(commission.depositAmount || 0)
    : commission.paymentStatus === 'DEPOSIT_PAID' ? Number(commission.balanceAmount || 0) : 0,
});

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
    const { status, paymentStatus, search, overdue, page = 1, limit = 20 } = req.query;
    const safePage = Math.max(parseInt(page, 10) || 1, 1);
    const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
    const skip  = (safePage - 1) * safeLimit;
    const where = commissionWhere({ status, paymentStatus, search, overdue });

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
        take: safeLimit,
      }),
      prisma.commission.count({ where }),
    ]);

    res.json({
      commissions: commissions.map(withWorkflowSummary),
      pagination: {
        page: safePage,
        limit: safeLimit,
        total,
        pages: Math.ceil(total / safeLimit),
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
    const auditLogs = await prisma.auditLog.findMany({
      where: { entity: 'Commission', entityId: id },
      include: { admin: { select: { name: true, email: true } } },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ ...withWorkflowSummary(commission), auditLogs });
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
    const { status, finalPrice, note, isInternal = false, cancellationReason } = req.body;
    const nextStatus = status?.toUpperCase();

    if (!COMMISSION_STATUSES.includes(nextStatus)) {
      return res.status(400).json({ error: 'Invalid commission status' });
    }

    const existing = await prisma.commission.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Commission not found' });
    if (existing.status === 'COMPLETED' && nextStatus !== 'COMPLETED') {
      return res.status(409).json({ error: 'A completed commission cannot be reopened from this screen' });
    }
    if (nextStatus === 'CANCELLED' && !cancellationReason?.trim()) {
      return res.status(400).json({ error: 'A cancellation reason is required' });
    }

    const updateData = {
      status: nextStatus,
    };

    if (finalPrice) {
      updateData.finalPrice    = parseFloat(finalPrice);
      updateData.depositAmount = parseFloat(finalPrice) * 0.70;
      updateData.balanceAmount = parseFloat(finalPrice) * 0.30;
    }

    if (nextStatus === 'IN_PROGRESS') {
      updateData.startedAt = new Date();
    }

    if (nextStatus === 'COMPLETED') {
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
          isInternal:   Boolean(isInternal),
          commissionId: id,
        },
      });
    }

    if (nextStatus === 'CANCELLED') {
      await prisma.commissionNote.create({
        data: { content: `Cancellation reason: ${cancellationReason.trim()}`, isInternal: true, commissionId: id },
      });
    }

    if (existing.status !== nextStatus) {
      const messages = {
        REVIEWING: `Commission #${commission.commissionNumber} is now under review.`,
        ACCEPTED: `Commission #${commission.commissionNumber} was accepted. Your deposit is ready for payment.`,
        IN_PROGRESS: `Work has started on commission #${commission.commissionNumber}.`,
        REVISION: `Commission #${commission.commissionNumber} has a revision update.`,
        COMPLETED: `Commission #${commission.commissionNumber} is complete.`,
        CANCELLED: `Commission #${commission.commissionNumber} was cancelled.`,
      };
      await createCustomerNotification({
        customerId: commission.customerId,
        type: 'COMMISSION',
        message: messages[nextStatus] || `Commission #${commission.commissionNumber} was updated.`,
        link: nextStatus === 'ACCEPTED' || (nextStatus === 'COMPLETED' && commission.paymentStatus === 'DEPOSIT_PAID') ? `/commission/payment/${commission.id}` : '/account',
      }).catch(error => console.error('Customer commission notification error:', error.message));
    }

    await recordAudit(req, existing.status === nextStatus ? 'UPDATE_COMMISSION' : 'UPDATE_COMMISSION_STATUS', 'Commission', id, {
      fromStatus: existing.status,
      toStatus: nextStatus,
      finalPrice: finalPrice ? parseFloat(finalPrice) : undefined,
      noteVisibility: note ? (isInternal ? 'internal' : 'customer') : undefined,
      cancellationReason: nextStatus === 'CANCELLED' ? cancellationReason.trim() : undefined,
      requiresRefundReview: nextStatus === 'CANCELLED' && existing.paymentStatus !== 'UNPAID',
    });

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

    const commission = await prisma.commission.findUnique({ where: { id }, select: { customerId: true, commissionNumber: true } });
    if (commission) {
      await createCustomerNotification({ customerId: commission.customerId, type: 'COMMISSION', message: `A new progress update was added to commission #${commission.commissionNumber}.`, link: '/account' })
        .catch(error => console.error('Commission progress notification error:', error.message));
    }

    await recordAudit(req, 'ADD_COMMISSION_PROGRESS', 'Commission', id, {
      description: description || null,
      imageUrl: url,
    });

    res.status(201).json(progressImage);
  } catch (error) {
    console.error('Error adding progress image:', error);
    res.status(500).json({ error: 'Failed to add progress image' });
  }
};

// Download the filtered commission queue as CSV (Admin)
exports.exportCommissions = async (req, res) => {
  try {
    const where = commissionWhere(req.query);
    const commissions = await prisma.commission.findMany({
      where,
      include: { customer: true },
      orderBy: { createdAt: 'desc' },
      take: 5000,
    });
    const escape = value => `"${String(value ?? '').replace(/"/g, '""')}"`;
    const rows = [
      ['Commission', 'Customer', 'Email', 'Style', 'Status', 'Payment', 'Final price', 'Deadline', 'Created'],
      ...commissions.map(c => [c.commissionNumber, `${c.customer.firstName || ''} ${c.customer.lastName || ''}`.trim(), c.customer.email, c.artStyle, c.status, c.paymentStatus, c.finalPrice || '', c.deadline?.toISOString() || '', c.createdAt.toISOString()]),
    ];
    await recordAudit(req, 'EXPORT_COMMISSIONS', 'Commission', null, { filters: req.query, count: commissions.length });
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="commissions-${new Date().toISOString().slice(0, 10)}.csv"`);
    res.send(rows.map(row => row.map(escape).join(',')).join('\n'));
  } catch (error) {
    console.error('Error exporting commissions:', error);
    res.status(500).json({ error: 'Failed to export commissions' });
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
