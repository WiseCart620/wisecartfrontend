param([string]$Src = 'C:\dev\wisecartfrontend\src')
$ErrorActionPreference = 'Stop'
if (-not (Test-Path $Src)) { throw "Folder not found: $Src" }
$utf8 = New-Object System.Text.UTF8Encoding($false)
function ReadText($p) { [IO.File]::ReadAllText($p) }
function SaveText($p, $t) { [IO.File]::WriteAllText($p, $t, $utf8) }
function Fnd($name) {
  $f = Get-ChildItem -Path $Src -Recurse -Filter $name -File | Where-Object { $_.FullName -notmatch 'node_modules' } | Select-Object -First 1
  if (-not $f) { throw "Not found: $name" }
  $f.FullName
}

$util = @'
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
'@
$utilDir = Join-Path $Src 'utils'
if (-not (Test-Path $utilDir)) { New-Item -ItemType Directory -Path $utilDir | Out-Null }
SaveText (Join-Path $utilDir 'uiAccess.js') $util
Write-Host 'created utils\uiAccess.js'

function Edit-File($name, $spec) {
  $p = Fnd $name
  $t = ReadText $p
  if ($t.Contains('utils/uiAccess')) { Write-Host "skip $name (already patched)"; return }
  Copy-Item $p "$p.bak" -Force
  $lines = $spec -split "\r?\n" | Where-Object { $_ -ne '' }
  for ($i = 0; $i -lt $lines.Count; $i += 2) {
    $old = $lines[$i].Substring(2)
    $new = $lines[$i + 1].Substring(2).Replace('\n', "`n")
    if ($t.Contains($old)) { $t = $t.Replace($old, $new) } else { Write-Warning "[$name] anchor not found: $old" }
  }
  $t = "import { ui } from '../../utils/uiAccess';`n" + $t
  SaveText $p $t
  Write-Host "patched $name"
}

