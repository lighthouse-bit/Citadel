const prisma = require('../config/database');

exports.getStats = async (req, res) => {
  try {
    // 1. Calculate Total Revenue
    // Only count FULLY_PAID and DEPOSIT_PAID items
    const revenueResult = await prisma.order.aggregate({
      _sum: { total: true },
      where: { 
        status: { not: 'CANCELLED' },
        paymentStatus: { in: ['FULLY_PAID', 'DEPOSIT_PAID'] } 
      }
    });
    
    // Handle null result if no orders exist
    const totalRevenue = revenueResult._sum.total || 0;

    // 2. Counts
    const [artworksCount, ordersCount, commissionsCount] = await Promise.all([
      prisma.artwork.count(),
      prisma.order.count(),
      prisma.commission.count(),
    ]);

    // 3. Recent Orders
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
        revenue: totalRevenue,
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