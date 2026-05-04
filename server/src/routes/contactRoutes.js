// server/src/routes/contactRoutes.js
const express = require('express');
const router  = express.Router();
const { sendContactEmail } = require('../utils/emailService');

router.post('/', async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;

    // ✅ Validate required fields
    if (!name || !email || !message) {
      return res.status(400).json({
        error: 'Name, email and message are required',
      });
    }

    // ✅ Basic email format check
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        error: 'Please provide a valid email address',
      });
    }

    // ✅ Send both emails
    await sendContactEmail({ name, email, subject, message });

    res.status(200).json({
      message: 'Message sent successfully',
    });
  } catch (error) {
    console.error('Contact form error:', error);
    res.status(500).json({
      error: 'Failed to send message. Please try again.',
    });
  }
});

module.exports = router;