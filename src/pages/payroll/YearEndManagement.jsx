import React, { useState, useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import { api } from '../../services/api';
import { useAuth, can } from '../../context/AuthContext';
import ThirteenthMonthTab from '../../components/payroll/ThirteenthMonthTab';
import DisbursementTab from '../../components/payroll/DisbursementTab';

const TABS = [
  { key: 'thirteenth', label: '13th Month' },
  { key: 'disbursement', label: 'Disbursement' },
];

const YearEndManagement = () => {
  const { user } = useAuth();
  const canManage = can(user, 'employees', 'manage');

  const [tab, setTab] = useState('thirteenth');
  const [approvedRuns, setApprovedRuns] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get('/payroll/runs');
        if (res.success) {
          setApprovedRuns((res.data || []).filter(r => r.status === 'APPROVED' || r.status === 'PAID'));
        }
      } catch (e) { /* ignore */ }
    })();
  }, []);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <Toaster position="top-right" />
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Year-End & Disbursement</h1>
        <p className="text-gray-600 mt-1">13th month pay and payroll disbursement batches</p>
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

      {tab === 'thirteenth' && <ThirteenthMonthTab canManage={canManage} />}
      {tab === 'disbursement' && <DisbursementTab approvedRuns={approvedRuns} canManage={canManage} />}
    </div>
  );
};

export default YearEndManagement;