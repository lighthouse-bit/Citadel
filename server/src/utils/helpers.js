// server/src/utils/helpers.js
const { v4: uuidv4 } = require('uuid');

exports.generateOrderNumber = () => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = uuidv4().substring(0, 4).toUpperCase();
  return `ORD-${timestamp}-${random}`;
};

exports.generateCommissionNumber = () => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = uuidv4().substring(0, 4).toUpperCase();
  return `COM-${timestamp}-${random}`;
};