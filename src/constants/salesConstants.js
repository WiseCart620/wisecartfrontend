export const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const monthsFull = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export const ROLES = {
  ADMIN: 'ADMIN',
  ENCODER: 'ENCODER',
  ASSISTANT_ADMIN: 'ASSISTANT_ADMIN',
  FINANCE: 'FINANCE',
};

export const SALE_STATUS = {
  ALL: 'ALL',
  PENDING: 'PENDING',
  CONFIRMED: 'CONFIRMED',
  INVOICED: 'INVOICED',
};

export const DEFAULT_FILTER_DATA = {
  companyId: '',
  branchId: '',
  status: '',
  startMonth: new Date().getMonth() + 1,
  endMonth: new Date().getMonth() + 1,
  startYear: new Date().getFullYear(),
  endYear: new Date().getFullYear(),
  startDate: '',
  endDate: '',
  productId: '',
  variationId: '',
  productName: '',
  productFilters: [],
};