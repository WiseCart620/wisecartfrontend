import React, { useState } from 'react';
import { Toaster } from 'react-hot-toast';
import { useAuth, can } from '../../context/AuthContext';
import TaxBracketsTab from '../../components/payroll/TaxBracketsTab';
import StatutoryContributionsTab from '../../components/payroll/StatutoryContributionsTab';

const TABS = [
  { key: 'tax', label: 'Tax Brackets' },
  { key: 'statutory', label: 'Statutory Contributions' },
];

const TaxStatutoryManagement = () => {
  const { user } = useAuth();
  const canCreate = can(user, 'employees', 'create');
  const canEdit = can(user, 'employees', 'edit');
  const canDelete = can(user, 'employees', 'delete');

  const [tab, setTab] = useState('tax');

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <Toaster position="top-right" />
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Tax & Statutory</h1>
        <p className="text-gray-600 mt-1">Withholding tax brackets and SSS / PhilHealth / Pag-IBIG contributions</p>
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

      {tab === 'tax' && <TaxBracketsTab canCreate={canCreate} canEdit={canEdit} canDelete={canDelete} />}
      {tab === 'statutory' && <StatutoryContributionsTab canDelete={canDelete} />}
    </div>
  );
};

export default TaxStatutoryManagement;