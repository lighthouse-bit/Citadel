// server/src/controllers/dashboardController.js

const prisma = require('../config/database');

exports.getStats = async (req, res) => {
  try {
    // 1. Total Revenue (only paid orders)
    const revenueResult = await prisma.order.aggregate({
      _sum: { total: true },
      where: { 
        paymentStatus: { in: ['FULLY_PAID', 'DEPOSIT_PAID'] },
        status: { not: 'CANCELLED' }
      }
    });

    // 2. Counts
    const [artworksCount, ordersCount, commissionsCount] = await Promise.all([
      prisma.artwork.count(),
      prisma.order.count(),
      prisma.commission.count(),
    ]);

    // 3. Recent Orders (include payment status)
    const recentOrders = await prisma.order.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        customer: true,
        items: { include: { artwork: true } }
      }
    });

    // 4. Recent Commissions
    const recentCommissions = await prisma.commission.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: { customer: true }
    });

    res.json({
      stats: {
        revenue: revenueResult._sum.total || 0,
        artworks: artworksCount,
        orders: ordersCount,
        commissions: commissionsCount,
      },
      recentOrders,
      recentCommissions
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
};