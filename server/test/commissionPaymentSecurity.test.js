const test = require('node:test');
const assert = require('node:assert/strict');
const {
  USD_TO_NGN,
  getCommissionAmounts,
  getCommissionPaymentSpec,
  validateCommissionPayment,
} = require('../src/utils/commissionPayments');
const { authenticateCustomer, authenticateUser } = require('../src/middleware/auth');

const commission = {
  id: 'commission-1',
  customerId: 'customer-1',
  finalPrice: '5000.00',
  depositPercentage: 70,
  depositAmount: '3500.00',
  balanceAmount: '1500.00',
  status: 'ACCEPTED',
  paymentStatus: 'UNPAID',
  depositPaymentIntentId: 'deposit-reference',
  balancePaymentIntentId: null,
};

test('commission amounts use the accepted server-side quote', () => {
  assert.deepEqual(getCommissionAmounts(commission), {
    finalPrice: 5000,
    depositPercentage: 70,
    depositAmount: 3500,
    balanceAmount: 1500,
  });
});

test('deposit verification requires the stored reference, amount, currency, and metadata', () => {
  const paymentData = {
    reference: 'deposit-reference',
    amount: 3500 * USD_TO_NGN * 100,
    currency: 'NGN',
    metadata: { paymentType: 'commission_deposit', commissionId: 'commission-1' },
  };
  assert.equal(validateCommissionPayment({ commission, paymentData, paymentType: 'commission_deposit' }).ok, true);
  assert.equal(validateCommissionPayment({
    commission,
    paymentData: { ...paymentData, amount: paymentData.amount - 100 },
    paymentType: 'commission_deposit',
  }).ok, false);
  assert.equal(validateCommissionPayment({
    commission,
    paymentData: { ...paymentData, reference: 'another-reference' },
    paymentType: 'commission_deposit',
  }).ok, false);
});

test('balance payments become available only after completion and deposit payment', () => {
  const ready = {
    ...commission,
    status: 'COMPLETED',
    paymentStatus: 'DEPOSIT_PAID',
    balancePaymentIntentId: 'balance-reference',
  };
  assert.equal(getCommissionPaymentSpec(commission, 'commission_balance').canInitialize, false);
  assert.equal(getCommissionPaymentSpec(ready, 'commission_balance').canInitialize, true);
  assert.equal(getCommissionPaymentSpec({ ...ready, paymentStatus: 'FULLY_PAID' }, 'commission_balance').settled, true);
});

test('commission payment routes require customer authentication and expose the balance endpoint', () => {
  const router = require('../src/routes/paymentRoutes');
  const route = (path, method = 'post') => router.stack.find(
    layer => layer.route?.path === path && layer.route.methods[method],
  );
  assert.equal(route('/commission-deposit').route.stack[0].handle, authenticateCustomer);
  assert.equal(route('/commission-balance').route.stack[0].handle, authenticateCustomer);
  assert.equal(route('/verify').route.stack[0].handle, authenticateUser);
});
