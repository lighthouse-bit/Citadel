const crypto = require('crypto');

const safeEqual = (left, right) => {
  const leftBuffer = Buffer.from(String(left || ''));
  const rightBuffer = Buffer.from(String(right || ''));
  return leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer);
};

const authenticateCron = (req, res, next) => {
  const secret = process.env.CRON_SECRET;
  if (!secret) return res.status(503).json({ error: 'Campaign worker is not configured' });
  const authorization = req.get('authorization') || '';
  if (!safeEqual(authorization, `Bearer ${secret}`)) return res.status(401).json({ error: 'Unauthorized' });
  next();
};

module.exports = { authenticateCron, safeEqual };
