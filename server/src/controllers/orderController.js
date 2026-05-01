// server/src/controllers/orderController.js
const prisma = require('../config/database');

// ─────────────────────────────────────────────────────────
// Create order (Public/User)
// POST /api/orders
// ─────────────────────────────────────────────────────────
exports.createOrder = async (req, res) => {
  try {
    const loggedInUser = req.user;

    const {
      firstName,
      lastName,
      email,
      items,
      shippingAddress,
    } = req.body;

    let customerId;

    if (loggedInUser) {
      // Logged-in user
      customerId = loggedInUser.id;
    } else {
      // Guest user - find or create
      let customer = await prisma.customer.findUnique({
        where: { email },
      });

      if (!customer) {
        customer = await prisma.customer.create({
          data: { email, firstName, lastName },
        });
      }
      customerId = customer.id;
    }

    // Save shipping address
    const address = await prisma.address.create({
      data: {
        ...shippingAddress,
        customerId,
      },
    });

    // Verify artworks are available
    const artworkIds = items.map(item => item.id);
    const dbArtworks = await prisma.artwork.findMany({
      where: {
        id:     { in: artworkIds },
        status: 'AVAILABLE',
      },
    });

    if (dbArtworks.length !== items.length) {
      return res.status(400).json({ 
        error: 'One or more items are no longer available.' 
      });
    }

    // Calculate totals
    const subtotal     = dbArtworks.reduce((sum, art) => sum + Number(art.price), 0);
    const shippingCost = 0;
    const tax          = 0;
    const total        = subtotal + shippingCost + tax;
    const orderNumber  = `ORD-${Date.now().toString().slice(-6)}`;

    // Create order in transaction
    const order = await prisma.$transaction(async (tx) => {
      const newOrder = await tx.order.create({
        data: {
          orderNumber,
          subtotal,
          shippingCost,
          tax,
          total,
          status:           'PENDING',
          paymentStatus:    'UNPAID',
          customerId,
          shippingAddressId: address.id,
          items: {
            create: dbArtworks.map(art => ({
              price:     art.price,
              title:     art.title,
              artworkId: art.id,
            })),
          },
        },
        include: { items: true },
      });

      // Reserve artworks
      await tx.artwork.updateMany({
        where: { id: { in: artworkIds } },
        data:  { status: 'RESERVED' },
      });

      // Notify admin
      await tx.notification.create({
        data: {
          type:    'ORDER',
          message: `🛍️ New Order #${newOrder.orderNumber} — $${Number(newOrder.total).toLocaleString()}`,
          link:    `/admin/orders/${newOrder.id}`,
          isRead:  false,
        },
      });

      return newOrder;
    });

    res.status(201).json(order);

  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ error: 'Failed to create order' });
  }
};

// ─────────────────────────────────────────────────────────
// Get all orders (Admin with filters)
// GET /api/orders
// ─────────────────────────────────────────────────────────
exports.getAllOrders = async (req, res) => {
  try {
    const { status, page = 1, limit = 20, customerEmail } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {};
    if (status)        where.status   = status.toUpperCase();
    if (customerEmail) where.customer = { email: customerEmail };

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          customer: true,
          items: {
            include: { artwork: { include: { images: true } } },
          },
          shippingAddress: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit),
      }),
      prisma.order.count({ where }),
    ]);

    res.json({
      orders,
      pagination: {
        page:  parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });

  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
};

// ─────────────────────────────────────────────────────────
// Get single order
// GET /api/orders/:id
// ─────────────────────────────────────────────────────────
exports.getOrderById = async (req, res) => {
  try {
    const { id } = req.params;

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        customer: true,
        items: {
          include: { artwork: { include: { images: true } } },
        },
        shippingAddress: true,
      },
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json(order);

  } catch (error) {
    console.error('Error fetching order:', error);
    res.status(500).json({ error: 'Failed to fetch order' });
  }
};

