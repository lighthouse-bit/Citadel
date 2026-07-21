const router = require('express').Router();
const controller = require('../controllers/uploadController');
const { authenticateUser } = require('../middleware/auth');

const attempts = new Map();
const uploadRateLimit = (req, res, next) => {
  const now = Date.now();
  const key = req.ip;
  let entry = attempts.get(key);
  if (!entry || entry.resetAt < now) entry = { count: 0, resetAt: now + 15 * 60 * 1000 };
  entry.count += 1;
  attempts.set(key, entry);
  if (entry.count > 30) return res.status(429).json({ error: 'Too many upload attempts. Please try again later.' });
  return next();
};

router.post('/signature', authenticateUser, uploadRateLimit, controller.createSignature);

module.exports = router;
