const crypto = require('crypto');

const secret = () => {
  if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET is not configured');
  return process.env.JWT_SECRET;
};

const signAlertToken = (purpose, customerId, alertId = '') => {
  const payload = Buffer.from(JSON.stringify({ purpose, customerId, alertId })).toString('base64url');
  const signature = crypto.createHmac('sha256', secret()).update(payload).digest('base64url');
  return `${payload}.${signature}`;
};

const verifyAlertToken = (token, expectedPurpose) => {
  const [payload, suppliedSignature] = String(token || '').split('.');
  if (!payload || !suppliedSignature) return null;
  const expectedSignature = crypto.createHmac('sha256', secret()).update(payload).digest('base64url');
  const supplied = Buffer.from(suppliedSignature);
  const expected = Buffer.from(expectedSignature);
  if (supplied.length !== expected.length || !crypto.timingSafeEqual(supplied, expected)) return null;
  try {
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    return decoded.purpose === expectedPurpose ? decoded : null;
  } catch {
    return null;
  }
};

module.exports = { signAlertToken, verifyAlertToken };
