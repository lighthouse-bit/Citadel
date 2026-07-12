// server/src/controllers/notificationController.js

const prisma = require('../config/database');
const { recordAudit } = require('../utils/auditService');

exports.createNotification = async (req, res) => {
  try {
    const { message, type = 'SYSTEM', link } = req.body;
    if (!message?.trim()) return res.status(400).json({ error: 'Message is required' });
    const notification = await prisma.notification.create({ data: { message: message.trim().slice(0, 500), type, link: link?.trim() || null, adminId: req.user.id } });
    await recordAudit(req, 'CREATE_NOTIFICATION', 'Notification', notification.id, { type, link });
    res.status(201).json(notification);
  } catch (error) { res.status(500).json({ error: 'Failed to create notification' }); }
};

exports.getNotifications = async (req, res) => {
  try {
    const notifications = await prisma.notification.findMany({
      orderBy: { createdAt: 'desc' },
      take: 30,
    });

    const unreadCount = await prisma.notification.count({
      where: { isRead: false }
    });

    res.json({ 
      notifications, 
      unreadCount 
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
};

exports.markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.notification.update({
      where: { id },
      data: { isRead: true }
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to mark as read' });
  }
};

exports.markAllAsRead = async (req, res) => {
  try {
    await prisma.notification.updateMany({
      where: { isRead: false },
      data: { isRead: true }
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to mark all as read' });
  }
};

exports.deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.notification.delete({ where: { id } });
    await recordAudit(req, 'DELETE_NOTIFICATION', 'Notification', id);
    res.json({ success: true });
  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(500).json({ error: 'Failed to delete notification' });
  }
};
