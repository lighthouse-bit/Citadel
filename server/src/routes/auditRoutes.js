const router = require('express').Router();
const prisma = require('../config/database');
const { authenticateAdmin } = require('../middleware/auth');
router.get('/', authenticateAdmin, async (req, res) => {
  const { entity, page = 1, limit = 50 } = req.query;
  const where = entity ? { entity } : {};
  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({ where, include: { admin: { select: { name: true, email: true } } }, orderBy: { createdAt: 'desc' }, skip: (Number(page)-1)*Number(limit), take: Number(limit) }),
    prisma.auditLog.count({ where }),
  ]);
  res.json({ logs, total });
});
module.exports = router;
