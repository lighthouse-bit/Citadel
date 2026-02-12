const prisma = require('../config/database');

// Create order
exports.createOrder = async (req, res) => {
  try {
    // 1. Get logged-in user (optional)
    const loggedInUser = req.user; 

    const {
      firstName,
      lastName,
      email,
      items, // Expecting array of artwork IDs
      shippingAddress, // Object with address details
    } = req.body;

    let customerId;

    if (loggedInUser) {
      // CASE A: Logged-in User
      customerId = loggedInUser.id;
    } else {
      // CASE B: Guest User
      let customer = await prisma.customer.findUnique({
        where: { email },
      });

      if (!customer) {
        customer = await prisma.customer.create({
          data: {
            email,
            firstName,
            lastName,
          },
        });
      }
      customerId = customer.id;
    }

    // Save Shipping Address
    const address = await prisma.address.create({
      data: {
        ...shippingAddress,
        customerId,
      },
    });

    // Get artworks to verify price and availability
    const artworkIds = items.map(item => item.id);
    const dbArtworks = await prisma.artwork.findMany({
      where: {
        id: { in: artworkIds },
        status: 'AVAILABLE',
      },
    });

    if (dbArtworks.length !== items.length) {
      return res.status(400).json({ error: 'One or more items are no longer available.' });
    }

    // Calculate totals
    const subtotal = dbArtworks.reduce((sum, art) => sum + Number(art.price), 0);
    const shippingCost = 0; // Free shipping logic
    const tax = 0; // Simplified tax logic
    const total = subtotal + shippingCost + tax;

    const orderNumber = `ORD-${Date.now().toString().slice(-6)}`;

    // Create Order Transaction with Notification
    const order = await prisma.$transaction(async (tx) => {
      // 1. Create Order Record
      const newOrder = await tx.order.create({
        data: {
          orderNumber,
          subtotal,
          shippingCost,
          tax,
          total,
          status: 'PENDING',
          paymentStatus: 'UNPAID', // Will update after payment
          customerId,
          shippingAddressId: address.id,
          items: {
            create: dbArtworks.map(art => ({
              price: art.price,
              title: art.title,
              artworkId: art.id,
            })),
          },
        },
        include: {
          items: true,
        },
      });

      // 2. Mark Artworks as RESERVED (pending payment)
      await tx.artwork.updateMany({
        where: { id: { in: artworkIds } },
        data: { status: 'RESERVED' },
      });

      // 3. Create Notification for Admin
      await tx.notification.create({
        data: {
          type: 'ORDER',
          message: `New Order #${newOrder.orderNumber} - $${Number(newOrder.total).toLocaleString()}`,
          link: `/admin/orders/${newOrder.id}`,
          isRead: false,
        }
      });

      return newOrder;
    });

    res.status(201).json(order);
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ error: 'Failed to create order' });
  }
};

// Get All Orders (Admin with Filters)
exports.getAllOrders = async (req, res) => {
  try {
    const { status, page = 1, limit = 20, customerEmail } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {};
    if (status) where.status = status.toUpperCase();
    
    // Allow filtering by customer email (for User Dashboard)
    if (customerEmail) {
      where.customer = { email: customerEmail };
    }

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          customer: true,
          items: {
            include: { artwork: { include: { images: true } } }
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
      },
    });
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
};

// Get Single Order
exports.getOrderById = async (req, res) => {
  try {
    const { id } = req.params;
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        customer: true,
        items: {
          include: { artwork: { include: { images: true } } }
        },
        shippingAddress: true,
      },
    });

    if (!order) return res.status(404).json({ error: 'Order not found' });
    res.json(order);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch order' });
  }
};

// Update Order Status (Admin)
exports.updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, trackingNumber, internalNotes } = req.body;

    const updateData = {};
    if (status) updateData.status = status.toUpperCase();
    if (trackingNumber !== undefined) updateData.trackingNumber = trackingNumber;
    if (internalNotes !== undefined) updateData.internalNotes = internalNotes;

    const order = await prisma.order.update({
      where: { id },
      data: updateData,
    });

    // Optional: Notify customer via email here if status changes (e.g. to SHIPPED)

    res.json(order);
  } catch (error) {
    console.error('Error updating order:', error);
    res.status(500).json({ error: 'Failed to update order' });
  }
};