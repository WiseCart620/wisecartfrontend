import { ui } from '../../utils/uiAccess';
import React, { useState, useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import { api } from '../../services/api';
import { useAuth, can } from '../../context/AuthContext';
import LeaveRequestsTab from '../../components/payroll/LeaveRequestsTab';
import LeaveBalancesTab from '../../components/payroll/LeaveBalancesTab';
import LeaveTypesTab from '../../components/payroll/LeaveTypesTab';
import PageShell from '../../components/payroll/PageShell';

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
  const lv = (k) => ui(user, 'leave_tabs', k);
  useEffect(() => {
    if (!lv('tab_' + tab)) { const f = TABS.find(t => lv('tab_' + t.key)); if (f) setTab(f.key); }
  }, [user, tab]);
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
    <PageShell title="Leave Management"
      subtitle="Leave requests, yearly balances and leave types"
      tabs={TABS.filter(t => lv('tab_' + t.key))} tab={tab} onTab={setTab}>
      <Toaster position="top-right" />
      {tab === 'requests' && <LeaveRequestsTab employees={employees} leaveTypes={leaveTypes} canCreate={canCreate && lv('req_create')} canEdit={canEdit && lv('req_edit')} canDelete={canDelete && lv('req_delete')} />}
      {tab === 'balances' && <LeaveBalancesTab employees={employees} leaveTypes={leaveTypes} canEdit={canEdit && lv('bal_edit')} canDelete={canDelete && lv('bal_delete')} />}
      {tab === 'types' && <LeaveTypesTab leaveTypes={leaveTypes} canCreate={canCreate && lv('type_create')} canEdit={canEdit && lv('type_edit')} canDelete={canDelete && lv('type_delete')} onChanged={loadTypes} />}
    </PageShell>
  );
};

export default LeaveManagement;