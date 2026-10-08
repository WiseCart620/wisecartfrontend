// utils/constants.js

export const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const MONTHS_FULL = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export const DELIVERY_STATUSES = ['PREPARING', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED'];

export const SALES_STATUSES = ['PENDING', 'CONFIRMED', 'INVOICED'];

export const STATUS_COLORS = {
  // Sales statuses
  PENDING: 'bg-yellow-100 text-yellow-800',
  CONFIRMED: 'bg-orange-100 text-orange-800',
  INVOICED: 'bg-green-100 text-green-800',
  
  // Delivery statuses
  PREPARING: 'bg-yellow-100 text-yellow-800',
  IN_TRANSIT: 'bg-purple-100 text-purple-800',
  DELIVERED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-red-100 text-red-800',
  CUSTOM: 'bg-gray-100 text-gray-800'
};

export const STATUS_ORDER = {
  PENDING: 1,
  CONFIRMED: 2,
  INVOICED: 3
};

export const DELIVERY_STATUS_ORDER = {
  PREPARING: 1,
  IN_TRANSIT: 2,
  DELIVERED: 3,
  CANCELLED: 4
};