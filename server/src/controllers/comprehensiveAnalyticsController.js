const prisma = require('../config/database');
const { commissionReceipts } = require('../utils/commerceMath');

const PERIOD_DAYS = { '7d': 7, '30d': 30, '90d': 90, '365d': 365 };
const percentage = (value, total) => total ? Number(((value / total) * 100).toFixed(1)) : 0;
const change = (current, previous) => previous === 0 ? (current > 0 ? 100 : 0) : Number((((current - previous) / previous) * 100).toFixed(1));
const dateKey = value => new Date(value).toISOString().slice(0, 10);
const groupCounts = groups => Object.fromEntries(groups.map(item => [item.status, item._count._all]));
const commissionRevenue = (items, start, end) => items.reduce((sum, item) => sum + commissionReceipts(item, start, end).reduce((total, receipt) => total + receipt.amount, 0), 0);

exports.getComprehensiveAnalytics = async (req, res) => {
  try {
    const period = PERIOD_DAYS[req.query.period] ? req.query.period : '30d';
    const days = PERIOD_DAYS[period];
    const end = new Date();
    const start = new Date(end.getTime() - days * 86400000);
    const previousStart = new Date(start.getTime() - days * 86400000);
    const paidOrder = { paymentStatus: 'FULLY_PAID', status: { not: 'CANCELLED' } };
    const commissionPaymentWhere = range => ({ paymentStatus: { in: ['DEPOSIT_PAID', 'FULLY_PAID'] }, status: { not: 'CANCELLED' }, OR: [{ depositPaidAt: range }, { balancePaidAt: range }] });

    const [currentOrders, previousOrders, currentCommissions, previousCommissions,
      newCustomers, previousCustomers, totalCustomers, verifiedCustomers, marketingSubscribers,
      totalViews, previousViews, visitorGroups, previousVisitorGroups, viewsByDay,
      viewsByPage, devices, eventGroups, topItems, orderStatuses, commissionStatuses,
      campaignTotals, automationTotals, abandonedCarts, outstandingCommissions] = await Promise.all([
      prisma.order.findMany({ where: { ...paidOrder, createdAt: { gte: start, lte: end } }, select: { total: true, createdAt: true, customerId: true } }),
      prisma.order.findMany({ where: { ...paidOrder, createdAt: { gte: previousStart, lt: start } }, select: { total: true, createdAt: true, customerId: true } }),
      prisma.commission.findMany({ where: commissionPaymentWhere({ gte: start, lte: end }) }),
      prisma.commission.findMany({ where: commissionPaymentWhere({ gte: previousStart, lt: start }) }),
      prisma.customer.count({ where: { createdAt: { gte: start, lte: end } } }),
      prisma.customer.count({ where: { createdAt: { gte: previousStart, lt: start } } }),
      prisma.customer.count(),
      prisma.customer.count({ where: { isVerified: true } }),
      prisma.customer.count({ where: { marketingEmails: true, isSuspended: false } }),
      prisma.pageView.count({ where: { createdAt: { gte: start, lte: end } } }),
      prisma.pageView.count({ where: { createdAt: { gte: previousStart, lt: start } } }),
      prisma.pageView.groupBy({ by: ['sessionId'], where: { createdAt: { gte: start, lte: end }, sessionId: { not: null } } }),
      prisma.pageView.groupBy({ by: ['sessionId'], where: { createdAt: { gte: previousStart, lt: start }, sessionId: { not: null } } }),
      prisma.$queryRaw`SELECT DATE("createdAt") AS date, COUNT(*)::int AS views, COUNT(DISTINCT "sessionId")::int AS visitors FROM "PageView" WHERE "createdAt" >= ${start} AND "createdAt" <= ${end} GROUP BY DATE("createdAt") ORDER BY date ASC`,
      prisma.pageView.groupBy({ by: ['path'], where: { createdAt: { gte: start, lte: end } }, _count: { id: true }, orderBy: { _count: { id: 'desc' } }, take: 8 }),
      prisma.pageView.groupBy({ by: ['device'], where: { createdAt: { gte: start, lte: end } }, _count: { id: true } }),
      prisma.analyticsEvent.groupBy({ by: ['event'], where: { createdAt: { gte: start, lte: end } }, _count: { id: true } }),
      prisma.orderItem.groupBy({ by: ['artworkId', 'title'], where: { order: { ...paidOrder, createdAt: { gte: start, lte: end } } }, _count: { artworkId: true }, _sum: { price: true }, orderBy: { _sum: { price: 'desc' } }, take: 8 }),
      prisma.order.groupBy({ by: ['status'], where: { createdAt: { gte: start, lte: end } }, _count: { _all: true } }),
      prisma.commission.groupBy({ by: ['status'], where: { createdAt: { gte: start, lte: end } }, _count: { _all: true } }),
      prisma.emailCampaign.aggregate({ where: { sentAt: { gte: start, lte: end } }, _sum: { recipientCount: true, deliveredCount: true, openedCount: true, clickedCount: true, unsubscribeCount: true }, _count: { _all: true } }),
      prisma.automationDelivery.groupBy({ by: ['status'], where: { createdAt: { gte: start, lte: end } }, _count: { _all: true } }),
      prisma.cartItem.groupBy({ by: ['customerId'], where: { updatedAt: { lt: new Date(end.getTime() - 24 * 60 * 60 * 1000) } }, _count: { _all: true } }),
      prisma.commission.count({ where: { status: { notIn: ['COMPLETED', 'CANCELLED'] }, paymentStatus: { in: ['UNPAID', 'DEPOSIT_PAID'] } } }),
    ]);

    const orderRevenue = currentOrders.reduce((sum, order) => sum + Number(order.total), 0);
    const previousOrderRevenue = previousOrders.reduce((sum, order) => sum + Number(order.total), 0);
    const commissionsRevenue = commissionRevenue(currentCommissions, start, end);
    const previousCommissionsRevenue = commissionRevenue(previousCommissions, previousStart, new Date(start.getTime() - 1));
    const revenue = orderRevenue + commissionsRevenue;
    const previousRevenue = previousOrderRevenue + previousCommissionsRevenue;
    const events = Object.fromEntries(eventGroups.map(item => [item.event, item._count.id]));
    const funnel = [
      { key: 'view_item', label: 'Artwork views', count: events.view_item || 0 },
      { key: 'add_to_cart', label: 'Added to cart', count: events.add_to_cart || 0 },
      { key: 'begin_checkout', label: 'Checkout started', count: events.begin_checkout || 0 },
      { key: 'purchase', label: 'Purchases tracked', count: events.purchase || 0 },
    ];
    const revenueDays = {};
    currentOrders.forEach(order => { const key = dateKey(order.createdAt); revenueDays[key] = (revenueDays[key] || 0) + Number(order.total); });
    currentCommissions.forEach(item => commissionReceipts(item, start, end).forEach(receipt => { const key = dateKey(receipt.date); revenueDays[key] = (revenueDays[key] || 0) + receipt.amount; }));
    const trafficDays = Object.fromEntries(viewsByDay.map(item => [dateKey(item.date), { views: Number(item.views), visitors: Number(item.visitors) }]));
    const timeline = Array.from({ length: days }, (_, index) => {
      const key = dateKey(new Date(start.getTime() + (index + 1) * 86400000));
      return { date: key, revenue: Number((revenueDays[key] || 0).toFixed(2)), views: trafficDays[key]?.views || 0, visitors: trafficDays[key]?.visitors || 0 };
    });
    const uniqueBuyers = new Set(currentOrders.map(order => order.customerId));
    const automationStatuses = groupCounts(automationTotals);
    const delivered = Number(campaignTotals._sum.deliveredCount || 0);
    const commissionStatusCounts = groupCounts(commissionStatuses);

    res.json({
      period, range: { from: dateKey(start), to: dateKey(end) }, generatedAt: end,
      overview: {
        revenue, orders: currentOrders.length, visitors: visitorGroups.length, newCustomers,
        averageOrderValue: currentOrders.length ? orderRevenue / currentOrders.length : 0,
        conversionRate: percentage(uniqueBuyers.size, visitorGroups.length),
        trends: { revenue: change(revenue, previousRevenue), orders: change(currentOrders.length, previousOrders.length), visitors: change(visitorGroups.length, previousVisitorGroups.length), customers: change(newCustomers, previousCustomers) },
      },
      timeline,
      revenue: { orderRevenue, commissionRevenue: commissionsRevenue, uniqueBuyers: uniqueBuyers.size },
      traffic: { totalViews, averageViewsPerVisitor: visitorGroups.length ? Number((totalViews / visitorGroups.length).toFixed(1)) : 0, viewsTrend: change(totalViews, previousViews), topPages: viewsByPage.map(item => ({ path: item.path, views: item._count.id })), devices: devices.map(item => ({ label: item.device || 'Unknown', count: item._count.id })) },
      funnel: funnel.map((step, index) => ({ ...step, rateFromPrevious: index ? percentage(step.count, funnel[index - 1].count) : 100, rateFromTop: percentage(step.count, funnel[0].count) })),
      customers: { total: totalCustomers, verified: verifiedCustomers, marketingSubscribers, new: newCustomers, verificationRate: percentage(verifiedCustomers, totalCustomers) },
      commerce: { orderStatuses: groupCounts(orderStatuses), abandonedCartCustomers: abandonedCarts.length, outstandingCommissions },
      commissions: { statuses: commissionStatusCounts, submitted: Object.values(commissionStatusCounts).reduce((sum, value) => sum + value, 0) },
      topArtworks: topItems.map(item => ({ id: item.artworkId, title: item.title, sales: item._count.artworkId, revenue: Number(item._sum.price || 0) })),
      marketing: {
        campaigns: campaignTotals._count._all, recipients: Number(campaignTotals._sum.recipientCount || 0), delivered,
        opened: Number(campaignTotals._sum.openedCount || 0), clicked: Number(campaignTotals._sum.clickedCount || 0), unsubscribed: Number(campaignTotals._sum.unsubscribeCount || 0),
        deliveryRate: percentage(delivered, Number(campaignTotals._sum.recipientCount || 0)), openRate: percentage(Number(campaignTotals._sum.openedCount || 0), delivered), clickRate: percentage(Number(campaignTotals._sum.clickedCount || 0), delivered),
        automations: { sent: automationStatuses.SENT || 0, failed: automationStatuses.FAILED || 0, pending: automationStatuses.PENDING || 0 },
      },
    });
  } catch (error) {
    console.error('Comprehensive analytics error:', error);
    res.status(500).json({ error: 'Comprehensive analytics could not be loaded' });
  }
};

module.exports.helpers = { percentage, change, commissionRevenue };
