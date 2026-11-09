import { ui } from '../../utils/uiAccess';
import React, { useState, useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import { api } from '../../services/api';
import { useAuth, can } from '../../context/AuthContext';
import LoanAccountsTab from '../../components/payroll/LoanAccountsTab';
import HmoTab from '../../components/payroll/HmoTab';
import AgenciesTab from '../../components/payroll/AgenciesTab';
import CashAdvanceTab from '../../components/payroll/CashAdvanceTab';
import PageShell from '../../components/payroll/PageShell';

const TABS = [
  { key: 'loans', label: 'Loans' },
  { key: 'cashAdvance', label: 'Cash Advance' },
  { key: 'hmo', label: 'HMO' },
  { key: 'agencies', label: 'Agencies' },
];

const LoansAndBenefits = () => {
  const { user } = useAuth();
  const canCreate = can(user, 'employees', 'create');
  const canEdit = can(user, 'employees', 'edit');
  const canDelete = can(user, 'employees', 'delete');

  const [tab, setTab] = useState('loans');
  const ln = (k) => ui(user, 'loans_tabs', k);
  useEffect(() => {
    if (!ln('tab_' + tab)) { const f = TABS.find(t => ln('tab_' + t.key)); if (f) setTab(f.key); }
  }, [user, tab]);
  const [employees, setEmployees] = useState([]);
  const [agencies, setAgencies] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get('/employees');
        if (res.success) setEmployees((res.data || []).filter(e => e.status === 'ACTIVE'));
      } catch (e) { /* ignore */ }
    })();
    loadAgencies();
  }, []);

  const loadAgencies = async () => {
    try {
      const res = await api.get('/agencies');
      if (res.success) setAgencies(res.data || []);
    } catch (e) { /* ignore */ }
  };

  return (
    <PageShell title="Loans & Other Deductions"
      subtitle="Employee loans, cash advances, HMO and government agencies"
      tabs={TABS.filter(t => ln('tab_' + t.key))} tab={tab} onTab={setTab}>
      <Toaster position="top-right" />
      {tab === 'loans' && <LoanAccountsTab employees={employees} agencies={agencies} canCreate={canCreate && ln('loan_create')} canEdit={canEdit && ln('loan_edit')} />}
      {tab === 'cashAdvance' && <CashAdvanceTab employees={employees} canCreate={canCreate && ln('ca_create')} canEdit={canEdit && ln('ca_edit')} />}
      {tab === 'hmo' && <HmoTab employees={employees} canCreate={canCreate && ln('hmo_create')} canEdit={canEdit && ln('hmo_edit')} canDelete={canDelete && ln('hmo_delete')} />}
      {tab === 'agencies' && <AgenciesTab agencies={agencies} canCreate={canCreate && ln('ag_create')} canEdit={canEdit && ln('ag_edit')} canDelete={canDelete && ln('ag_delete')} onChanged={loadAgencies} />}
    </PageShell>
  );
};

export default LoansAndBenefits;