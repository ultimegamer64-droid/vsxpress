const safeNumber = (val) => {
  if (val === null || val === undefined) return 0;
  const num = Number(val);
  return Number.isFinite(num) ? num : 0;
};

// rate = HTG par 1 unité étrangère (ex: 1 DOP = 13.5 HTG)

export const computeEquivalentFromHTG = (amountHTG, exchangeRate) => {
  const amount = safeNumber(amountHTG);
  const rate = safeNumber(exchangeRate);
  if (rate <= 0) return 0;
  return amount / rate;
};

export const computeHTGFromEquivalent = (amountForeign, exchangeRate) => {
  return safeNumber(amountForeign) * safeNumber(exchangeRate);
};

export const formatExchangeRateInfo = (exchangeType, exchangeRate) => {
  const rate = safeNumber(exchangeRate);
  if (!exchangeType || rate <= 0) return null;
  return `Taux: 1 ${exchangeType} = ${rate.toFixed(2)} HTG`;
};

export const formatCurrency = (amount, currency = 'HTG') => {
  const num = safeNumber(amount);
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(num) + (currency ? ` ${currency}` : '');
};
