const prisma = require('../config/database');
const { recordAudit } = require('../utils/auditService');

exports.getCustomers = async (req, res) => {
  try {
    const { search = '', verified, suspended, page = 1, limit = 25 } = req.query;
    const where = {
      ...(search && { OR: [
        { email: { contains: search, mode: 'insensitive' } },
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
      ]}),
      ...(verified !== undefined && { isVerified: verified === 'true' }),
      ...(suspended !== undefined && { isSuspended: suspended === 'true' }),
    };
    const skip = (Number(page) - 1) * Number(limit);
    const [customers, total] = await Promise.all([
      prisma.customer.findMany({ where, skip, take: Number(limit), orderBy: { createdAt: 'desc' },
        select: { id: true, email: true, firstName: true, lastName: true, phone: true, isVerified: true, isSuspended: true, adminNotes: true, createdAt: true,
          orders: { select: { total: true } }, _count: { select: { orders: true, commissions: true } } } }),
      prisma.customer.count({ where }),
    ]);
    res.json({ customers: customers.map(c => ({ ...c, lifetimeValue: c.orders.reduce((sum, o) => sum + Number(o.total), 0), orders: undefined })), pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / Number(limit)) } });
  } catch (error) { console.error(error); res.status(500).json({ error: 'Failed to fetch customers' }); }
};

exports.getCustomer = async (req, res) => {
  const customer = await prisma.customer.findUnique({ where: { id: req.params.id }, include: { addresses: true, orders: { orderBy: { createdAt: 'desc' }, take: 20 }, commissions: { orderBy: { createdAt: 'desc' }, take: 20 } } });
  if (!customer) return res.status(404).json({ error: 'Customer not found' });
  const { password, verificationToken, ...safeCustomer } = customer;
  res.json(safeCustomer);
};

exports.updateCustomer = async (req, res) => {
  try {
    const data = {};
    if (req.body.adminNotes !== undefined) data.adminNotes = req.body.adminNotes;
    if (req.body.isSuspended !== undefined) data.isSuspended = Boolean(req.body.isSuspended);
    const customer = await prisma.customer.update({ where: { id: req.params.id }, data, select: { id: true, email: true, firstName: true, lastName: true, isVerified: true, isSuspended: true, adminNotes: true } });
    await recordAudit(req, 'UPDATE_CUSTOMER', 'Customer', customer.id, data);
    res.json(customer);
  } catch (error) { console.error(error); res.status(500).json({ error: 'Failed to update customer' }); }
};
