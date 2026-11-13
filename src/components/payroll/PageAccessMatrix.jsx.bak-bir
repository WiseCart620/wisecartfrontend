import React from 'react';

const PAGES = [
  {
    key: 'payroll_tabs', title: 'Payroll', desc: 'Runs, pay entries, reimbursements, disbursement, annual monitoring',
    rows: [
      { label: 'Payroll Runs', tab: 'tab_runs', actions: [['run_new', 'Create new run']] },
      { label: 'Pay Entries', tab: 'tab_ot', actions: [['ot_edit', 'Add / Edit / Delete']] },
      { label: 'Reimbursements', tab: 'tab_rb', actions: [['rb_edit', 'Add / Cancel / Delete']] },
      { label: 'Disbursement', tab: 'tab_db', actions: [['db_manage', 'Generate batch']] },
      { label: 'Annual Monitoring', tab: 'tab_an', actions: [] },
    ],
  },
  {
    key: 'loans_tabs', title: 'Loans & Deductions', desc: 'Loans, cash advances, HMO, agencies',
    rows: [
      { label: 'Loans', tab: 'tab_loans', actions: [['loan_create', 'Add'], ['loan_edit', 'Edit / Cancel / Delete']] },
      { label: 'Cash Advance', tab: 'tab_cashAdvance', actions: [['ca_create', 'Add'], ['ca_edit', 'Edit / Cancel / Delete']] },
      { label: 'HMO', tab: 'tab_hmo', actions: [['hmo_create', 'Add'], ['hmo_edit', 'Edit'], ['hmo_delete', 'Delete']] },
      { label: 'Agencies', tab: 'tab_agencies', actions: [['ag_create', 'Add'], ['ag_edit', 'Edit'], ['ag_delete', 'Delete']] },
    ],
  },
  {
    key: 'leave_tabs', title: 'Leave Management', desc: 'Requests, balances, leave types',
    rows: [
      { label: 'Requests', tab: 'tab_requests', actions: [['req_create', 'File leave'], ['req_edit', 'Approve / Reject / Cancel'], ['req_delete', 'Delete']] },
      { label: 'Balances', tab: 'tab_balances', actions: [['bal_edit', 'Grant / Recalculate'], ['bal_delete', 'Delete']] },
      { label: 'Leave Types', tab: 'tab_types', actions: [['type_create', 'Add'], ['type_edit', 'Edit'], ['type_delete', 'Delete']] },
    ],
  },
  {
    key: 'tax_tabs', title: 'Tax & Statutory', desc: 'Statutory contributions, tax brackets, statutory brackets',
    rows: [
      { label: 'Statutory Contributions', tab: 'tab_statutory', actions: [['stat_delete', 'Delete saved row']] },
      { label: 'Tax Brackets', tab: 'tab_tax', actions: [['tax_create', 'Add'], ['tax_edit', 'Edit'], ['tax_delete', 'Delete']] },
      { label: 'Statutory Brackets', tab: 'tab_brackets', actions: [['br_create', 'Add'], ['br_edit', 'Edit'], ['br_delete', 'Delete']] },
    ],
  },
  {
    key: 'employees_ui', title: 'Employees', desc: 'Buttons on the Employees list',
    rows: [
      {
        label: 'Employee list', tab: null,
        actions: [['emp_add', 'Add employee'], ['emp_edit', 'Edit'], ['emp_deactivate', 'Activate / Deactivate'],
          ['emp_docs', 'Documents'], ['emp_view', 'View profile'], ['emp_sensitive', 'Show sensitive info']],
      },
    ],
  },
];

export const MATRIX_GROUPS = PAGES.map((p) => p.key);

const allKeysOf = (page) =>
  page.rows.flatMap((r) => [...(r.tab ? [r.tab] : []), ...r.actions.map((a) => a[0])]);

const Check = ({ checked, disabled, onChange, children }) => (
  <label className={`inline-flex items-center gap-2 text-sm ${disabled ? 'text-gray-400 cursor-not-allowed' : 'text-gray-700 cursor-pointer'}`}>
    <input type="checkbox" className="accent-orange-600 w-4 h-4" checked={checked} disabled={disabled} onChange={onChange} />
    {children}
  </label>
);

