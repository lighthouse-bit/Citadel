// server/src/controllers/orderController.js
const prisma = require('../config/database');
const { generateOrderNumber } = require('../utils/helpers');

// Create order from cart
exports.createOrder = async (req, res) => {
  try {
    const {
      customerId,
      items, // Array of artwork IDs
      shippingAddressId,
      customerNotes,
    } = req.body;

    // Get artworks
    const artworks = await prisma.artwork.findMany({
      where: {
        id: { in: items },
        status: 'AVAILABLE',
      },
    });

    if (artworks.length !== items.length) {
      return res.status(400).json({ 
        error: 'Some artworks are no longer available' 
      });
    }

    // Calculate totals
    const subtotal = artworks.reduce(
      (sum, art) => sum + parseFloat(art.price), 
      0
    );
    const shippingCost = calculateShipping(artworks);
    const tax = subtotal * 0.08; // 8% tax example
    const total = subtotal + shippingCost + tax;

    // Create order
    const order = await prisma.order.create({
      data: {
        orderNumber: generateOrderNumber(),
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
        items: { include: { artwork: true } },
        customer: true,
        shippingAddress: true,
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
};

// Get order by ID
exports.getOrderById = async (req, res) => {
  try {
    const { id } = req.params;

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            artwork: {
              include: { images: { where: { isPrimary: true } } },
            },
          },
        },
        customer: true,
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

// Update order status (Admin)
exports.updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, trackingNumber } = req.body;

    const updateData = { status: status.toUpperCase() };

    if (trackingNumber) {
      updateData.trackingNumber = trackingNumber;
    }

    if (status === 'SHIPPED') {
      updateData.shippedAt = new Date();
    }

    if (status === 'DELIVERED') {
      updateData.deliveredAt = new Date();
    }

    // If cancelled, make artworks available again
    if (status === 'CANCELLED') {
      const order = await prisma.order.findUnique({
        where: { id },
        include: { items: true },
      });

      await prisma.artwork.updateMany({
        where: { 
          id: { in: order.items.map(i => i.artworkId) } 
        },
        data: { status: 'AVAILABLE' },
      });
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
};

function calculateShipping(artworks) {
  // Simple shipping calculation
  const baseShipping = 25;
  const perItemShipping = 10;
  return baseShipping + (artworks.length - 1) * perItemShipping;
}