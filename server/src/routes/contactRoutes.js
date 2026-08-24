const express = require('express');
const router = express.Router();
const { sendContactEmail } = require('../utils/emailService');
const {
  normalizeContactPayload,
  isHoneypotTriggered,
  hasHumanCompletionTime,
  getClientIp,
  enforceContactRateLimit,
} = require('../utils/contactSecurity');

router.post('/', async (req, res) => {
  try {
    res.setHeader('Cache-Control', 'no-store');

    // Silently accept honeypot submissions so simple bots do not learn how to bypass it.
    if (isHoneypotTriggered(req.body)) {
      return res.status(200).json({ message: 'Message sent successfully' });
    }

    if (!hasHumanCompletionTime(req.body)) {
      res.setHeader('Retry-After', '2');
      return res.status(429).json({ error: 'Please wait a moment before submitting the form' });
    }

    const validated = normalizeContactPayload(req.body);
    if (!validated.ok) return res.status(400).json({ error: validated.error });

    const rateLimit = await enforceContactRateLimit({
      ip: getClientIp(req),
      email: validated.data.email,
    });
    if (!rateLimit.allowed) {
      res.setHeader('Retry-After', String(rateLimit.retryAfter));
      return res.status(429).json({ error: 'Too many messages. Please try again later.' });
    }

    await sendContactEmail(validated.data);
    return res.status(200).json({ message: 'Message sent successfully' });
  } catch (error) {
    console.error('Contact form error:', error);
    return res.status(503).json({ error: 'Failed to send message. Please try again.' });
  }
});

module.exports = router;
