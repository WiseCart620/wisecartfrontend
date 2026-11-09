import React from 'react';
import { Toaster } from 'react-hot-toast';
import { Navigate } from 'react-router-dom';
import { useAuth, can, isSelfOnly, uiAllowed } from '../../context/AuthContext';
import ThirteenthMonthTab from '../../components/payroll/ThirteenthMonthTab';
import PageShell from '../../components/payroll/PageShell';

const YearEndManagementInner = () => {
  const { user } = useAuth();
  const canManage = can(user, 'employees', 'manage');

  return (
    <PageShell title="Year-End" subtitle="13th month pay">
      <Toaster position="top-right" />
      <ThirteenthMonthTab canManage={canManage} />
    </PageShell>
  );
};

const YearEndManagement = () => {
  const { user } = useAuth();
  if (!uiAllowed(user, 'pages_ui', 'page_yearend')) return <Navigate to="/welcome" replace />;
  return <YearEndManagementInner />;
};

export default YearEndManagement;