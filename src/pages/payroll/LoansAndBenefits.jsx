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
      tabs={TABS} tab={tab} onTab={setTab}>
      <Toaster position="top-right" />
      {tab === 'loans' && <LoanAccountsTab employees={employees} agencies={agencies} canCreate={canCreate} canEdit={canEdit} />}
      {tab === 'cashAdvance' && <CashAdvanceTab employees={employees} canCreate={canCreate} canEdit={canEdit} />}
      {tab === 'hmo' && <HmoTab employees={employees} canCreate={canCreate} canEdit={canEdit} canDelete={canDelete} />}
      {tab === 'agencies' && <AgenciesTab agencies={agencies} canCreate={canCreate} canEdit={canEdit} canDelete={canDelete} onChanged={loadAgencies} />}
    </PageShell>
  );
};

export default LoansAndBenefits;