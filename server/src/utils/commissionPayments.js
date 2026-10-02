const USD_TO_NGN = 1600;

const roundMoney = value => Math.round((Number(value) + Number.EPSILON) * 100) / 100;

const getCommissionAmounts = commission => {
  const finalPrice = roundMoney(commission.finalPrice || 0);
  const depositPercentage = Number(commission.depositPercentage || 70);
  const configuredDeposit = commission.depositAmount == null ? null : Number(commission.depositAmount);
  const depositAmount = roundMoney(configuredDeposit ?? (finalPrice * depositPercentage) / 100);
  const configuredBalance = commission.balanceAmount == null ? null : Number(commission.balanceAmount);
  const balanceAmount = roundMoney(configuredBalance ?? (finalPrice - depositAmount));

  return { finalPrice, depositPercentage, depositAmount, balanceAmount };
};

const getCommissionPaymentSpec = (commission, paymentType) => {
  const amounts = getCommissionAmounts(commission);
  if (paymentType === 'commission_deposit') {
    return {
      type: 'deposit',
      metadataType: paymentType,
      amount: amounts.depositAmount,
      reference: commission.depositPaymentIntentId,
      settled: ['DEPOSIT_PAID', 'FULLY_PAID'].includes(commission.paymentStatus),
      canInitialize: commission.status === 'ACCEPTED' && commission.paymentStatus === 'UNPAID',
      ...amounts,
    };
  }
  if (paymentType === 'commission_balance') {
    return {
      type: 'balance',
      metadataType: paymentType,
      amount: amounts.balanceAmount,
      reference: commission.balancePaymentIntentId,
      settled: commission.paymentStatus === 'FULLY_PAID',
      canInitialize: commission.status === 'COMPLETED' && commission.paymentStatus === 'DEPOSIT_PAID',
      ...amounts,
    };
  }
  return null;
};

const validateCommissionPayment = ({ commission, paymentData, paymentType }) => {
  const spec = getCommissionPaymentSpec(commission, paymentType);
  if (!spec) return { ok: false, error: 'Unknown commission payment type' };

  const metadata = paymentData?.metadata || {};
  const expectedAmount = Math.round(spec.amount * USD_TO_NGN * 100);
  const referenceMatches = typeof paymentData?.reference === 'string'
    && paymentData.reference === spec.reference;
  const metadataMatches = metadata.paymentType === paymentType
    && metadata.commissionId === commission.id;
  const amountMatches = Number(paymentData?.amount) === expectedAmount;
  const currencyMatches = String(paymentData?.currency || '').toUpperCase() === 'NGN';

  if (!referenceMatches || !metadataMatches || !amountMatches || !currencyMatches) {
    return {
      ok: false,
      error: 'Payment details do not match this commission',
      expectedAmount,
      receivedAmount: paymentData?.amount,
      referenceMatches,
      metadataMatches,
      currencyMatches,
    };
  }

  return { ok: true, spec, expectedAmount };
};

module.exports = {
  USD_TO_NGN,
  getCommissionAmounts,
  getCommissionPaymentSpec,
  validateCommissionPayment,
};
