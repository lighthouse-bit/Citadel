// server/src/utils/helpers.js
const { randomUUID } = require('crypto');

exports.generateOrderNumber = () => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = randomUUID().substring(0, 4).toUpperCase();
  return `ORD-${timestamp}-${random}`;
};

exports.generateCommissionNumber = () => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = randomUUID().substring(0, 4).toUpperCase();
  return `COM-${timestamp}-${random}`;
};
