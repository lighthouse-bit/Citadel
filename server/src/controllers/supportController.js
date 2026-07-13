const crypto = require('crypto');
const prisma = require('../config/database');
const { createCustomerNotification } = require('../services/customerNotificationService');
const { recordAudit } = require('../utils/auditService');

const CATEGORIES = ['ORDER', 'DELIVERY', 'DAMAGE', 'PAYMENT', 'COMMISSION', 'ACCOUNT', 'OTHER'];
const STATUSES = ['OPEN', 'IN_PROGRESS', 'WAITING_FOR_CUSTOMER', 'RESOLVED', 'CLOSED'];
const PRIORITIES = ['LOW', 'NORMAL', 'HIGH', 'URGENT'];
const summaryInclude = {
  customer: { select: { id: true, firstName: true, lastName: true, email: true } },
  order: { select: { id: true, orderNumber: true } },
  commission: { select: { id: true, commissionNumber: true } },
  assignedAdmin: { select: { id: true, name: true, email: true } },
  _count: { select: { messages: true } },
};
const detailInclude = {
  ...summaryInclude,
  messages: {
    orderBy: { createdAt: 'asc' },
    include: {
      attachments: true,
      customer: { select: { firstName: true, lastName: true } },
      admin: { select: { name: true } },
    },
  },
};

