export const formatCurrency = (amount) => {
  if (amount === null || amount === undefined) return '0.00';
  return Number(amount).toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

export const formatPHDateTime = (dateString) => {
  if (!dateString) return '';
  const normalized = dateString.includes('+') || dateString.endsWith('Z')
    ? dateString
    : dateString + '+00:00';
  return new Date(normalized).toLocaleString('en-PH', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });
};

export const formatDate = (dateString) => {
  if (!dateString) return new Date().toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric'
  });
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    }
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  } catch (error) {
    console.error('Error formatting date:', error);
    return new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  }
};

export const makeStockKey = (productId, variationId, branchId) =>
  `${productId}_${variationId ?? 'base'}_${branchId}`;

export const extractArray = (res) => {
  if (!res) return [];
  if (Array.isArray(res)) return res;
  if (res && Array.isArray(res.data)) return res.data;
  if (res && res.data && Array.isArray(res.data.content)) return res.data.content;
  if (res && Array.isArray(res.content)) return res.content;
  return [];
};