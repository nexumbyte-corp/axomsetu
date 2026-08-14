import Decimal from 'decimal.js';

// Set precision for currency math
Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

export const toDecimal = (val) => new Decimal(val || 0);

export const addMoney = (a, b) => toDecimal(a).plus(toDecimal(b));

export const subtractMoney = (a, b) => toDecimal(a).minus(toDecimal(b));

export const multiplyMoney = (a, b) => toDecimal(a).times(toDecimal(b));

export const divideMoney = (a, b) => {
  const divisor = toDecimal(b);
  if (divisor.isZero()) return new Decimal(0);
  return toDecimal(a).dividedBy(divisor);
};

export const formatMoney = (val) => {
  return toDecimal(val).toFixed(2);
};

export const isGreaterOrEqual = (a, b) => toDecimal(a).greaterThanOrEqualTo(toDecimal(b));

export const isLessThan = (a, b) => toDecimal(a).lessThan(toDecimal(b));

export const isZeroMoney = (val) => toDecimal(val).isZero();
