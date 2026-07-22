export const INVENTORY_TYPES = [
  { value: 'STOCK_IN', label: 'Stock In', color: 'green' },
  { value: 'TRANSFER', label: 'Transfer', color: 'blue' },
  { value: 'RETURN', label: 'Return', color: 'yellow' },
  { value: 'DAMAGE', label: 'Damage', color: 'red' }
];

export const getTypeColor = (type) => {
  const colors = {
    STOCK_IN: 'bg-green-100 text-green-800',
    TRANSFER: 'bg-blue-100 text-blue-800',
    TRANSFER_IN: 'bg-blue-100 text-blue-800',
    TRANSFER_OUT: 'bg-indigo-100 text-indigo-800',
    RETURN: 'bg-yellow-100 text-yellow-800',
    DAMAGE: 'bg-red-100 text-red-800'
  };
  return colors[type] || 'bg-gray-100 text-gray-800';
};

export const getStatusColor = (status) => {
  const colors = {
    PENDING: 'bg-yellow-100 text-yellow-800',
    CONFIRMED: 'bg-green-100 text-green-800'
  };
  return colors[status] || 'bg-gray-100 text-gray-800';
};