import React, { useState, useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import { api } from '../../services/api';
import { useAuth, can } from '../../context/AuthContext';
import LoanAccountsTab from '../../components/payroll/LoanAccountsTab';
import HmoTab from '../../components/payroll/HmoTab';
import AgenciesTab from '../../components/payroll/AgenciesTab';

const TABS = [
  { key: 'loans', label: 'Loans' },
  { key: 'cash', label: 'Cash Advances' },
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
    <div className="p-6 max-w-7xl mx-auto">
      <Toaster position="top-right" />
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Loans & Benefits</h1>
        <p className="text-gray-600 mt-1">Employee loans, cash advances, HMO and government agencies</p>
      </div>

      <div className="flex gap-1 border-b border-gray-200 mb-6">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${tab === t.key ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-500 hover:text-gray-800'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'loans' && <LoanAccountsTab kind="loans" employees={employees} agencies={agencies} canCreate={canCreate} canEdit={canEdit} />}
      {tab === 'cash' && <LoanAccountsTab kind="cash" employees={employees} agencies={agencies} canCreate={canCreate} canEdit={canEdit} />}
      {tab === 'hmo' && <HmoTab employees={employees} canCreate={canCreate} canEdit={canEdit} canDelete={canDelete} />}
      {tab === 'agencies' && <AgenciesTab agencies={agencies} canCreate={canCreate} canEdit={canEdit} canDelete={canDelete} onChanged={loadAgencies} />}
    </div>
  );
};

export default LoansAndBenefits;