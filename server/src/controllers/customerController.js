const prisma = require('../config/database');
const { recordAudit } = require('../utils/auditService');

const customerWhere = ({ search = '', verified, suspended, tag }) => ({
  ...(search.trim() && { OR: [
    { email: { contains: search.trim(), mode: 'insensitive' } },
    { firstName: { contains: search.trim(), mode: 'insensitive' } },
    { lastName: { contains: search.trim(), mode: 'insensitive' } },
    { phone: { contains: search.trim(), mode: 'insensitive' } },
  ] }),
  ...(verified !== undefined && verified !== '' && { isVerified: verified === 'true' }),
  ...(suspended !== undefined && suspended !== '' && { isSuspended: suspended === 'true' }),
  ...(tag?.trim() && { adminTags: { has: tag.trim().toLowerCase() } }),
});

const summarySelect = {
  id: true, email: true, firstName: true, lastName: true, phone: true,
  isVerified: true, isSuspended: true, suspensionReason: true,
  adminNotes: true, adminTags: true, createdAt: true, updatedAt: true,
  orders: { where: { paymentStatus: 'FULLY_PAID' }, select: { total: true } },
  commissions: { where: { paymentStatus: 'FULLY_PAID' }, select: { finalPrice: true } },
  _count: { select: { orders: true, commissions: true } },
};

const summarize = customer => {
  const orderValue = customer.orders.reduce((sum, order) => sum + Number(order.total || 0), 0);
  const commissionValue = customer.commissions.reduce((sum, commission) => sum + Number(commission.finalPrice || 0), 0);
  const { orders, commissions, ...safe } = customer;
  return { ...safe, lifetimeValue: orderValue + commissionValue };
};

exports.getCustomers = async (req, res) => {
  try {
    const { page = 1, limit = 25, sort = 'newest' } = req.query;
    const safePage = Math.max(Number(page) || 1, 1);
    const safeLimit = Math.min(Math.max(Number(limit) || 25, 1), 100);
    const where = customerWhere(req.query);
    const orderBy = sort === 'oldest' ? { createdAt: 'asc' } : sort === 'name' ? { firstName: 'asc' } : { createdAt: 'desc' };
    const [customers, total] = await Promise.all([
      prisma.customer.findMany({ where, skip: (safePage - 1) * safeLimit, take: safeLimit, orderBy, select: summarySelect }),
      prisma.customer.count({ where }),
    ]);
    res.json({ customers: customers.map(summarize), pagination: { page: safePage, limit: safeLimit, total, pages: Math.ceil(total / safeLimit) } });
  } catch (error) {
    console.error('Failed to fetch customers:', error);
    res.status(500).json({ error: 'Failed to fetch customers' });
  }
};

exports.getCustomer = async (req, res) => {
  try {
    const customer = await prisma.customer.findUnique({
      where: { id: req.params.id },
      include: {
        addresses: true,
        orders: { orderBy: { createdAt: 'desc' }, take: 50, include: { items: { include: { artwork: { select: { title: true } } } } } },
        commissions: { orderBy: { createdAt: 'desc' }, take: 50 },
      },
    });
    if (!customer) return res.status(404).json({ error: 'Customer not found' });
    const auditLogs = await prisma.auditLog.findMany({
      where: { entity: 'Customer', entityId: customer.id },
      include: { admin: { select: { name: true, email: true } } },
      orderBy: { createdAt: 'desc' }, take: 100,
    });
    const { password, verificationToken, googleId, stripeCustomerId, ...safeCustomer } = customer;
    const lifetimeValue = customer.orders.filter(o => o.paymentStatus === 'FULLY_PAID').reduce((sum, o) => sum + Number(o.total), 0)
      + customer.commissions.filter(c => c.paymentStatus === 'FULLY_PAID').reduce((sum, c) => sum + Number(c.finalPrice || 0), 0);
    res.json({ ...safeCustomer, lifetimeValue, auditLogs });
  } catch (error) {
    console.error('Failed to fetch customer:', error);
    res.status(500).json({ error: 'Failed to fetch customer' });
  }
};

exports.updateCustomer = async (req, res) => {
  try {
    const existing = await prisma.customer.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: 'Customer not found' });
    const data = {};
    if (req.body.adminNotes !== undefined) data.adminNotes = String(req.body.adminNotes).slice(0, 10000);
    if (req.body.adminTags !== undefined) data.adminTags = [...new Set(req.body.adminTags.map(tag => String(tag).trim().toLowerCase()).filter(Boolean))].slice(0, 20);
    if (req.body.isSuspended !== undefined) {
      data.isSuspended = Boolean(req.body.isSuspended);
      if (data.isSuspended && !req.body.suspensionReason?.trim()) return res.status(400).json({ error: 'A suspension reason is required' });
      data.suspensionReason = data.isSuspended ? req.body.suspensionReason.trim().slice(0, 500) : null;
    }
    const customer = await prisma.customer.update({ where: { id: req.params.id }, data, select: { id: true, email: true, firstName: true, lastName: true, isVerified: true, isSuspended: true, suspensionReason: true, adminNotes: true, adminTags: true } });
    await recordAudit(req, existing.isSuspended !== customer.isSuspended ? (customer.isSuspended ? 'SUSPEND_CUSTOMER' : 'REACTIVATE_CUSTOMER') : 'UPDATE_CUSTOMER', 'Customer', customer.id, {
      changedFields: Object.keys(data), suspensionReason: data.suspensionReason, tags: data.adminTags,
    });
    res.json(customer);
  } catch (error) {
    console.error('Failed to update customer:', error);
    res.status(500).json({ error: 'Failed to update customer' });
  }
};

exports.exportCustomers = async (req, res) => {
  try {
    const customers = await prisma.customer.findMany({ where: customerWhere(req.query), orderBy: { createdAt: 'desc' }, select: summarySelect, take: 5000 });
    const escape = value => `"${String(value ?? '').replace(/"/g, '""')}"`;
    const rows = [['Name', 'Email', 'Phone', 'Verified', 'Suspended', 'Tags', 'Orders', 'Commissions', 'Lifetime value', 'Joined'], ...customers.map(customer => {
      const item = summarize(customer);
      return [`${item.firstName} ${item.lastName}`, item.email, item.phone, item.isVerified, item.isSuspended, item.adminTags.join('; '), item._count.orders, item._count.commissions, item.lifetimeValue, item.createdAt.toISOString()];
    })];
    await recordAudit(req, 'EXPORT_CUSTOMERS', 'Customer', null, { filters: req.query, count: customers.length });
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="customers-${new Date().toISOString().slice(0, 10)}.csv"`);
    res.send(rows.map(row => row.map(escape).join(',')).join('\n'));
  } catch (error) {
    console.error('Failed to export customers:', error);
    res.status(500).json({ error: 'Failed to export customers' });
  }
};
