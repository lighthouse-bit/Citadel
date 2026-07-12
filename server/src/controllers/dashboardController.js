const prisma = require('../config/database');

const periodDays = { '7d': 7, '30d': 30, '90d': 90 };
const pctChange = (current, previous) => previous === 0 ? (current > 0 ? 100 : 0) : Math.round(((current - previous) / previous) * 100);

exports.getStats = async (req, res) => {
  try {
    const period = periodDays[req.query.period] ? req.query.period : '30d';
    const days = periodDays[period];
    const now = new Date();
    const currentStart = new Date(now.getTime() - days * 86400000);
    const previousStart = new Date(currentStart.getTime() - days * 86400000);
    const paidWhere = { paymentStatus: 'FULLY_PAID', status: { not: 'CANCELLED' } };

    const [currentRevenue, previousRevenue, currentOrders, previousOrders, currentCustomers, previousCustomers,
      artworks, commissions, pendingOrders, processingOrders, pendingCommissions, outstandingBalances,
      recentOrders, recentCommissions, paidOrders, topItems, viewedArtworks] = await Promise.all([
      prisma.order.aggregate({ _sum: { total: true }, where: { ...paidWhere, createdAt: { gte: currentStart } } }),
      prisma.order.aggregate({ _sum: { total: true }, where: { ...paidWhere, createdAt: { gte: previousStart, lt: currentStart } } }),
      prisma.order.count({ where: { createdAt: { gte: currentStart } } }),
      prisma.order.count({ where: { createdAt: { gte: previousStart, lt: currentStart } } }),
      prisma.customer.count({ where: { createdAt: { gte: currentStart } } }),
      prisma.customer.count({ where: { createdAt: { gte: previousStart, lt: currentStart } } }),
      prisma.artwork.count(), prisma.commission.count(),
      prisma.order.count({ where: { status: 'PENDING' } }),
      prisma.order.count({ where: { status: { in: ['CONFIRMED', 'PROCESSING'] } } }),
      prisma.commission.count({ where: { status: { in: ['PENDING', 'REVIEWING'] } } }),
      prisma.commission.count({ where: { status: { notIn: ['COMPLETED', 'CANCELLED'] }, paymentStatus: { in: ['UNPAID', 'DEPOSIT_PAID'] } } }),
      prisma.order.findMany({ take: 5, orderBy: { createdAt: 'desc' }, include: { customer: true, items: true } }),
      prisma.commission.findMany({ take: 5, orderBy: { createdAt: 'desc' }, include: { customer: true } }),
      prisma.order.findMany({ where: { ...paidWhere, createdAt: { gte: currentStart } }, select: { total: true, createdAt: true } }),
      prisma.orderItem.groupBy({ by: ['artworkId', 'title'], where: { order: { paymentStatus: 'FULLY_PAID', status: { not: 'CANCELLED' }, createdAt: { gte: currentStart } } }, _count: { artworkId: true }, _sum: { price: true }, orderBy: { _count: { artworkId: 'desc' } }, take: 5 }),
      prisma.pageView.groupBy({ by: ['artworkId'], where: { artworkId: { not: null }, createdAt: { gte: currentStart } }, _count: { artworkId: true }, orderBy: { _count: { artworkId: 'desc' } }, take: 5 }),
    ]);

    const revenueByDay = {};
    paidOrders.forEach(order => { const day = order.createdAt.toISOString().slice(0, 10); revenueByDay[day] = (revenueByDay[day] || 0) + Number(order.total); });
    const viewedIds = viewedArtworks.map(item => item.artworkId).filter(Boolean);
    const artworkNames = viewedIds.length ? await prisma.artwork.findMany({ where: { id: { in: viewedIds } }, select: { id: true, title: true } }) : [];
    const nameMap = Object.fromEntries(artworkNames.map(item => [item.id, item.title]));
    const revenue = Number(currentRevenue._sum.total || 0);
    const previousRevenueValue = Number(previousRevenue._sum.total || 0);

    res.json({ period, stats: {
      revenue, artworks, orders: currentOrders, commissions, customers: currentCustomers,
      trends: { revenue: pctChange(revenue, previousRevenueValue), orders: pctChange(currentOrders, previousOrders), customers: pctChange(currentCustomers, previousCustomers) },
    }, queues: { pendingOrders, processingOrders, pendingCommissions, outstandingBalances },
      revenueByDay: Object.entries(revenueByDay).map(([date, amount]) => ({ date, amount })).sort((a,b) => a.date.localeCompare(b.date)),
      topSellingArtworks: topItems.map(item => ({ id: item.artworkId, title: item.title, sales: item._count.artworkId, revenue: Number(item._sum.price || 0) })),
      mostViewedArtworks: viewedArtworks.map(item => ({ id: item.artworkId, title: nameMap[item.artworkId] || 'Unknown artwork', views: item._count.artworkId })),
      recentOrders, recentCommissions,
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
};
