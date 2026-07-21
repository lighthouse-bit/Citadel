const test = require('node:test');
const assert = require('node:assert/strict');
const controller = require('../src/controllers/uploadController');

const response = () => {
  const result = { statusCode: 200, body: null };
  result.status = code => { result.statusCode = code; return result; };
  result.json = body => { result.body = body; return result; };
  return result;
};

test('upload signatures fail clearly when server Cloudinary settings are missing', () => {
  const previous = {
    cloud: process.env.CLOUDINARY_CLOUD_NAME,
    key: process.env.CLOUDINARY_API_KEY,
    secret: process.env.CLOUDINARY_API_SECRET,
  };
  delete process.env.CLOUDINARY_CLOUD_NAME;
  delete process.env.CLOUDINARY_API_KEY;
  delete process.env.CLOUDINARY_API_SECRET;
  const res = response();
  controller.createSignature({ body: {} }, res);
  assert.equal(res.statusCode, 503);
  assert.match(res.body.error, /not configured/i);
  if (previous.cloud) process.env.CLOUDINARY_CLOUD_NAME = previous.cloud;
  if (previous.key) process.env.CLOUDINARY_API_KEY = previous.key;
  if (previous.secret) process.env.CLOUDINARY_API_SECRET = previous.secret;
});

test('upload signatures restrict files to approved Citadel folders', () => {
  const previous = {
    cloud: process.env.CLOUDINARY_CLOUD_NAME,
    key: process.env.CLOUDINARY_API_KEY,
    secret: process.env.CLOUDINARY_API_SECRET,
  };
  process.env.CLOUDINARY_CLOUD_NAME = 'test-cloud';
  process.env.CLOUDINARY_API_KEY = 'test-key';
  process.env.CLOUDINARY_API_SECRET = 'test-secret';
  const res = response();
  controller.createSignature({ body: { folder: '../../outside' } }, res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.folder, 'citadel/customer-uploads');
  assert.ok(res.body.signature);
  if (previous.cloud) process.env.CLOUDINARY_CLOUD_NAME = previous.cloud; else delete process.env.CLOUDINARY_CLOUD_NAME;
  if (previous.key) process.env.CLOUDINARY_API_KEY = previous.key; else delete process.env.CLOUDINARY_API_KEY;
  if (previous.secret) process.env.CLOUDINARY_API_SECRET = previous.secret; else delete process.env.CLOUDINARY_API_SECRET;
});