const PageAccessMatrix = ({ permissions = [], onChange }) => {
  const selectedOf = (page) => {
    const valid = new Set(allKeysOf(page));
    return new Set(
      permissions
        .filter((p) => p.startsWith(page.key + ':'))
        .map((p) => p.slice(page.key.length + 1))
        .filter((k) => valid.has(k))
    );
  };

  const commit = (page, set) => {
    const rest = permissions.filter((p) => !p.startsWith(page.key + ':'));
    onChange([...rest, ...Array.from(set).map((k) => `${page.key}:${k}`)]);
  };

  const setMode = (page, custom) => commit(page, custom ? new Set(allKeysOf(page)) : new Set());

  const toggleTab = (page, row, sel) => {
    const next = new Set(sel);
    if (next.has(row.tab)) {
      next.delete(row.tab);
      row.actions.forEach((a) => next.delete(a[0]));
    } else {
      next.add(row.tab);
    }
    commit(page, next);
  };

  const toggleAction = (page, key, sel) => {
    const next = new Set(sel);
    next.has(key) ? next.delete(key) : next.add(key);
    commit(page, next);
  };

  return (
    <section>
      <div className="flex items-center gap-2 mb-4">
        <div className="w-1 h-4 bg-orange-600 rounded-full" />
        <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Page Access: Tabs &amp; Buttons</h3>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 text-xs text-gray-600">
          Every page is on <b>Full access</b> by default. Choose <b>Custom</b> only when this user should see fewer tabs or buttons.
        </div>

        <div className="divide-y divide-gray-100">
          {PAGES.map((page) => {
            const sel = selectedOf(page);
            const total = allKeysOf(page).length;
            const custom = sel.size > 0;
            return (
              <div key={page.key} className={custom ? 'bg-orange-50/30' : 'bg-white'}>
                <div className="flex flex-wrap items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1 basis-56">
                    <div className="text-sm font-semibold text-gray-900">{page.title}</div>
                    <div className="text-xs text-gray-500 truncate" title={page.desc}>{page.desc}</div>
                  </div>
                  {custom && (
                    <span className="text-xs font-medium text-orange-700 bg-orange-50 px-2.5 py-1 rounded-full">
                      {sel.size} of {total} allowed
                    </span>
                  )}
                  <div className="inline-flex rounded border border-gray-200 p-0.5 bg-white">
                    <button type="button" onClick={() => setMode(page, false)}
                      className={`px-3 py-1 text-xs font-medium rounded whitespace-nowrap ${!custom ? 'bg-orange-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
                      Full access
                    </button>
                    <button type="button" onClick={() => !custom && setMode(page, true)}
                      className={`px-3 py-1 text-xs font-medium rounded whitespace-nowrap ${custom ? 'bg-orange-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
                      Custom
                    </button>
                  </div>
                </div>

                {custom && (
                  <div className="px-4 pb-4 pt-1">
                    <div className="hidden sm:grid grid-cols-[220px_1fr] gap-4 pb-2 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                      <span>{page.rows[0].tab ? 'Tab' : 'Section'}</span>
                      <span>Allowed actions</span>
                    </div>
                    <div className="divide-y divide-gray-100 border-t border-gray-100">
                      {page.rows.map((row) => {
                        const tabOn = !row.tab || sel.has(row.tab);
                        return (
                          <div key={row.label} className="grid grid-cols-1 sm:grid-cols-[220px_1fr] gap-x-4 gap-y-2 py-2.5 items-center">
                            {row.tab ? (
                              <Check checked={sel.has(row.tab)} onChange={() => toggleTab(page, row, sel)}>
                                <span className="font-medium text-gray-900">{row.label}</span>
                              </Check>
                            ) : (
                              <span className="text-sm font-medium text-gray-900">{row.label}</span>
                            )}
                            <div className={`flex flex-wrap gap-x-5 gap-y-1.5 ${tabOn ? '' : 'opacity-60'}`}>
                              {row.actions.length === 0 ? (
                                <span className="text-xs text-gray-400">View only</span>
                              ) : row.actions.map(([k, l]) => (
                                <Check key={k} checked={sel.has(k)} disabled={!tabOn} onChange={() => toggleAction(page, k, sel)}>
                                  {l}
                                </Check>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <p className="text-xs text-gray-400 mt-2">Untick everything to return this page to Full access.</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default PageAccessMatrix;