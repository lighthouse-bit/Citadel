const test = require('node:test');
const assert = require('node:assert/strict');
const { helpers } = require('../src/controllers/comprehensiveAnalyticsController');

test('percentage safely handles totals and rounds to one decimal', () => {
  assert.equal(helpers.percentage(25, 100), 25);
  assert.equal(helpers.percentage(1, 3), 33.3);
  assert.equal(helpers.percentage(5, 0), 0);
});

test('change compares equal periods and handles a zero baseline', () => {
  assert.equal(helpers.change(150, 100), 50);
  assert.equal(helpers.change(75, 100), -25);
  assert.equal(helpers.change(1, 0), 100);
  assert.equal(helpers.change(0, 0), 0);
});
