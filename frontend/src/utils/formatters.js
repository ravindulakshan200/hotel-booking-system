export const formatCurrency = (amount, currency = 'LKR') => {
  const numericAmount = Number(amount ?? 0);

  if (!Number.isFinite(numericAmount)) {
    return `${currency} 0`;
  }

  return `${currency} ${numericAmount.toLocaleString('en-LK')}`;
};
