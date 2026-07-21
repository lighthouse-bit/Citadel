import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getOptimizedImageUrl,
  getResponsiveImageSrcSet,
  isCloudinaryImage,
} from '../src/utils/cloudinaryImage.js';

const image = 'https://res.cloudinary.com/demo/image/upload/v123/artworks/example.jpg';

test('recognizes Cloudinary image delivery URLs', () => {
  assert.equal(isCloudinaryImage(image), true);
  assert.equal(isCloudinaryImage('https://example.com/example.jpg'), false);
});

test('adds automatic format, quality and a constrained width', () => {
  assert.equal(
    getOptimizedImageUrl(image, { width: 640 }),
    'https://res.cloudinary.com/demo/image/upload/f_auto,q_auto:good,w_640,c_limit/v123/artworks/example.jpg',
  );
});

test('creates a sorted responsive source set and leaves other hosts untouched', () => {
  const srcSet = getResponsiveImageSrcSet(image, [960, 320, 640]);

  assert.match(srcSet, /w_320,c_limit\/.* 320w/);
  assert.match(srcSet, /w_640,c_limit\/.* 640w/);
  assert.match(srcSet, /w_960,c_limit\/.* 960w/);
  assert.equal(getOptimizedImageUrl('https://example.com/example.jpg', { width: 320 }), 'https://example.com/example.jpg');
});
