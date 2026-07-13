const prisma = require('../config/database');

const ownerWhere = req => ({ customerId: req.user.id });

exports.list = async (req, res) => {
  try {
    const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 50);
    const page = Math.max(Number(req.query.page) || 1, 1);
    const where = ownerWhere(req);
    if (req.query.unread === 'true') where.isRead = false;
    if (req.query.type) where.type = String(req.query.type).toUpperCase();

    const [notifications, unreadCount, total] = await prisma.$transaction([
      prisma.notification.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit }),
      prisma.notification.count({ where: { ...ownerWhere(req), isRead: false } }),
      prisma.notification.count({ where }),
    ]);
    res.json({ notifications, unreadCount, total, page, pages: Math.ceil(total / limit) });
  } catch (error) {
    console.error('Get customer notifications error:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
};

exports.markAsRead = async (req, res) => {
  try {
    const result = await prisma.notification.updateMany({
      where: { id: req.params.id, ...ownerWhere(req) },
      data: { isRead: true },
    });
    if (!result.count) return res.status(404).json({ error: 'Notification not found' });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
};

exports.markAllAsRead = async (req, res) => {
  try {
    await prisma.notification.updateMany({ where: { ...ownerWhere(req), isRead: false }, data: { isRead: true } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to mark notifications as read' });
  }
};

exports.remove = async (req, res) => {
  try {
    const result = await prisma.notification.deleteMany({ where: { id: req.params.id, ...ownerWhere(req) } });
    if (!result.count) return res.status(404).json({ error: 'Notification not found' });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete notification' });
  }
};

exports.clear = async (req, res) => {
  try {
    const result = await prisma.notification.deleteMany({ where: ownerWhere(req) });
    res.json({ success: true, deleted: result.count });
  } catch (error) {
    res.status(500).json({ error: 'Failed to clear notifications' });
  }
};
