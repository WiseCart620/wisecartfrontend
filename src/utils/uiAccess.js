import { can } from '../context/AuthContext';

// Every tab / button that the boss can switch on or off per user.
export const UI = {
  payroll_tabs: ['tab_runs','tab_ot','tab_rb','tab_db','tab_an','run_new','ot_edit','rb_edit','db_manage'],
  loans_tabs: ['tab_loans','tab_cashAdvance','tab_hmo','tab_agencies','loan_create','loan_edit','loan_view','loan_payments','loan_cancel','loan_docs','ca_create','ca_edit','ca_view','ca_cancel','ca_delete','ca_docs','hmo_create','hmo_edit','hmo_delete','ag_create','ag_edit','ag_delete'],
  leave_tabs: ['tab_requests','tab_balances','tab_types','req_create','req_edit','req_delete','bal_edit','bal_delete','type_create','type_edit','type_delete'],
  tax_tabs: ['tab_statutory','tab_tax','tab_brackets','stat_delete','tax_create','tax_edit','tax_delete','br_create','br_edit','br_delete'],
  sales_ui: ['jr_record_payment','jr_dv_payment','jr_delete_invoice','jr_print_receipt','rp_generate','rp_export','rp_print'],
  deliveries_ui: ['tr_new','tr_open','tr_print','tr_delete'],
  inventory_ui: ['tab_products','tab_warehouse','tab_branch','tab_rebuild','ps_generate','ps_view','ws_audit','ws_movements','ws_view','ws_adjust','cs_csv','cs_print','cs_view','sr_rebuild','sr_scan','sr_fix','sr_purge','sr_lock'],
  procurement_ui: ['tab_irr','tab_rpq','tab_po','tab_costing','irr_new','irr_view','irr_edit','irr_delete','irr_proceed','rpq_view','rpq_edit','rpq_delete','rpq_print','rpq_confirm','po_products','po_payments','po_shipping','po_pay','po_other','po_submit','po_edit_payment'],
  alerts_ui: ['al_download','al_resolve_all','al_clear_resolved','al_resolve'],
  branches_ui: ['tab_branches','tab_companies'],
  whinv_ui: ['whi_new','whi_edit','whi_delete','whi_confirm'],
  employees_ui: ['emp_add','emp_edit','emp_deactivate','emp_docs','emp_view','emp_sensitive'],
};

// true if the user may see/use this tab or button.
// Users with NOTHING ticked in a group keep full access (so existing users are not locked out).
export const ui = (user, group, key) => {
  if (!user) return false;
  const any = (UI[group] || []).some((k) => can(user, group, k));
  return any ? can(user, group, key) : true;
};