Edit-File 'PayrollRunManagement.jsx' @'
- const canCreate = can(user, 'payroll', 'create');
+ const canCreate = can(user, 'payroll', 'create') && ui(user, 'payroll_tabs', 'run_new');
- const [tab, setTab] = useState('runs');
+ const [tab, setTab] = useState('runs');\n  useEffect(() => {\n    const first = ['runs', 'ot', 'rb', 'db', 'an'].find(k => ui(user, 'payroll_tabs', 'tab_' + k));\n    if (first && !ui(user, 'payroll_tabs', 'tab_' + tab)) setTab(first);\n  }, [user, tab]);
- ['an', 'Annual Monitoring']].map(([k, l]) => (
+ ['an', 'Annual Monitoring']].filter(([k]) => ui(user, 'payroll_tabs', 'tab_' + k)).map(([k, l]) => (
- <OvertimeEntries canEdit={canCreate} />
+ <OvertimeEntries canEdit={can(user, 'payroll', 'create') && ui(user, 'payroll_tabs', 'ot_edit')} />
- <ReimbursementTab employees={employees} canEdit={canCreate} />
+ <ReimbursementTab employees={employees} canEdit={can(user, 'payroll', 'create') && ui(user, 'payroll_tabs', 'rb_edit')} />
- <DisbursementTab approvedRuns={approvedRuns} canManage={canManage} />
+ <DisbursementTab approvedRuns={approvedRuns} canManage={canManage && ui(user, 'payroll_tabs', 'db_manage')} />
'@

Edit-File 'LeaveManagement.jsx' @'
- const [tab, setTab] = useState('requests');
+ const [tab, setTab] = useState('requests');\n  const lv = (k) => ui(user, 'leave_tabs', k);\n  useEffect(() => {\n    if (!lv('tab_' + tab)) { const f = TABS.find(t => lv('tab_' + t.key)); if (f) setTab(f.key); }\n  }, [user, tab]);
- tabs={TABS}
+ tabs={TABS.filter(t => lv('tab_' + t.key))}
- <LeaveRequestsTab employees={employees} leaveTypes={leaveTypes} canCreate={canCreate} canEdit={canEdit} canDelete={canDelete} />
+ <LeaveRequestsTab employees={employees} leaveTypes={leaveTypes} canCreate={canCreate && lv('req_create')} canEdit={canEdit && lv('req_edit')} canDelete={canDelete && lv('req_delete')} />
- <LeaveBalancesTab employees={employees} leaveTypes={leaveTypes} canEdit={canEdit} canDelete={canDelete} />
+ <LeaveBalancesTab employees={employees} leaveTypes={leaveTypes} canEdit={canEdit && lv('bal_edit')} canDelete={canDelete && lv('bal_delete')} />
- <LeaveTypesTab leaveTypes={leaveTypes} canCreate={canCreate} canEdit={canEdit} canDelete={canDelete} onChanged={loadTypes} />
+ <LeaveTypesTab leaveTypes={leaveTypes} canCreate={canCreate && lv('type_create')} canEdit={canEdit && lv('type_edit')} canDelete={canDelete && lv('type_delete')} onChanged={loadTypes} />
'@

Edit-File 'LoansAndBenefits.jsx' @'
- const [tab, setTab] = useState('loans');
+ const [tab, setTab] = useState('loans');\n  const ln = (k) => ui(user, 'loans_tabs', k);\n  useEffect(() => {\n    if (!ln('tab_' + tab)) { const f = TABS.find(t => ln('tab_' + t.key)); if (f) setTab(f.key); }\n  }, [user, tab]);
- tabs={TABS}
+ tabs={TABS.filter(t => ln('tab_' + t.key))}
- <LoanAccountsTab employees={employees} agencies={agencies} canCreate={canCreate} canEdit={canEdit} />
+ <LoanAccountsTab employees={employees} agencies={agencies} canCreate={canCreate && ln('loan_create')} canEdit={canEdit && ln('loan_edit')} />
- <CashAdvanceTab employees={employees} canCreate={canCreate} canEdit={canEdit} />
+ <CashAdvanceTab employees={employees} canCreate={canCreate && ln('ca_create')} canEdit={canEdit && ln('ca_edit')} />
- <HmoTab employees={employees} canCreate={canCreate} canEdit={canEdit} canDelete={canDelete} />
+ <HmoTab employees={employees} canCreate={canCreate && ln('hmo_create')} canEdit={canEdit && ln('hmo_edit')} canDelete={canDelete && ln('hmo_delete')} />
- <AgenciesTab agencies={agencies} canCreate={canCreate} canEdit={canEdit} canDelete={canDelete} onChanged={loadAgencies} />
+ <AgenciesTab agencies={agencies} canCreate={canCreate && ln('ag_create')} canEdit={canEdit && ln('ag_edit')} canDelete={canDelete && ln('ag_delete')} onChanged={loadAgencies} />
'@

Edit-File 'TaxStatutoryManagement.jsx' @'
- import React, { useState } from 'react';
+ import React, { useState, useEffect } from 'react';
- const [tab, setTab] = useState('statutory');
+ const [tab, setTab] = useState('statutory');\n  const tx = (k) => ui(user, 'tax_tabs', k);\n  useEffect(() => {\n    if (!tx('tab_' + tab)) { const f = TABS.find(t => tx('tab_' + t.key)); if (f) setTab(f.key); }\n  }, [user, tab]);
- tabs={TABS}
+ tabs={TABS.filter(t => tx('tab_' + t.key))}
- <TaxBracketsTab canCreate={canCreate} canEdit={canEdit} canDelete={canDelete} />
+ <TaxBracketsTab canCreate={canCreate && tx('tax_create')} canEdit={canEdit && tx('tax_edit')} canDelete={canDelete && tx('tax_delete')} />
- <StatutoryContributionsTab canDelete={canDelete} />
+ <StatutoryContributionsTab canDelete={canDelete && tx('stat_delete')} />
- <StatutoryBracketsTab canCreate={canCreate} canEdit={canEdit} canDelete={canDelete} />
+ <StatutoryBracketsTab canCreate={canCreate && tx('br_create')} canEdit={canEdit && tx('br_edit')} canDelete={canDelete && tx('br_delete')} />
'@

Edit-File 'EmployeeManagement.jsx' @'
- const canCreate = can(user, 'employees', 'create');
+ const canCreate = can(user, 'employees', 'create') && ui(user, 'employees_ui', 'emp_add');
- const canEdit = can(user, 'employees', 'edit');
+ const canEdit = can(user, 'employees', 'edit') && ui(user, 'employees_ui', 'emp_edit');
- onClick={() => toggleStatus(emp)}
+ onClick={() => toggleStatus(emp)} style={ui(user, 'employees_ui', 'emp_deactivate') ? undefined : { display: 'none' }}
- onClick={() => setDocsEmployee(emp)} title="Documents"
+ onClick={() => setDocsEmployee(emp)} style={ui(user, 'employees_ui', 'emp_docs') ? undefined : { display: 'none' }} title="Documents"
- onClick={() => { setShowSensitive(false); setViewEmp(emp); }}
+ onClick={() => { setShowSensitive(false); setViewEmp(emp); }} style={ui(user, 'employees_ui', 'emp_view') ? undefined : { display: 'none' }}
- onClick={() => setShowSensitive((s) => !s)}
+ onClick={() => setShowSensitive((s) => !s)} style={ui(user, 'employees_ui', 'emp_sensitive') ? undefined : { display: 'none' }}
'@

$up = Fnd 'UserManagement.jsx'
$ut = ReadText $up
if ($ut.Contains('payroll_tabs')) { Write-Host 'skip UserManagement.jsx (already patched)' } else {
  Copy-Item $up "$up.bak" -Force

  $labels = @'
recalc: 'Recalculate Leave',
  tab_runs: 'Tab: Payroll Runs', tab_ot: 'Tab: Pay Entries', tab_rb: 'Tab: Reimbursements', tab_db: 'Tab: Disbursement', tab_an: 'Tab: Annual Monitoring',
  run_new: 'Button: New Run', ot_edit: 'Pay Entries: Add / Edit / Delete', rb_edit: 'Reimbursement: Add / Cancel / Delete', db_manage: 'Disbursement: Generate Batch',
  tab_loans: 'Tab: Loans', tab_cashAdvance: 'Tab: Cash Advance', tab_hmo: 'Tab: HMO', tab_agencies: 'Tab: Agencies',
  loan_create: 'Loans: Add', loan_edit: 'Loans: Edit / Cancel / Delete', ca_create: 'Cash Advance: Add', ca_edit: 'Cash Advance: Edit / Cancel / Delete',
  hmo_create: 'HMO: Add', hmo_edit: 'HMO: Edit', hmo_delete: 'HMO: Delete', ag_create: 'Agency: Add', ag_edit: 'Agency: Edit', ag_delete: 'Agency: Delete',
  tab_requests: 'Tab: Requests', tab_balances: 'Tab: Balances', tab_types: 'Tab: Leave Types',
  req_create: 'Requests: File Leave', req_edit: 'Requests: Approve / Reject / Cancel', req_delete: 'Requests: Delete',
  bal_edit: 'Balances: Grant / Prepare / Recalculate', bal_delete: 'Balances: Delete', type_create: 'Leave Type: Add', type_edit: 'Leave Type: Edit', type_delete: 'Leave Type: Delete',
  tab_statutory: 'Tab: Statutory Contributions', tab_tax: 'Tab: Tax Brackets', tab_brackets: 'Tab: Statutory Brackets', stat_delete: 'Statutory: Delete Saved Row',
  tax_create: 'Tax: Add Bracket', tax_edit: 'Tax: Edit Bracket', tax_delete: 'Tax: Delete Bracket', br_create: 'Brackets: Add', br_edit: 'Brackets: Edit', br_delete: 'Brackets: Delete',
  emp_add: 'Button: Add Employee', emp_edit: 'Button: Edit Employee', emp_deactivate: 'Button: Activate / Deactivate', emp_docs: 'Button: Documents', emp_view: 'Button: View Profile', emp_sensitive: 'Button: Show Sensitive Info',
'@
  $ut = $ut.Replace("recalc: 'Recalculate Leave',", $labels.TrimEnd())

  $feat = @'
  { key: 'payroll_tabs', label: 'Payroll Page: Tabs & Buttons', description: 'Pick the tabs this user sees and the buttons that work. If nothing is ticked here, the user keeps everything their Payroll Runs access allows.', actions: ['tab_runs', 'tab_ot', 'tab_rb', 'tab_db', 'tab_an', 'run_new', 'ot_edit', 'rb_edit', 'db_manage'] },
  { key: 'loans_tabs', label: 'Loans & Deductions: Tabs & Buttons', description: 'Pick the tabs and buttons for Loans, Cash Advance, HMO and Agencies. Nothing ticked = everything their Employees access allows.', actions: ['tab_loans', 'tab_cashAdvance', 'tab_hmo', 'tab_agencies', 'loan_create', 'loan_edit', 'ca_create', 'ca_edit', 'hmo_create', 'hmo_edit', 'hmo_delete', 'ag_create', 'ag_edit', 'ag_delete'] },
  { key: 'leave_tabs', label: 'Leave Management: Tabs & Buttons', description: 'Pick the tabs and buttons for Requests, Balances and Leave Types. Nothing ticked = everything their Employees access allows.', actions: ['tab_requests', 'tab_balances', 'tab_types', 'req_create', 'req_edit', 'req_delete', 'bal_edit', 'bal_delete', 'type_create', 'type_edit', 'type_delete'] },
  { key: 'tax_tabs', label: 'Tax & Statutory: Tabs & Buttons', description: 'Pick the tabs and buttons for Statutory Contributions, Tax Brackets and Statutory Brackets. Nothing ticked = everything their Employees access allows.', actions: ['tab_statutory', 'tab_tax', 'tab_brackets', 'stat_delete', 'tax_create', 'tax_edit', 'tax_delete', 'br_create', 'br_edit', 'br_delete'] },
  { key: 'employees_ui', label: 'Employees Page: Buttons', description: 'Pick the buttons on the Employees list. Nothing ticked = everything their Employees access allows.', actions: ['emp_add', 'emp_edit', 'emp_deactivate', 'emp_docs', 'emp_view', 'emp_sensitive'] },
'@
  $rx = "(?m)^(\s*\{ key: 'payroll', label: 'Payroll Runs'.*)$"
  if ($ut -match $rx) {
    $ut = [regex]::Replace($ut, $rx, { param($m) $m.Value.TrimEnd("`r") + "`n" + $feat.TrimEnd() })
  } else { Write-Warning 'UserManagement: payroll feature line not found' }
  SaveText $up $ut
  Write-Host 'patched UserManagement.jsx'
}
Write-Host 'Done. Backups saved as *.bak next to each file.'