const cleanAttachments = attachments => Array.isArray(attachments) ? attachments.slice(0, 5).map(item => ({
  url: String(item.url || '').trim(),
  publicId: item.publicId ? String(item.publicId).slice(0, 300) : null,
  name: item.name ? String(item.name).slice(0, 180) : null,
})).filter(item => /^https:\/\//i.test(item.url)) : [];

const messageData = ({ body, attachments, ticketId, authorType, customerId, adminId }) => ({
  body: String(body).trim().slice(0, 5000), ticketId, authorType, customerId, adminId,
  attachments: { create: cleanAttachments(attachments) },
});

exports.listCustomerTickets = async (req, res) => {
  try {
    const where = { customerId: req.user.id };
    if (req.query.status) where.status = String(req.query.status).toUpperCase();
    const tickets = await prisma.supportTicket.findMany({ where, include: summaryInclude, orderBy: { updatedAt: 'desc' }, take: 100 });
    res.json({ tickets });
  } catch (error) {
    console.error('List customer support tickets error:', error);
    res.status(500).json({ error: 'Failed to load support tickets' });
  }
};

exports.createTicket = async (req, res) => {
  try {
    const subject = String(req.body.subject || '').trim();
    const body = String(req.body.message || '').trim();
    const category = String(req.body.category || 'OTHER').toUpperCase();
    if (subject.length < 4 || subject.length > 150) return res.status(400).json({ error: 'Subject must be between 4 and 150 characters' });
    if (body.length < 10) return res.status(400).json({ error: 'Please provide at least 10 characters of detail' });
    if (!CATEGORIES.includes(category)) return res.status(400).json({ error: 'Invalid support category' });

    const orderId = req.body.orderId || null;
    const commissionId = req.body.commissionId || null;
    if (orderId) {
      const owned = await prisma.order.count({ where: { id: orderId, customerId: req.user.id } });
      if (!owned) return res.status(400).json({ error: 'The selected order was not found' });
    }
    if (commissionId) {
      const owned = await prisma.commission.count({ where: { id: commissionId, customerId: req.user.id } });
      if (!owned) return res.status(400).json({ error: 'The selected commission was not found' });
    }

    const ticketNumber = `SUP-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
    const ticket = await prisma.supportTicket.create({
      data: {
        ticketNumber, subject: subject.slice(0, 150), category, customerId: req.user.id, orderId, commissionId,
        messages: { create: messageData({ body, attachments: req.body.attachments, authorType: 'CUSTOMER', customerId: req.user.id }) },
      },
      include: detailInclude,
    });
    await prisma.notification.create({ data: { type: 'SUPPORT', message: `New support ticket ${ticket.ticketNumber}: ${ticket.subject}`, link: `/admin/support/${ticket.id}` } }).catch(() => null);
    res.status(201).json(ticket);
  } catch (error) {
    console.error('Create support ticket error:', error);
    res.status(500).json({ error: 'Failed to create support ticket' });
  }
};

exports.getCustomerTicket = async (req, res) => {
  try {
    const ticket = await prisma.supportTicket.findFirst({ where: { id: req.params.id, customerId: req.user.id }, include: detailInclude });
    if (!ticket) return res.status(404).json({ error: 'Support ticket not found' });
    res.json(ticket);
  } catch (error) {
    res.status(500).json({ error: 'Failed to load support ticket' });
  }
};

exports.replyAsCustomer = async (req, res) => {
  try {
    const body = String(req.body.message || '').trim();
    if (!body) return res.status(400).json({ error: 'Message is required' });
    const ticket = await prisma.supportTicket.findFirst({ where: { id: req.params.id, customerId: req.user.id } });
    if (!ticket) return res.status(404).json({ error: 'Support ticket not found' });
    if (ticket.status === 'CLOSED') return res.status(409).json({ error: 'This ticket is closed. Please open a new request.' });

    const [message] = await prisma.$transaction([
      prisma.supportMessage.create({ data: messageData({ body, attachments: req.body.attachments, ticketId: ticket.id, authorType: 'CUSTOMER', customerId: req.user.id }), include: { attachments: true, customer: { select: { firstName: true, lastName: true } } } }),
      prisma.supportTicket.update({ where: { id: ticket.id }, data: { status: ticket.status === 'RESOLVED' ? 'OPEN' : ticket.status, resolvedAt: ticket.status === 'RESOLVED' ? null : ticket.resolvedAt } }),
    ]);
    await prisma.notification.create({ data: { type: 'SUPPORT', message: `Customer replied to ${ticket.ticketNumber}`, link: `/admin/support/${ticket.id}` } }).catch(() => null);
    res.status(201).json(message);
  } catch (error) {
    console.error('Customer support reply error:', error);
    res.status(500).json({ error: 'Failed to send reply' });
  }
};

exports.closeCustomerTicket = async (req, res) => {
  try {
    const result = await prisma.supportTicket.updateMany({ where: { id: req.params.id, customerId: req.user.id }, data: { status: 'CLOSED', resolvedAt: new Date() } });
    if (!result.count) return res.status(404).json({ error: 'Support ticket not found' });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to close support ticket' });
  }
};

exports.listAdminTickets = async (req, res) => {
  try {
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(req.query.limit) || 30, 1), 100);
    const where = {};
    if (req.query.status && req.query.status !== 'ALL') where.status = String(req.query.status).toUpperCase();
    if (req.query.priority && req.query.priority !== 'ALL') where.priority = String(req.query.priority).toUpperCase();
    if (req.query.search) where.OR = [
      { ticketNumber: { contains: req.query.search, mode: 'insensitive' } },
      { subject: { contains: req.query.search, mode: 'insensitive' } },
      { customer: { email: { contains: req.query.search, mode: 'insensitive' } } },
    ];
    const [tickets, total] = await prisma.$transaction([
      prisma.supportTicket.findMany({ where, include: summaryInclude, orderBy: [{ priority: 'desc' }, { updatedAt: 'desc' }], skip: (page - 1) * limit, take: limit }),
      prisma.supportTicket.count({ where }),
    ]);
    res.json({ tickets, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (error) {
    console.error('List admin support tickets error:', error);
    res.status(500).json({ error: 'Failed to load support queue' });
  }
};

exports.getAdminTicket = async (req, res) => {
  try {
    const ticket = await prisma.supportTicket.findUnique({ where: { id: req.params.id }, include: detailInclude });
    if (!ticket) return res.status(404).json({ error: 'Support ticket not found' });
    res.json(ticket);
  } catch (error) {
    res.status(500).json({ error: 'Failed to load support ticket' });
  }
};

exports.updateAdminTicket = async (req, res) => {
  try {
    const data = {};
    if (req.body.status !== undefined) {
      const status = String(req.body.status).toUpperCase();
      if (!STATUSES.includes(status)) return res.status(400).json({ error: 'Invalid ticket status' });
      data.status = status;
      data.resolvedAt = ['RESOLVED', 'CLOSED'].includes(status) ? new Date() : null;
    }
    if (req.body.priority !== undefined) {
      const priority = String(req.body.priority).toUpperCase();
      if (!PRIORITIES.includes(priority)) return res.status(400).json({ error: 'Invalid ticket priority' });
      data.priority = priority;
    }
    if (req.body.assignToMe === true) data.assignedAdminId = req.user.id;
    if (!Object.keys(data).length) return res.status(400).json({ error: 'No changes supplied' });
    const existing = await prisma.supportTicket.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: 'Support ticket not found' });
    const ticket = await prisma.supportTicket.update({ where: { id: existing.id }, data, include: detailInclude });
    await recordAudit(req, 'UPDATE_SUPPORT_TICKET', 'SupportTicket', ticket.id, data);
    if (data.status && data.status !== existing.status) {
      await createCustomerNotification({ customerId: ticket.customerId, type: 'SUPPORT', message: `${ticket.ticketNumber} is now ${data.status.replaceAll('_', ' ').toLowerCase()}.`, link: `/account?tab=support&ticket=${ticket.id}` }).catch(() => null);
    }
    res.json(ticket);
  } catch (error) {
    console.error('Update support ticket error:', error);
    res.status(500).json({ error: 'Failed to update support ticket' });
  }
};

exports.replyAsAdmin = async (req, res) => {
  try {
    const body = String(req.body.message || '').trim();
    if (!body) return res.status(400).json({ error: 'Message is required' });
    const ticket = await prisma.supportTicket.findUnique({ where: { id: req.params.id } });
    if (!ticket) return res.status(404).json({ error: 'Support ticket not found' });
    const [message] = await prisma.$transaction([
      prisma.supportMessage.create({ data: messageData({ body, attachments: req.body.attachments, ticketId: ticket.id, authorType: 'ADMIN', adminId: req.user.id }), include: { attachments: true, admin: { select: { name: true } } } }),
      prisma.supportTicket.update({ where: { id: ticket.id }, data: { status: 'WAITING_FOR_CUSTOMER', assignedAdminId: ticket.assignedAdminId || req.user.id, resolvedAt: null } }),
    ]);
    await createCustomerNotification({ customerId: ticket.customerId, type: 'SUPPORT', message: `Support replied to ${ticket.ticketNumber}.`, link: `/account?tab=support&ticket=${ticket.id}` }).catch(() => null);
    await recordAudit(req, 'REPLY_SUPPORT_TICKET', 'SupportTicket', ticket.id);
    res.status(201).json(message);
  } catch (error) {
    console.error('Admin support reply error:', error);
    res.status(500).json({ error: 'Failed to send reply' });
  }
};
