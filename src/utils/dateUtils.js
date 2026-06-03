const toManila = (dateString) => {
  if (!dateString) return null;
  try {
    const normalized = dateString.includes('+') || dateString.endsWith('Z')
      ? dateString
      : dateString + '+00:00';
    const date = new Date(normalized);
    return isNaN(date.getTime()) ? null : date;
  } catch {
    return null;
  }
};

export const parseDate = (dateString) => {
  return toManila(dateString);
};

export const formatDateForInput = (dateString) => {
  if (!dateString) return '';
  try {
    const date = toManila(dateString);
    if (!date) return '';

    // Return Manila local time as input value
    const manila = new Date(date.toLocaleString('en-US', { timeZone: 'Asia/Manila' }));
    const year = manila.getFullYear();
    const month = String(manila.getMonth() + 1).padStart(2, '0');
    const day = String(manila.getDate()).padStart(2, '0');
    const hours = String(manila.getHours()).padStart(2, '0');
    const minutes = String(manila.getMinutes()).padStart(2, '0');
    const seconds = String(manila.getSeconds()).padStart(2, '0');

    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
  } catch {
    return '';
  }
};

export const formatDisplayDate = (dateString, options = {}) => {
  if (!dateString) return '';
  try {
    const date = toManila(dateString);
    if (!date) return '';

    return date.toLocaleDateString('en-US', {
      timeZone: 'Asia/Manila',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      ...options
    });
  } catch {
    return '';
  }
};

export const formatDateTime = (dateString) => {
  if (!dateString) return '';
  try {
    const date = toManila(dateString);
    if (!date) return '';

    return date.toLocaleString('en-US', {
      timeZone: 'Asia/Manila',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return '';
  }
};