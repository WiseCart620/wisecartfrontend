import React, { useState, useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import { api } from '../../services/api';
import { useAuth, can } from '../../context/AuthContext';
import LeaveRequestsTab from '../../components/payroll/LeaveRequestsTab';
import LeaveBalancesTab from '../../components/payroll/LeaveBalancesTab';
import LeaveTypesTab from '../../components/payroll/LeaveTypesTab';

const TABS = [
  { key: 'requests', label: 'Requests' },
  { key: 'balances', label: 'Balances' },
  { key: 'types', label: 'Leave Types' },
];

const LeaveManagement = () => {
  const { user } = useAuth();
  const canCreate = can(user, 'employees', 'create');
  const canEdit = can(user, 'employees', 'edit');
  const canDelete = can(user, 'employees', 'delete');

  const [tab, setTab] = useState('requests');
  const [employees, setEmployees] = useState([]);
  const [leaveTypes, setLeaveTypes] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get('/employees');
        if (res.success) setEmployees((res.data || []).filter(e => e.status === 'ACTIVE'));
      } catch (e) { /* ignore */ }
    })();
    loadTypes();
  }, []);

  const loadTypes = async () => {
    try {
      const res = await api.get('/leave-types');
      if (res.success) setLeaveTypes(res.data || []);
    } catch (e) { /* ignore */ }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <Toaster position="top-right" />
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Leave Management</h1>
        <p className="text-gray-600 mt-1">Leave requests, yearly balances and leave types</p>
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

      {tab === 'requests' && <LeaveRequestsTab employees={employees} leaveTypes={leaveTypes} canCreate={canCreate} canEdit={canEdit} canDelete={canDelete} />}
      {tab === 'balances' && <LeaveBalancesTab employees={employees} leaveTypes={leaveTypes} canEdit={canEdit} canDelete={canDelete} />}
      {tab === 'types' && <LeaveTypesTab leaveTypes={leaveTypes} canCreate={canCreate} canEdit={canEdit} canDelete={canDelete} onChanged={loadTypes} />}
    </div>
  );
};

export default LeaveManagement;