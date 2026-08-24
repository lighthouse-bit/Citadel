const crypto = require('crypto');
const prisma = require('../config/database');

const FIELD_LIMITS = Object.freeze({
  name: 100,
  email: 254,
  subject: 160,
  message: 5000,
});

const ALLOWED_FIELDS = new Set([
  'name', 'email', 'subject', 'message', 'website', 'formElapsedMs',
]);

const CONTROL_CHARACTERS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/;
const HEADER_LINE_BREAKS = /[\r\n]/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const validationFailure = error => ({ ok: false, error });

const normalizeContactPayload = body => {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return validationFailure('Invalid contact form submission');
  }

  if (Object.keys(body).some(field => !ALLOWED_FIELDS.has(field))) {
    return validationFailure('Invalid contact form fields');
  }

  if (body.website !== undefined && typeof body.website !== 'string') {
    return validationFailure('Invalid contact form submission');
  }

  if (typeof body.formElapsedMs !== 'number' || !Number.isFinite(body.formElapsedMs)) {
    return validationFailure('Invalid contact form submission');
  }

  for (const field of ['name', 'email', 'subject', 'message']) {
    if (body[field] !== undefined && typeof body[field] !== 'string') {
      return validationFailure(`${field} must be text`);
    }
  }

  const name = (body.name || '').trim();
  const email = (body.email || '').trim().toLowerCase();
  const subject = (body.subject || '').trim();
  const message = (body.message || '').trim();

  if (name.length < 2 || message.length < 5 || !email) {
    return validationFailure('Name, email and a meaningful message are required');
  }

  for (const [field, value] of Object.entries({ name, email, subject, message })) {
    if (value.length > FIELD_LIMITS[field]) {
      return validationFailure(`${field} is too long`);
    }
    if (CONTROL_CHARACTERS.test(value)) {
      return validationFailure(`${field} contains unsupported characters`);
    }
  }

  if (HEADER_LINE_BREAKS.test(name) || HEADER_LINE_BREAKS.test(email) || HEADER_LINE_BREAKS.test(subject)) {
    return validationFailure('Contact headers cannot contain line breaks');
  }

  if (!EMAIL_PATTERN.test(email)) {
    return validationFailure('Please provide a valid email address');
  }

  return { ok: true, data: { name, email, subject, message } };
};

const isHoneypotTriggered = body => typeof body?.website === 'string' && body.website.trim().length > 0;

const hasHumanCompletionTime = body => {
  const elapsedMs = body?.formElapsedMs;
  return typeof elapsedMs === 'number' && Number.isFinite(elapsedMs) && elapsedMs >= 1500;
};

const getClientIp = req => {
  const forwarded = req.get?.('x-vercel-forwarded-for') || req.get?.('x-forwarded-for');
  if (forwarded) return String(forwarded).split(',')[0].trim();
  return req.ip || req.socket?.remoteAddress || 'unknown';
};

const rateLimitKey = (scope, value) => {
  const secret = process.env.CONTACT_RATE_LIMIT_SALT || process.env.JWT_SECRET || 'highmarc-local-contact-limit';
  return crypto.createHmac('sha256', secret).update(`${scope}:${value}`).digest('hex');
};

const consumeRule = async ({ scope, value, limit, windowMs }) => {
  const key = rateLimitKey(scope, value);
  const cutoff = new Date(Date.now() - windowMs);
  const rows = await prisma.$queryRaw`
    INSERT INTO "ContactRateLimit" ("key", "count", "windowStart", "updatedAt")
    VALUES (${key}, 1, NOW(), NOW())
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE
        WHEN "ContactRateLimit"."windowStart" <= ${cutoff} THEN 1
        ELSE "ContactRateLimit"."count" + 1
      END,
      "windowStart" = CASE
        WHEN "ContactRateLimit"."windowStart" <= ${cutoff} THEN NOW()
        ELSE "ContactRateLimit"."windowStart"
      END,
      "updatedAt" = NOW()
    RETURNING "count", "windowStart"
  `;
  const record = rows[0];
  const retryAfter = Math.max(1, Math.ceil((new Date(record.windowStart).getTime() + windowMs - Date.now()) / 1000));
  return { allowed: record.count <= limit, retryAfter };
};

const enforceContactRateLimit = async ({ ip, email }) => {
  const rules = [
    { scope: 'ip', value: ip, limit: 5, windowMs: 15 * 60 * 1000 },
    { scope: 'email', value: email, limit: 3, windowMs: 60 * 60 * 1000 },
  ];

  for (const rule of rules) {
    const result = await consumeRule(rule);
    if (!result.allowed) return result;
  }

  if (Math.random() < 0.01) {
    prisma.contactRateLimit.deleteMany({
      where: { updatedAt: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
    }).catch(() => {});
  }

  return { allowed: true, retryAfter: 0 };
};

module.exports = {
  FIELD_LIMITS,
  normalizeContactPayload,
  isHoneypotTriggered,
  hasHumanCompletionTime,
  getClientIp,
  enforceContactRateLimit,
};
