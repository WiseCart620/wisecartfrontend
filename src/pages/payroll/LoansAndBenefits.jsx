import React, { useState, useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import { Navigate } from 'react-router-dom';
import { api } from '../../services/api';
import { useAuth, can, canUi, uiAllowed } from '../../context/AuthContext';
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
const TAB_KEYS = { loans: 'tab_loans', cashAdvance: 'tab_cashAdvance', hmo: 'tab_hmo', agencies: 'tab_agencies' };

const LoansAndBenefitsInner = () => {
  const { user } = useAuth();
  const ui = (k) => canUi(user, 'loans_tabs', k);
  const canCreate = can(user, 'employees', 'create');
  const canEdit = can(user, 'employees', 'edit');
  const canDelete = can(user, 'employees', 'delete');

  const visibleTabs = TABS.filter((t) => uiAllowed(user, 'loans_tabs', TAB_KEYS[t.key]));
  const [tab, setTab] = useState(visibleTabs[0]?.key || 'loans');
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
      tabs={visibleTabs} tab={tab} onTab={setTab}>
      <Toaster position="top-right" />
      {tab === 'loans' && <LoanAccountsTab employees={employees} agencies={agencies} canCreate={canCreate && ui('loan_create')} canEdit={canEdit && ui('loan_edit')} />}
      {tab === 'cashAdvance' && <CashAdvanceTab employees={employees} canCreate={canCreate && ui('ca_create')} canEdit={canEdit && ui('ca_edit')} />}
      {tab === 'hmo' && <HmoTab employees={employees} canCreate={canCreate && ui('hmo_create')} canEdit={canEdit && ui('hmo_edit')} canDelete={canDelete && ui('hmo_delete')} />}
      {tab === 'agencies' && <AgenciesTab agencies={agencies} canCreate={canCreate && ui('ag_create')} canEdit={canEdit && ui('ag_edit')} canDelete={canDelete && ui('ag_delete')} onChanged={loadAgencies} />}
    </PageShell>
  );
};

const LoansAndBenefits = () => {
  const { user } = useAuth();
  if (!uiAllowed(user, 'pages_ui', 'page_loans')) return <Navigate to="/welcome" replace />;
  return <LoansAndBenefitsInner />;
};

export default LoansAndBenefits;