const prisma = require('../config/database');

const recordAudit = async (req, action, entity, entityId = null, metadata = null) => {
  if (!req.user?.id || req.user.role !== 'admin') return;
  await prisma.auditLog.create({ data: {
    adminId: req.user.id, action, entity, entityId, metadata,
    ipAddress: req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip,
  }}).catch(error => console.error('Audit log failed:', error.message));
};

module.exports = { recordAudit };
