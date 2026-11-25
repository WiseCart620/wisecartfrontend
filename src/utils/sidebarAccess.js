import { uiAllowed } from '../context/AuthContext';

// Page access for the BIR pages, using the same pages_ui:page_<id> keys as PagePermissionMatrix.
// BIR page ids: bir_1601c, bir_1604c, bir_qb, bir_ewt, bir_2550q.
// Users saved before these pages existed have no page_bir_* key: they keep the old rule
// (a BIR page is available when Payroll Runs is). Once any page_bir_* is ticked, only the ticked ones show.
export const pageAllowed = (user, pageId) => {
  if (!String(pageId).startsWith('bir_')) return uiAllowed(user, 'pages_ui', `page_${pageId}`);
  if (!user) return false;
  if (user.role === 'SUPER_ADMIN') return true;
  const perms = user.permissions || [];
  if (perms.includes(`pages_ui:page_${pageId}`)) return true;
  if (perms.some((p) => p.startsWith('pages_ui:page_bir_'))) return false;
  return uiAllowed(user, 'pages_ui', 'page_payroll');
};