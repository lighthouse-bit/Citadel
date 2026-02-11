// server/src/routes/orderRoutes.js
const express = require('express');
const router = express.Router();
const { authenticateAdmin } = require('../middleware/auth');
const prisma = require('../config/database');

// Get all orders (Admin)
router.get('/', authenticateAdmin, async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = status ? { status: status.toUpperCase() } : {};

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          customer: true,
          items: {
            include: {
              artwork: {
                include: {
                  images: { where: { isPrimary: true } }
                }
              }
            }
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
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// Get single order
router.get('/:id', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        customer: true,
        items: {
          include: {
            artwork: {
              include: { images: true }
            }
          }
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
});

// Create order
router.post('/', async (req, res) => {
  try {
    const { customerId, items, shippingAddressId, customerNotes } = req.body;

    // Generate order number
    const orderNumber = `ORD-${Date.now().toString(36).toUpperCase()}`;

    // Get artworks and calculate totals
    const artworks = await prisma.artwork.findMany({
      where: { id: { in: items }, status: 'AVAILABLE' },
    });

    if (artworks.length !== items.length) {
      return res.status(400).json({ error: 'Some artworks are no longer available' });
    }

    const subtotal = artworks.reduce((sum, art) => sum + parseFloat(art.price), 0);
    const shippingCost = 0; // Free shipping
    const tax = subtotal * 0.08;
    const total = subtotal + shippingCost + tax;

    const order = await prisma.order.create({
      data: {
        orderNumber,
        subtotal,
        shippingCost,
        tax,
        total,
        customerNotes,
        customerId,
        shippingAddressId,
        items: {
          create: artworks.map(artwork => ({
            price: artwork.price,
            title: artwork.title,
            artworkId: artwork.id,
          })),
        },
      },
      include: {
        items: true,
        customer: true,
      },
    });

    // Reserve artworks
    await prisma.artwork.updateMany({
      where: { id: { in: items } },
      data: { status: 'RESERVED' },
    });

    res.status(201).json(order);
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ error: 'Failed to create order' });
  }
});

// Update order status (Admin)
router.patch('/:id/status', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, trackingNumber, internalNotes } = req.body;

    const updateData = {};
    
    if (status) {
      updateData.status = status.toUpperCase();
      
      if (status === 'SHIPPED') {
        updateData.shippedAt = new Date();
      }
      if (status === 'DELIVERED') {
        updateData.deliveredAt = new Date();
      }
    }
    
    if (trackingNumber) {
      updateData.trackingNumber = trackingNumber;
    }
    
    if (internalNotes) {
      updateData.internalNotes = internalNotes;
    }

    const order = await prisma.order.update({
      where: { id },
      data: updateData,
      include: {
        items: true,
        customer: true,
      },
    });

    res.json(order);
  } catch (error) {
    console.error('Error updating order:', error);
    res.status(500).json({ error: 'Failed to update order' });
  }
});

module.exports = router;