import React from 'react';
import { Toaster } from 'react-hot-toast';
import { useAuth, can } from '../../context/AuthContext';
import ThirteenthMonthTab from '../../components/payroll/ThirteenthMonthTab';

const YearEndManagement = () => {
  const { user } = useAuth();
  const canManage = can(user, 'employees', 'manage');

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <Toaster position="top-right" />
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Year-End</h1>
        <p className="text-gray-600 mt-1">13th month pay</p>
      </div>
      <ThirteenthMonthTab canManage={canManage} />
    </div>
  );
};

export default YearEndManagement;