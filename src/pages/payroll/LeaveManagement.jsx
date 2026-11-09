import React, { useState, useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import { Navigate } from 'react-router-dom';
import { api } from '../../services/api';
import { useAuth, can, canUi, uiAllowed } from '../../context/AuthContext';
import LeaveRequestsTab from '../../components/payroll/LeaveRequestsTab';
import LeaveBalancesTab from '../../components/payroll/LeaveBalancesTab';
import LeaveTypesTab from '../../components/payroll/LeaveTypesTab';
import PageShell from '../../components/payroll/PageShell';

const TABS = [
  { key: 'requests', label: 'Requests' },
  { key: 'balances', label: 'Balances' },
  { key: 'types', label: 'Leave Types' },
];
const TAB_KEYS = { requests: 'tab_requests', balances: 'tab_balances', types: 'tab_types' };

const LeaveManagementInner = () => {
  const { user } = useAuth();
  const ui = (k) => canUi(user, 'leave_tabs', k);
  const canCreate = can(user, 'employees', 'create');
  const canEdit = can(user, 'employees', 'edit');
  const canDelete = can(user, 'employees', 'delete');

  const visibleTabs = TABS.filter((t) => uiAllowed(user, 'leave_tabs', TAB_KEYS[t.key]));
  const [tab, setTab] = useState(visibleTabs[0]?.key || 'requests');
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
      tabs={visibleTabs} tab={tab} onTab={setTab}>
      <Toaster position="top-right" />
      {tab === 'requests' && <LeaveRequestsTab employees={employees} leaveTypes={leaveTypes} canCreate={canCreate && ui('req_create')} canEdit={canEdit && ui('req_edit')} canDelete={canDelete && ui('req_delete')} />}
      {tab === 'balances' && <LeaveBalancesTab employees={employees} leaveTypes={leaveTypes} canEdit={canEdit && ui('bal_edit')} canDelete={canDelete && ui('bal_delete')} />}
      {tab === 'types' && <LeaveTypesTab leaveTypes={leaveTypes} canCreate={canCreate && ui('type_create')} canEdit={canEdit && ui('type_edit')} canDelete={canDelete && ui('type_delete')} onChanged={loadTypes} />}
    </PageShell>
  );
};

const LeaveManagement = () => {
  const { user } = useAuth();
  if (!uiAllowed(user, 'pages_ui', 'page_leave')) return <Navigate to="/welcome" replace />;
  return <LeaveManagementInner />;
};

export default LeaveManagement;