const test = require('node:test');
const assert = require('node:assert/strict');
const {
  normalizeContactPayload,
  isHoneypotTriggered,
  hasHumanCompletionTime,
  getClientIp,
} = require('../src/utils/contactSecurity');

test('contact payloads are normalized and constrained on the server', () => {
  const result = normalizeContactPayload({
    name: '  Ada Lovelace  ',
    email: '  ADA@EXAMPLE.COM ',
    subject: ' A portrait enquiry ',
    message: '  Please tell me more.  ',
    website: '',
    formElapsedMs: 5000,
  });

  assert.equal(result.ok, true);
  assert.deepEqual(result.data, {
    name: 'Ada Lovelace',
    email: 'ada@example.com',
    subject: 'A portrait enquiry',
    message: 'Please tell me more.',
  });
});

test('contact payloads reject non-text fields, oversized content, and header injection', () => {
  const base = { name: 'Ada', email: 'ada@example.com', subject: '', message: 'Hello there' };
  assert.equal(normalizeContactPayload({ ...base, name: { value: 'Ada' } }).ok, false);
  assert.equal(normalizeContactPayload({ ...base, message: 'x'.repeat(5001) }).ok, false);
  assert.equal(normalizeContactPayload({ ...base, subject: 'Hello\nBcc: victim@example.com' }).ok, false);
  assert.equal(normalizeContactPayload({ ...base, unexpected: true }).ok, false);
  assert.equal(normalizeContactPayload({ ...base, website: [], formElapsedMs: 2000 }).ok, false);
  assert.equal(normalizeContactPayload({ ...base, website: '', formElapsedMs: '2000' }).ok, false);
});

test('contact bot signals detect filled honeypots and implausibly fast submissions', () => {
  assert.equal(isHoneypotTriggered({ website: 'https://spam.invalid' }), true);
  assert.equal(isHoneypotTriggered({ website: '' }), false);
  assert.equal(hasHumanCompletionTime({ formElapsedMs: 2000 }), true);
  assert.equal(hasHumanCompletionTime({ formElapsedMs: '2000' }), false);
  assert.equal(hasHumanCompletionTime({ formElapsedMs: 500 }), false);
  assert.equal(hasHumanCompletionTime({}), false);
});

test('contact throttling uses Vercel supplied client IP before socket fallbacks', () => {
  const req = {
    get: header => header === 'x-vercel-forwarded-for' ? '203.0.113.10' : undefined,
    ip: '127.0.0.1',
  };
  assert.equal(getClientIp(req), '203.0.113.10');
});

const contactHandler = () => {
  const router = require('../src/routes/contactRoutes');
  return router.stack.find(layer => layer.route?.path === '/').route.stack[0].handle;
};

const responseRecorder = () => {
  const state = { headers: {} };
  const res = {
    setHeader: (name, value) => { state.headers[name] = value; },
    status: value => { state.status = value; return res; },
    json: value => { state.body = value; return res; },
  };
  return { state, res };
};

test('contact honeypot submissions are discarded with a generic success response', async () => {
  const { state, res } = responseRecorder();
  await contactHandler()({ body: { website: 'spam.invalid' } }, res);
  assert.equal(state.status, 200);
  assert.equal(state.body.message, 'Message sent successfully');
});

test('contact submissions that are too fast are rejected before persistence or email', async () => {
  const { state, res } = responseRecorder();
  await contactHandler()({ body: { website: '', formElapsedMs: 200 } }, res);
  assert.equal(state.status, 429);
  assert.equal(state.headers['Retry-After'], '2');
});

test('malformed contact fields are rejected before rate-limit persistence', async () => {
  const { state, res } = responseRecorder();
  await contactHandler()({
    body: {
      website: '', formElapsedMs: 2000, name: ['Ada'],
      email: 'ada@example.com', subject: '', message: 'Hello there',
    },
  }, res);
  assert.equal(state.status, 400);
  assert.match(state.body.error, /must be text/i);
});
