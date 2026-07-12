// server/src/controllers/orderController.js
const prisma = require('../config/database');
const {
  sendOrderInvoiceEmail,
  sendOrderShippedEmail,
  sendOrderDeliveredEmail,
} = require('../utils/emailService');
const { registerTracking } = require('../utils/trackingService');
const { recordAudit } = require('../utils/auditService');

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
      shippingCost = 0,
      shippingZone  = 'Unknown',
      shippingSize  = 'unknown',
    } = req.body;

    let customerId;

    if (loggedInUser) {
      customerId = loggedInUser.id;
    } else {
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
        error: 'One or more items are no longer available.',
      });
    }

    // Calculate totals with shipping
    const subtotal       = dbArtworks.reduce(
      (sum, art) => sum + Number(art.price),
      0
    );
    const finalShipping  = parseFloat(shippingCost) || 0;
    const tax            = 0;
    const total          = subtotal + finalShipping + tax;
    const orderNumber    = `ORD-${Date.now().toString().slice(-6)}`;

    // Create order in transaction
    const order = await prisma.$transaction(async (tx) => {
      const newOrder = await tx.order.create({
        data: {
          orderNumber,
          subtotal,
          shippingCost:      finalShipping,
          shippingZone,
          shippingSize,
          tax,
          total,
          status:            'PENDING',
          paymentStatus:     'UNPAID',
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
          message: `🛍️ New Order #${newOrder.orderNumber} — $${Number(newOrder.total).toLocaleString()} (${shippingZone})`,
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
    const { status, paymentStatus, search, dateFrom, dateTo, stalled, page = 1, limit = 20, customerEmail } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {};
    if (req.user?.role !== 'admin') where.customerId = req.user?.id || '__anonymous__';
    if (status)        where.status   = status.toUpperCase();
    if (paymentStatus) where.paymentStatus = paymentStatus.toUpperCase();
    if (customerEmail) where.customer = { email: customerEmail };
    if (dateFrom || dateTo) where.createdAt = { ...(dateFrom && { gte: new Date(dateFrom) }), ...(dateTo && { lte: new Date(`${dateTo}T23:59:59.999Z`) }) };
    if (stalled === 'true') { where.updatedAt = { lt: new Date(Date.now() - 3 * 86400000) }; where.status = { in: ['PENDING', 'CONFIRMED', 'PROCESSING'] }; }
    if (search) where.OR = [
      { orderNumber: { contains: search, mode: 'insensitive' } },
      { trackingNumber: { contains: search, mode: 'insensitive' } },
      { customer: { is: { OR: [
        { email: { contains: search, mode: 'insensitive' } },
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
      ] } } },
    ];

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
      orders: orders.map(order => ({ ...order, isStalled: ['PENDING','CONFIRMED','PROCESSING'].includes(order.status) && Date.now() - new Date(order.updatedAt).getTime() > 3 * 86400000 })),
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
        events: { include: { admin: { select: { name: true } } }, orderBy: { createdAt: 'desc' } },
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
// Track order by number (Public — no auth required)
// GET /api/orders/track/:orderNumber
// ─────────────────────────────────────────────────────────
exports.trackOrder = async (req, res) => {
  try {
    const { orderNumber } = req.params;

    const order = await prisma.order.findUnique({
      where: { orderNumber },
      include: {
        customer: {
          select: {
            firstName: true,
            lastName:  true,
          },
        },
        items: {
          include: { artwork: { include: { images: { take: 1 } } } },
        },
        shippingAddress: true,
      },
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Don't expose sensitive info
    delete order.internalNotes;
    delete order.stripePaymentIntentId;

    res.json(order);
  } catch (error) {
    console.error('Track order error:', error);
    res.status(500).json({ error: 'Failed to track order' });
  }
};

// ─────────────────────────────────────────────────────────
// Update order status + tracking + notes (Admin)
// PATCH /api/orders/:id/status
// ─────────────────────────────────────────────────────────
exports.updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      status,
      trackingNumber,
      trackingUrl,
      carrier,
      estimatedDelivery,
      internalNotes,
    } = req.body;

    const updateData = {};
    const shouldSendShippedEmail   = status?.toUpperCase() === 'SHIPPED';
    const shouldSendDeliveredEmail = status?.toUpperCase() === 'DELIVERED';

    if (status) {
      updateData.status = status.toUpperCase();
      if (status.toUpperCase() === 'SHIPPED')   updateData.shippedAt   = new Date();
      if (status.toUpperCase() === 'DELIVERED') updateData.deliveredAt = new Date();
    }

    if (trackingNumber    !== undefined) updateData.trackingNumber    = trackingNumber;
    if (trackingUrl       !== undefined) updateData.trackingUrl       = trackingUrl;
    if (carrier           !== undefined) updateData.carrier           = carrier;
    if (estimatedDelivery !== undefined) {
      updateData.estimatedDelivery = estimatedDelivery
        ? new Date(estimatedDelivery)
        : null;
    }
    if (internalNotes     !== undefined) updateData.internalNotes     = internalNotes;

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

    const changedFields = Object.keys(updateData);
    if (changedFields.length) {
      await prisma.orderEvent.create({ data: {
        orderId: order.id, adminId: req.user.id,
        type: status ? 'STATUS_CHANGED' : 'ORDER_UPDATED',
        message: status ? `Status changed to ${status.toUpperCase()}` : `Order details updated: ${changedFields.join(', ')}`,
        metadata: { changedFields, status: status?.toUpperCase() },
      }});
      await recordAudit(req, 'UPDATE_ORDER', 'Order', order.id, { changedFields, status: status?.toUpperCase() });
    }
    if (req.user?.role !== 'admin' && order.customerId !== req.user?.id) return res.status(403).json({ error: 'Access denied' });

    // ✅ Register tracking with 17track for live updates
    if (shouldSendShippedEmail && order.trackingNumber && order.carrier) {
      registerTracking(order.trackingNumber, order.carrier)
        .then(() => console.log(`✅ Registered ${order.trackingNumber} with 17track`))
        .catch(err => console.error('❌ 17track registration failed:', err.message));
    }

    // ✅ Send shipped email
    if (shouldSendShippedEmail && order.customer?.email) {
      await sendOrderShippedEmail({
        email:             order.customer.email,
        firstName:         order.customer.firstName,
        orderNumber:       order.orderNumber,
        trackingNumber:    order.trackingNumber,
        trackingUrl:       order.trackingUrl,
        carrier:           order.carrier,
        estimatedDelivery: order.estimatedDelivery,
        shippingAddress:   order.shippingAddress,
      }).catch(err => console.error('❌ Shipped email error:', err.message));
    }

    // ✅ Send delivered email
    if (shouldSendDeliveredEmail && order.customer?.email) {
      await sendOrderDeliveredEmail({
        email:       order.customer.email,
        firstName:   order.customer.firstName,
        orderNumber: order.orderNumber,
      }).catch(err => console.error('❌ Delivered email error:', err.message));
    }

    // Admin notification
    if (status) {
      const statusMessages = {
        CONFIRMED:  `✅ Order #${order.orderNumber} confirmed`,
        PROCESSING: `⚙️ Order #${order.orderNumber} is being processed`,
        SHIPPED:    `🚚 Order #${order.orderNumber} shipped — customer notified`,
        DELIVERED:  `📦 Order #${order.orderNumber} delivered — customer notified`,
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
        }).catch(() => {});
      }
    }

    res.json(order);

  } catch (error) {
    console.error('Error updating order:', error);
    res.status(500).json({ error: 'Failed to update order' });
  }
};

// ─────────────────────────────────────────────────────────
// Confirm payment after Paystack succeeds (called by frontend)
// POST /api/orders/:id/confirm-payment
// ─────────────────────────────────────────────────────────
exports.confirmOrderPayment = async (req, res) => {
  try {
    const { id }              = req.params;
    const { paymentIntentId } = req.body;

    const order = await prisma.order.findUnique({
      where:   { id },
      include: {
        customer: true,
        items: {
          include: {
            artwork: {
              include: { images: { take: 1 } },
            },
          },
        },
      },
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Guard — don't double-update
    if (order.paymentStatus === 'FULLY_PAID') {
      return res.json({ success: true, message: 'Already updated' });
    }

    // Update order payment status
    await prisma.order.update({
      where: { id },
      data: {
        paymentStatus:         'FULLY_PAID',
        status:                'CONFIRMED',
        stripePaymentIntentId: paymentIntentId || order.stripePaymentIntentId,
      },
    });

    // Mark artworks as SOLD
    const artworkIds = order.items.map(i => i.artworkId).filter(Boolean);
    if (artworkIds.length > 0) {
      await prisma.artwork.updateMany({
        where: { id: { in: artworkIds } },
        data:  { status: 'SOLD' },
      });
    }

    // Notify admin
    await prisma.notification.create({
      data: {
        type:    'ORDER',
        message: `💰 Payment received for Order #${order.orderNumber} — $${Number(order.total).toLocaleString()} from ${order.customer.firstName} ${order.customer.lastName}`,
        link:    `/admin/orders/${order.id}`,
      },
    }).catch(() => {});

    // Send invoice email
    if (order.customer?.email) {
      await sendOrderInvoiceEmail({
        email:       order.customer.email,
        firstName:   order.customer.firstName,
        orderNumber: order.orderNumber,
        items:       order.items.map(item => ({
          title: item.title || item.artwork?.title || 'Artwork',
          price: parseFloat(item.price),
        })),
        subtotal:  parseFloat(order.subtotal),
        shipping:  parseFloat(order.shippingCost),
        tax:       parseFloat(order.tax),
        total:     parseFloat(order.total),
        createdAt: order.createdAt,
      }).catch(err => console.error('❌ Invoice email error:', err.message));
    }

    res.json({ success: true });

  } catch (error) {
    console.error('Error confirming order payment:', error);
    res.status(500).json({ error: 'Failed to confirm payment' });
  }
};

exports.bulkUpdateStatus = async (req, res) => {
  try {
    const { orderIds, status } = req.body;
    const nextStatus = status?.toUpperCase();
    if (!Array.isArray(orderIds) || !orderIds.length || !['PENDING','CONFIRMED','PROCESSING'].includes(nextStatus)) return res.status(400).json({ error: 'Bulk updates support pending, confirmed, and processing states only' });
    await prisma.$transaction(async tx => {
      await tx.order.updateMany({ where: { id: { in: orderIds }, status: { notIn: ['DELIVERED','CANCELLED'] } }, data: { status: nextStatus } });
      for (const orderId of orderIds) await tx.orderEvent.create({ data: { orderId, adminId: req.user.id, type: 'BULK_STATUS_CHANGED', message: `Status changed to ${nextStatus} in bulk action` } });
    });
    await recordAudit(req, 'BULK_UPDATE_ORDERS', 'Order', null, { orderIds, status: nextStatus });
    res.json({ success: true, updated: orderIds.length });
  } catch (error) { console.error(error); res.status(500).json({ error: 'Bulk update failed' }); }
};

exports.exportOrders = async (req, res) => {
  try {
    const orders = await prisma.order.findMany({ include: { customer: true }, orderBy: { createdAt: 'desc' }, take: 5000 });
    const esc = value => `"${String(value ?? '').replaceAll('"','""')}"`;
    const rows = [['Order','Customer','Email','Total','Payment','Status','Tracking','Created'], ...orders.map(o => [o.orderNumber, `${o.customer.firstName} ${o.customer.lastName}`, o.customer.email, o.total, o.paymentStatus, o.status, o.trackingNumber, o.createdAt.toISOString()])];
    res.setHeader('Content-Type','text/csv'); res.setHeader('Content-Disposition',`attachment; filename="orders-${new Date().toISOString().slice(0,10)}.csv"`); res.send(rows.map(row => row.map(esc).join(',')).join('\n'));
  } catch (error) { console.error(error); res.status(500).json({ error: 'Export failed' }); }
};

exports.resendOrderEmail = async (req, res) => {
  try {
    const order = await prisma.order.findUnique({ where: { id: req.params.id }, include: { customer: true, items: { include: { artwork: { include: { images: { take: 1 } } } } }, shippingAddress: true } });
    if (!order) return res.status(404).json({ error: 'Order not found' });
    if (req.body.type === 'shipping') {
      if (!order.trackingNumber) return res.status(400).json({ error: 'Tracking details are required' });
      await sendOrderShippedEmail({ email: order.customer.email, firstName: order.customer.firstName, orderNumber: order.orderNumber, trackingNumber: order.trackingNumber, trackingUrl: order.trackingUrl, carrier: order.carrier, estimatedDelivery: order.estimatedDelivery, shippingAddress: order.shippingAddress });
    } else {
      await sendOrderInvoiceEmail({ email: order.customer.email, firstName: order.customer.firstName, orderNumber: order.orderNumber, items: order.items, subtotal: order.subtotal, shipping: order.shippingCost, tax: order.tax, total: order.total, createdAt: order.createdAt });
    }
    await recordAudit(req, 'RESEND_ORDER_EMAIL', 'Order', order.id, { type: req.body.type || 'invoice' });
    res.json({ success: true });
  } catch (error) { console.error(error); res.status(500).json({ error: 'Failed to send email' }); }
};

exports.cancelOrder = async (req, res) => {
  try {
    const order = await prisma.order.findUnique({ where: { id: req.params.id }, include: { items: true } });
    if (!order) return res.status(404).json({ error: 'Order not found' });
    if (['SHIPPED','DELIVERED','CANCELLED'].includes(order.status)) return res.status(409).json({ error: 'This order can no longer be cancelled' });
    const reason = req.body.reason?.trim(); if (!reason) return res.status(400).json({ error: 'Cancellation reason is required' });
    await prisma.$transaction(async tx => {
      await tx.order.update({ where: { id: order.id }, data: { status: 'CANCELLED', internalNotes: [order.internalNotes, `Cancellation: ${reason}`].filter(Boolean).join('\n') } });
      if (order.paymentStatus === 'UNPAID') await tx.artwork.updateMany({ where: { id: { in: order.items.map(i=>i.artworkId) }, status: 'RESERVED' }, data: { status: 'AVAILABLE' } });
      await tx.orderEvent.create({ data: { orderId: order.id, adminId: req.user.id, type: 'ORDER_CANCELLED', message: `Order cancelled: ${reason}`, metadata: { requiresRefund: order.paymentStatus === 'FULLY_PAID' } } });
    });
    await recordAudit(req, 'CANCEL_ORDER', 'Order', order.id, { reason, requiresRefund: order.paymentStatus === 'FULLY_PAID' });
    res.json({ success: true, requiresRefund: order.paymentStatus === 'FULLY_PAID' });
  } catch (error) { console.error(error); res.status(500).json({ error: 'Cancellation failed' }); }
};
