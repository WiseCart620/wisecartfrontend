import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { ChevronRight, Users, Coins, Landmark, CalendarDays, Percent, Wallet, Gift, Clock } from 'lucide-react';

const k = (g, a) => `${g}:${a}`;
const UI_GROUPS = ['pages_ui', 'dtr_ui', 'employees_ui', 'loans_tabs', 'leave_tabs', 'tax_tabs', 'payroll_tabs'];
const isUi = (key) => UI_GROUPS.includes(key.split(':')[0]);
const A = (label, key, hint) => ({ label, key, hint });

const SHARED = 'Shared server permission used by all HR pages (Employees, Pay Types, Loans, Leave, Tax, Year-End)';
const MANAGE = 'Shared server permission "manage": also used by brackets, custom contributions, 13th month and disbursement';
const hrAccess = [
  A('View', k('employees', 'view'), SHARED), A('Create', k('employees', 'create'), SHARED),
  A('Edit', k('employees', 'edit'), SHARED), A('Delete', k('employees', 'delete'), SHARED),
];

// access = page-level permissions, tabs = tab pills with their buttons, other = buttons that have no tab.
const PAGES = [
  {
    id: 'employees', vis: k('pages_ui', 'page_employees'), title: 'Employees', desc: 'Employee list and its buttons', icon: Users, access: hrAccess, tabs: [], other: [
      A('Add Employee', k('employees_ui', 'emp_add')), A('Edit Employee', k('employees_ui', 'emp_edit')),
      A('Activate / Deactivate', k('employees_ui', 'emp_deactivate')), A('Documents', k('employees_ui', 'emp_docs')),
      A('View profile', k('employees_ui', 'emp_view')), A('Show sensitive info', k('employees_ui', 'emp_sensitive')),
    ]
  },
  {
    id: 'paytypes', vis: k('pages_ui', 'page_paytypes'), title: 'Pay Types', desc: 'Earnings, allowances, deductions, payroll rates', icon: Coins, access: hrAccess, tabs: [], other: [
      A('Edit payroll rates & formulas', k('payroll', 'formula')),
    ]
  },
  {
    id: 'loans', vis: k('pages_ui', 'page_loans'), title: 'Loans & Other Deductions', desc: 'Loans, cash advances, HMO, agencies', icon: Landmark, access: hrAccess, tabs: [
      {
        label: 'Loans', key: k('loans_tabs', 'tab_loans'), actions: [
          A('Add loan', k('loans_tabs', 'loan_create')), A('Edit / cancel / delete', k('loans_tabs', 'loan_edit')),
          A('View details', k('loans_tabs', 'loan_view')), A('Payment history', k('loans_tabs', 'loan_payments')),
          A('Cancel loan', k('loans_tabs', 'loan_cancel')), A('View document', k('loans_tabs', 'loan_docs'))]
      },
      {
        label: 'Cash Advance', key: k('loans_tabs', 'tab_cashAdvance'), actions: [
          A('Add cash advance', k('loans_tabs', 'ca_create')), A('Edit', k('loans_tabs', 'ca_edit')),
          A('View details', k('loans_tabs', 'ca_view')), A('Cancel', k('loans_tabs', 'ca_cancel')),
          A('Delete', k('loans_tabs', 'ca_delete')), A('View document', k('loans_tabs', 'ca_docs')),
          A('Approve', k('employees', 'ca_approve'))]
      },
      {
        label: 'HMO', key: k('loans_tabs', 'tab_hmo'), actions: [
          A('Add HMO', k('loans_tabs', 'hmo_create')), A('Edit', k('loans_tabs', 'hmo_edit')), A('Delete', k('loans_tabs', 'hmo_delete'))]
      },
      {
        label: 'Agencies', key: k('loans_tabs', 'tab_agencies'), actions: [
          A('Add agency', k('loans_tabs', 'ag_create')), A('Edit', k('loans_tabs', 'ag_edit')), A('Delete', k('loans_tabs', 'ag_delete'))]
      },
    ], other: []
  },
  {
    id: 'leave', vis: k('pages_ui', 'page_leave'), title: 'Leave', desc: 'Requests, balances, leave types', icon: CalendarDays, access: hrAccess, tabs: [
      {
        label: 'Requests', key: k('leave_tabs', 'tab_requests'), actions: [
          A('File leave', k('leave_tabs', 'req_create')), A('Approve / reject / cancel', k('leave_tabs', 'req_edit')), A('Delete', k('leave_tabs', 'req_delete'))]
      },
      {
        label: 'Balances', key: k('leave_tabs', 'tab_balances'), actions: [
          A('Grant leave / prepare year', k('leave_tabs', 'bal_edit')), A('Recalculate', k('employees', 'recalc')), A('Delete', k('leave_tabs', 'bal_delete'))]
      },
      {
        label: 'Leave Types', key: k('leave_tabs', 'tab_types'), actions: [
          A('Add leave type', k('leave_tabs', 'type_create')), A('Edit', k('leave_tabs', 'type_edit')), A('Delete', k('leave_tabs', 'type_delete'))]
      },
    ], other: []
  },
  {
    id: 'tax', vis: k('pages_ui', 'page_tax'), title: 'Tax & Statutory', desc: 'Contributions, tax brackets, statutory brackets', icon: Percent, access: hrAccess, tabs: [
      {
        label: 'Statutory Contributions', key: k('tax_tabs', 'tab_statutory'), actions: [
          A('Edit employee / employer shares', k('payroll', 'statutory')), A('Delete saved row', k('tax_tabs', 'stat_delete'))]
      },
      {
        label: 'Tax Brackets', key: k('tax_tabs', 'tab_tax'), actions: [
          A('Add bracket', k('tax_tabs', 'tax_create')), A('Edit', k('tax_tabs', 'tax_edit')), A('Delete', k('tax_tabs', 'tax_delete'))]
      },
      {
        label: 'Statutory Brackets', key: k('tax_tabs', 'tab_brackets'), actions: [
          A('Add bracket', k('tax_tabs', 'br_create')), A('Edit', k('tax_tabs', 'br_edit')), A('Delete', k('tax_tabs', 'br_delete'))]
      },
    ], other: [A('Manage brackets & custom contributions', k('employees', 'manage'), MANAGE)]
  },
  {
    id: 'payroll', vis: k('pages_ui', 'page_payroll'), title: 'Payroll Runs', desc: 'Runs, pay entries, reimbursements, disbursement, annual', icon: Wallet, access: [
      A('View', k('payroll', 'view')), A('Create', k('payroll', 'create'), 'Create runs, regenerate payslips, add entries'),
      A('Edit', k('payroll', 'edit'), 'Edit payslips'), A('Delete', k('payroll', 'delete'), 'Delete runs')], tabs: [
        { label: 'Payroll Runs', key: k('payroll_tabs', 'tab_runs'), actions: [A('New run', k('payroll_tabs', 'run_new'))] },
        { label: 'Pay Entries', key: k('payroll_tabs', 'tab_ot'), actions: [A('Add / edit / delete entries', k('payroll_tabs', 'ot_edit'))] },
        { label: 'Reimbursements', key: k('payroll_tabs', 'tab_rb'), actions: [A('Add / cancel / delete', k('payroll_tabs', 'rb_edit'))] },
        { label: 'Disbursement', key: k('payroll_tabs', 'tab_db'), actions: [A('Generate batch', k('payroll_tabs', 'db_manage'))] },
        { label: 'Annual Monitoring', key: k('payroll_tabs', 'tab_an'), actions: [] },
      ], other: [
        A('Submit run', k('payroll', 'submit')), A('Approve / reject', k('payroll', 'approve')),
        A('Mark paid', k('payroll', 'pay')), A('Download documents', k('payroll', 'download')),
      ]
  },
  {
    id: 'yearend', vis: k('pages_ui', 'page_yearend'), title: 'Year-End', desc: '13th month pay', icon: Gift, access: [A('View', k('employees', 'view'), SHARED)], tabs: [], other: [
      A('Include in 13th month payroll', k('employees', 'manage'), MANAGE),
    ]
  },
];

