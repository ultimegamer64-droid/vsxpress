// rate = HTG par 1 DOP

export const computeCreditPreview = ({ creditInput, rate, inputCurrency, outputCurrency }) => {
  const empty = { isValid: false, estimatedAmount: null, formula: null, currency: null };

  if (!inputCurrency || !outputCurrency) {
    return { ...empty, errorMessage: 'devise non définie' };
  }

  if (creditInput === undefined || creditInput === null || creditInput === '') {
    return { ...empty, errorMessage: '' };
  }

  const c = parseFloat(creditInput);
  if (isNaN(c) || c <= 0) return { ...empty, errorMessage: '' };

  const needsRate = inputCurrency !== outputCurrency;
  if (needsRate) {
    const r = parseFloat(rate);
    if (rate === '' || rate === null || rate === undefined || isNaN(r) || r <= 0) {
      return { ...empty, errorMessage: 'rate invalide' };
    }
  }

  const r = parseFloat(rate);
  let estimated = c;
  let formula = `${c}`;

  if (inputCurrency === 'DOP' && outputCurrency === 'HTG') {
    estimated = c * r;
    formula = `${c} × ${r}`;
  } else if (inputCurrency === 'HTG' && outputCurrency === 'DOP') {
    estimated = c / r;
    formula = `${c} ÷ ${r}`;
  }

  return {
    isValid: true,
    estimatedAmount: estimated.toFixed(2),
    formula,
    currency: outputCurrency === 'DOP' ? 'RD$' : outputCurrency,
    errorMessage: null,
  };
};
