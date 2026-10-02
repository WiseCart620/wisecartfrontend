import React from 'react';
import { Toaster } from 'react-hot-toast';
import { useAuth, can } from '../../context/AuthContext';
import ThirteenthMonthTab from '../../components/payroll/ThirteenthMonthTab';
import PageShell from '../../components/payroll/PageShell';

const YearEndManagement = () => {
  const { user } = useAuth();
  const canManage = can(user, 'employees', 'manage');

  return (
    <PageShell title="Year-End" subtitle="13th month pay">
      <Toaster position="top-right" />
      <ThirteenthMonthTab canManage={canManage} />
    </PageShell>
  );
};

export default YearEndManagement;