// ─────────────────────────────────────────────────────────
// Update order status + tracking + notes (Admin)
// PATCH /api/orders/:id/status
// ─────────────────────────────────────────────────────────
exports.updateOrderStatus = async (req, res) => {
  try {
    const { id }                                  = req.params;
    const { status, trackingNumber, internalNotes } = req.body;

    const updateData = {};

    // ── Status update ─────────────────────────────────────
    if (status) {
      updateData.status = status.toUpperCase();

      // Set timestamps based on status
      if (status.toUpperCase() === 'SHIPPED') {
        updateData.shippedAt = new Date();
      }
      if (status.toUpperCase() === 'DELIVERED') {
        updateData.deliveredAt = new Date();
      }
    }

    // ── Tracking number ───────────────────────────────────
    if (trackingNumber !== undefined) {
      updateData.trackingNumber = trackingNumber;
    }

    // ── Internal notes ────────────────────────────────────
    if (internalNotes !== undefined) {
      updateData.internalNotes = internalNotes;
    }

    // ── Update order ──────────────────────────────────────
    const order = await prisma.order.update({
      where:   { id },
      data:    updateData,
      include: {
        customer: true,
        items: {
          include: { artwork: { include: { images: true } } },
        },
        shippingAddress: true,
      },
    });

    // ── Create admin notification on status change ─────────
    if (status) {
      const statusMessages = {
        CONFIRMED:  `✅ Order #${order.orderNumber} confirmed`,
        PROCESSING: `⚙️ Order #${order.orderNumber} is being processed`,
        SHIPPED:    `🚚 Order #${order.orderNumber} has been shipped`,
        DELIVERED:  `📦 Order #${order.orderNumber} delivered to customer`,
        COMPLETED:  `🎉 Order #${order.orderNumber} completed`,
        CANCELLED:  `❌ Order #${order.orderNumber} was cancelled`,
      };

      if (statusMessages[status.toUpperCase()]) {
        await prisma.notification.create({
          data: {
            type:    'ORDER',
            message: statusMessages[status.toUpperCase()],
            link:    `/admin/orders/${order.id}`,
          },
        });
      }
    }

    res.json(order);

  } catch (error) {
    console.error('Error updating order:', error);
    res.status(500).json({ error: 'Failed to update order' });
  }
};

// ─────────────────────────────────────────────────────────
// Confirm payment after Stripe succeeds (called by frontend)
// POST /api/orders/:id/confirm-payment
// ─────────────────────────────────────────────────────────
exports.confirmOrderPayment = async (req, res) => {
  try {
    const { id }             = req.params;
    const { paymentIntentId } = req.body;

    const order = await prisma.order.findUnique({
      where:   { id },
      include: { 
        customer: true,
        items:    true,
      },
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Guard: don't double-update
    if (order.paymentStatus === 'FULLY_PAID') {
      return res.json({ success: true, message: 'Already updated' });
    }

    // ── Update order payment status ───────────────────────
    await prisma.order.update({
      where: { id },
      data: {
        paymentStatus:        'FULLY_PAID',
        status:               'CONFIRMED',
        stripePaymentIntentId: paymentIntentId || order.stripePaymentIntentId,
      },
    });

    // ── Mark artworks as SOLD ─────────────────────────────
    const artworkIds = order.items.map(i => i.artworkId).filter(Boolean);
    if (artworkIds.length > 0) {
      await prisma.artwork.updateMany({
        where: { id: { in: artworkIds } },
        data:  { status: 'SOLD' },
      });
    }

    // ── Notify admin ──────────────────────────────────────
    await prisma.notification.create({
      data: {
        type:    'ORDER',
        message: `💰 Payment received for Order #${order.orderNumber} — $${Number(order.total).toLocaleString()} from ${order.customer.firstName} ${order.customer.lastName}`,
        link:    `/admin/orders/${order.id}`,
      },
    });

    res.json({ success: true });

  } catch (error) {
    console.error('Error confirming order payment:', error);
    res.status(500).json({ error: 'Failed to confirm payment' });
  }
};