const prisma = require('../config/database');
const { recordAudit } = require('../utils/auditService');
const { createCustomerNotification } = require('../services/customerNotificationService');

const TYPES = ['ACCESS', 'DELETION', 'RECTIFICATION', 'OBJECTION', 'PORTABILITY'];
const STATUSES = ['PENDING', 'IN_REVIEW', 'COMPLETED', 'REJECTED'];
const clean = (value, max) => String(value || '').trim().slice(0, max);

exports.createRequest = async (req, res) => {
  try {
    const type = clean(req.body.type, 30).toUpperCase();
    const details = clean(req.body.details, 2000) || null;
    if (!TYPES.includes(type)) return res.status(400).json({ error: 'Choose a valid privacy request type' });
    const existing = await prisma.privacyRequest.findFirst({
      where: { customerId: req.user.id, type, status: { in: ['PENDING', 'IN_REVIEW'] } },
    });
    if (existing) return res.status(409).json({ error: 'You already have an active request of this type' });
    const request = await prisma.privacyRequest.create({ data: { customerId: req.user.id, type, details } });
    await prisma.notification.create({
      data: { type: 'SYSTEM', message: `New ${type.toLowerCase()} privacy request`, link: '/admin/privacy-requests' },
    }).catch(() => {});
    return res.status(201).json(request);
  } catch (error) {
    console.error('Failed to create privacy request:', error);
    return res.status(500).json({ error: 'Failed to submit privacy request' });
  }
};

exports.listOwnRequests = async (req, res) => {
  try {
    const requests = await prisma.privacyRequest.findMany({
      where: { customerId: req.user.id },
      select: { id: true, type: true, status: true, details: true, response: true, createdAt: true, updatedAt: true, resolvedAt: true },
      orderBy: { createdAt: 'desc' },
    });
    return res.json(requests);
  } catch (error) {
    console.error('Failed to list privacy requests:', error);
    return res.status(500).json({ error: 'Failed to load privacy requests' });
  }
};

exports.listAdminRequests = async (req, res) => {
  try {
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100);
    const status = clean(req.query.status, 30).toUpperCase();
    const type = clean(req.query.type, 30).toUpperCase();
    const search = clean(req.query.search, 160);
    const where = {
      ...(STATUSES.includes(status) && { status }),
      ...(TYPES.includes(type) && { type }),
      ...(search && { customer: { is: { OR: [
        { email: { contains: search, mode: 'insensitive' } },
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
      ] } } }),
    };
    const [items, total] = await Promise.all([
      prisma.privacyRequest.findMany({
        where,
        include: {
          customer: { select: { id: true, email: true, firstName: true, lastName: true } },
          handledBy: { select: { id: true, name: true, email: true } },
        },
        orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.privacyRequest.count({ where }),
    ]);
    return res.json({ items, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (error) {
    console.error('Failed to list admin privacy requests:', error);
    return res.status(500).json({ error: 'Failed to load privacy requests' });
  }
};

exports.updateRequest = async (req, res) => {
  try {
    const status = clean(req.body.status, 30).toUpperCase();
    const response = clean(req.body.response, 4000) || null;
    if (!STATUSES.includes(status) || status === 'PENDING') return res.status(400).json({ error: 'Choose a valid workflow status' });
    if (['COMPLETED', 'REJECTED'].includes(status) && !response) return res.status(400).json({ error: 'A customer-facing response is required to close a request' });
    const existing = await prisma.privacyRequest.findUnique({ where: { id: req.params.id }, include: { customer: true } });
    if (!existing) return res.status(404).json({ error: 'Privacy request not found' });
    const item = await prisma.privacyRequest.update({
      where: { id: existing.id },
      data: {
        status,
        response,
        handledById: req.user.id,
        resolvedAt: ['COMPLETED', 'REJECTED'].includes(status) ? new Date() : null,
      },
      include: {
        customer: { select: { id: true, email: true, firstName: true, lastName: true } },
        handledBy: { select: { id: true, name: true, email: true } },
      },
    });
    await recordAudit(req, 'UPDATE_PRIVACY_REQUEST', 'PrivacyRequest', item.id, { from: existing.status, to: status, type: item.type, customerId: item.customerId });
    await createCustomerNotification({
      customerId: item.customerId,
      type: 'SYSTEM',
      message: `Your ${item.type.toLowerCase()} privacy request is now ${status.toLowerCase().replace('_', ' ')}.`,
      link: '/account?tab=settings',
      dedupeMinutes: 1,
    }).catch(() => {});
    return res.json(item);
  } catch (error) {
    console.error('Failed to update privacy request:', error);
    return res.status(500).json({ error: 'Failed to update privacy request' });
  }
};
