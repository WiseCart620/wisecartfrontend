import { can } from '../context/AuthContext';

// Every tab / button that the boss can switch on or off per user.
export const UI = {
  payroll_tabs: ['tab_runs','tab_ot','tab_rb','tab_db','tab_an','run_new','ot_edit','rb_edit','db_manage'],
  loans_tabs: ['tab_loans','tab_cashAdvance','tab_hmo','tab_agencies','loan_create','loan_edit','ca_create','ca_edit','hmo_create','hmo_edit','hmo_delete','ag_create','ag_edit','ag_delete'],
  leave_tabs: ['tab_requests','tab_balances','tab_types','req_create','req_edit','req_delete','bal_edit','bal_delete','type_create','type_edit','type_delete'],
  tax_tabs: ['tab_statutory','tab_tax','tab_brackets','stat_delete','tax_create','tax_edit','tax_delete','br_create','br_edit','br_delete'],
  employees_ui: ['emp_add','emp_edit','emp_deactivate','emp_docs','emp_view','emp_sensitive'],
};

// true if the user may see/use this tab or button.
// Users with NOTHING ticked in a group keep full access (so existing users are not locked out).
export const ui = (user, group, key) => {
  if (!user) return false;
  const any = (UI[group] || []).some((k) => can(user, group, k));
  return any ? can(user, group, key) : true;
};