const pageKeys = (p) => [
  p.vis,
  ...p.access.map(a => a.key),
  ...p.tabs.flatMap(t => [t.key, ...t.actions.map(a => a.key)]),
  ...p.other.map(a => a.key),
];

const groupKeys = {};
PAGES.forEach(p => pageKeys(p).filter(isUi).forEach(key => {
  const g = key.split(':')[0];
  if (!(groupKeys[g] || (groupKeys[g] = [])).includes(key)) groupKeys[g].push(key);
}));

const Chip = ({ checked, disabled, onChange, label, hint, strong }) => (
  <label title={hint || undefined}
    className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm select-none transition-colors
      ${disabled ? 'bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed'
        : checked ? 'bg-orange-50 border-orange-300 text-orange-900 cursor-pointer'
          : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300 cursor-pointer'}
      ${strong ? 'font-medium' : ''}`}>
    <input type="checkbox" className="w-4 h-4 accent-orange-600" checked={checked} disabled={disabled} onChange={onChange} />
    {label}
  </label>
);

const Section = ({ title, children }) => (
  <div>
    <div className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 mb-2">{title}</div>
    {children}
  </div>
);

const PagePermissionMatrix = ({ permissions, onChange }) => {
  const [open, setOpen] = useState(() => new Set());
  const has = (key) => permissions.includes(key);
  const restricted = (g) => (groupKeys[g] || []).some(has);
  const on = (key) => (isUi(key) ? (!restricted(key.split(':')[0]) || has(key)) : has(key));

  const toggleUi = (key, tab) => {
    const g = key.split(':')[0];
    const all = groupKeys[g];
    const next = new Set(restricted(g) ? all.filter(has) : all);
    if (next.has(key)) {
      next.delete(key);
      if (tab && tab.key === key) tab.actions.forEach(a => next.delete(a.key));
    } else {
      next.add(key);
      if (tab && tab.key && tab.key !== key && tab.key.startsWith(g + ':')) next.add(tab.key);
    }
    if (next.size === 0) {
      toast.error('At least one tab or button must stay ticked. To hide the whole page, untick its page access View.');
      return;
    }
    const rest = permissions.filter(p => !all.includes(p));
    onChange(next.size === all.length ? rest : [...rest, ...next]);
  };

  const toggleCore = (key) => {
    const m = key.split(':')[0];
    if (has(key)) {
      onChange(permissions.filter(p => p !== key && !(key === `${m}:view` && p.startsWith(`${m}:`))));
    } else {
      onChange([...permissions, key, ...(!key.endsWith(':view') && !has(`${m}:view`) ? [`${m}:view`] : [])]);
    }
  };

  const toggle = (key, tab) => (isUi(key) ? toggleUi(key, tab) : toggleCore(key));
  const flip = (id) => setOpen(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const resetGroup = (g) => onChange(permissions.filter(p => !(groupKeys[g] || []).includes(p)));

  return (
    <section>
      <div className="flex items-center gap-2 mb-2">
        <div className="w-1 h-4 bg-orange-600 rounded-full" />
        <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Payroll Pages: Tabs & Buttons</h3>
      </div>
      <p className="text-xs text-gray-500 mb-4">Open a page, choose which tabs this user can see, then choose the buttons allowed inside each tab.</p>
      <div className="space-y-3">
        {PAGES.map(page => {
          const isOpen = open.has(page.id);
          const keys = [...new Set(pageKeys(page))];
          const allowed = keys.filter(on).length;
          const limited = [...new Set(keys.filter(isUi).map(x => x.split(':')[0]))].filter(g => g !== 'pages_ui').filter(restricted);
          const Icon = page.icon; const menuOn = on(page.vis);
          return (
            <div key={page.id} className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm">
              <button type="button" onClick={() => flip(page.id)}
                className="w-full flex items-center justify-between gap-3 px-4 py-3 bg-gray-50 hover:bg-gray-100 text-left transition-colors">
                <span className="flex items-center gap-3 min-w-0">
                  <span className="w-9 h-9 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-orange-600 flex-shrink-0">
                    <Icon size={18} />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-gray-900">{page.title}</span>
                    <span className="block text-xs text-gray-500 truncate">{page.desc}</span>
                  </span>
                </span>
                <span className="flex items-center gap-3 flex-shrink-0">
                  <span className="text-xs text-gray-500">{allowed} of {keys.length} allowed</span>
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${!on(page.vis) ? 'bg-gray-100 text-gray-600' : limited.length ? 'bg-orange-50 text-orange-700' : 'bg-green-50 text-green-700'}`}>
                    {!on(page.vis) ? 'Hidden' : limited.length ? 'Restricted' : 'Full access'}
                  </span>
                  <ChevronRight size={16} className={`text-gray-400 transition-transform ${isOpen ? 'rotate-90' : ''}`} />
                </span>
              </button>

              {isOpen && (
                <div className="p-4 space-y-5">
                  <Section title="Page access">
                    <div className="flex flex-wrap gap-2">
                      <Chip label="Show page in menu" hint="Untick to hide this whole page from the sidebar" strong checked={on(page.vis)} onChange={() => toggle(page.vis)} />
                      {page.access.map(a => (
                        <Chip key={a.key} label={a.label} hint={a.hint} strong checked={on(a.key)} disabled={!menuOn} onChange={() => toggle(a.key)} />
                      ))}
                    </div>
                  </Section>

                  {page.tabs.length > 0 && (
                    <Section title="Tabs">
                      <div className="flex flex-wrap gap-2">
                        {page.tabs.map(t => (
                          <Chip key={t.key} label={t.label} strong checked={on(t.key)} disabled={!menuOn} onChange={() => toggle(t.key, t)} />
                        ))}
                      </div>
                    </Section>
                  )}

                  {page.tabs.filter(t => t.actions.length > 0).map(t => {
                    const tabOn = on(t.key);
                    return (
                      <div key={t.key} className={`rounded-lg border border-gray-200 ${tabOn ? 'bg-white' : 'bg-gray-50'}`}>
                        <div className="px-3 py-2 border-b border-gray-100 flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-900">{t.label} tab buttons</span>
                          {!tabOn && <span className="text-xs text-gray-400">Tab hidden</span>}
                        </div>
                        <div className="p-3 flex flex-wrap gap-2">
                          {t.actions.map(a => (
                            <Chip key={a.key} label={a.label} hint={a.hint}
                              checked={on(a.key)} disabled={!menuOn || (isUi(a.key) && !tabOn)} onChange={() => toggle(a.key, t)} />
                          ))}
                        </div>
                      </div>
                    );
                  })}

                  {page.other.length > 0 && (
                    <Section title={page.tabs.length ? 'Other buttons' : 'Buttons'}>
                      <div className="flex flex-wrap gap-2">
                        {page.other.map(a => (
                          <Chip key={a.key} label={a.label} hint={a.hint} checked={on(a.key)} disabled={!menuOn} onChange={() => toggle(a.key)} />
                        ))}
                      </div>
                    </Section>
                  )}

                  {limited.length > 0 && (
                    <div className="pt-3 border-t border-gray-100 text-right">
                      <button type="button" onClick={() => limited.forEach(resetGroup)}
                        className="text-xs font-medium text-orange-700 hover:underline">Reset tabs & buttons to full access</button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <p className="text-xs text-gray-500 mt-3">
        Hover a tick for details. Page access ticks (View / Create / Edit / Delete) are one shared server permission, so changing them on one HR page changes them on all.
      </p>
    </section>
  );
};

export default PagePermissionMatrix;

