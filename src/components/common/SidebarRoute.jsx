import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { pageAllowed } from '../../utils/sidebarAccess';

// Route guard: blocks a page when the user was not given it in User Management (Payroll Pages matrix).
const SidebarRoute = ({ page, children }) => {
  const { user } = useAuth();
  if (!pageAllowed(user, page)) return <Navigate to="/welcome" replace />;
  return children;
};

export default SidebarRoute;