export const formatCurrency = (amount, currency = 'LKR') => {
  const numericAmount = Number(amount ?? 0);

  if (!Number.isFinite(numericAmount)) {
    return `${currency} 0`;
  }

  return `${currency} ${numericAmount.toLocaleString('en-LK')}`;
};

export const formatAddress = (address, city, country = 'Sri Lanka') => {
  const cleanAddress = address ? address.replace(/,\s*$/, '').trim() : '';
  const cleanCity = city ? city.trim() : '';
  const cleanCountry = country ? country.trim() : '';

  const parts = [];
  if (cleanAddress) {
    parts.push(cleanAddress);
  }
  if (cleanCity && (!cleanAddress || !cleanAddress.toLowerCase().includes(cleanCity.toLowerCase()))) {
    parts.push(cleanCity);
  }
  if (cleanCountry && (!cleanAddress || !cleanAddress.toLowerCase().includes(cleanCountry.toLowerCase()))) {
    parts.push(cleanCountry);
  }

  return parts.filter(Boolean).join(', ');
};