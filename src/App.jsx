// src/App.jsx
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import UserManagement from './pages/UserManagement';
import Welcome from './pages/Welcome';
import InventoryManagement from './pages/InventoryManagement';
import WarehouseManagement from './pages/WarehouseManagement';
import DeliveryManagement from './pages/DeliveryManagement';
import PayTypeManagement from './pages/payroll/PayTypeManagement';
import LeaveManagement from './pages/payroll/LeaveManagement';
import TaxStatutoryManagement from './pages/payroll/TaxStatutoryManagement.jsx';
import YearEndManagement from './pages/payroll/YearEndManagement.jsx';
import PayrollRunManagement from './pages/payroll/PayrollRunManagement.jsx';
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';
import SalesManagement from './pages/SalesManagement/index.jsx';
import EmployeeManagement from './pages/payroll/EmployeeManagement.jsx';
import LoansAndBenefits from './pages/payroll/LoansAndBenefits';
import ProductManagement from './pages/ProductManagement';
import BranchCompanyManagement from './pages/BranchCompanyManagement/index.jsx';
import WarehouseInventory from './pages/InventoryRecordsManagement/index.jsx';
import NotFound from './pages/NotFound';
import Layout from './components/layout/Layout';
import Supplier from './pages/SupplierManagement';
import ProcurementManagement from './pages/ProcurementManagement/index.jsx';
import TransmittalManagement from './pages/TransmittalManagement';
import { AuthProvider, AuthLoading, ProtectedRoute, FinanceRoute, AdminOrUserRoute, SuperAdminRoute, PermissionRoute, ActionRoute } from './context/AuthContext';
import { ReferenceDataProvider } from './context/ReferenceDataContext';
import { startActivityTracking, stopActivityTracking } from './services/api';
import { useEffect } from 'react';
import { useAuth, hasPermission } from './context/AuthContext';

// Sends the user to the first page shown in their sidebar (same order as Sidebar.jsx).
const HomeRedirect = () => {
  const { user } = useAuth();

  if (!user) return <Navigate to="/login" replace />;

  const isSuperAdmin = user.role === 'SUPER_ADMIN';
  const allowed = (feature) => isSuperAdmin || hasPermission(user, feature);

  // Same order as the sidebar, top to bottom
  const candidates = [
    { to: '/dashboard', ok: allowed('dashboard') },
    { to: '/warehouse-inventory', ok: allowed('warehouse_inventory') },
    { to: '/inventory', ok: allowed('inventory') },
    { to: '/procurement', ok: allowed('procurement') },
    { to: '/employees', ok: allowed('employees') },
    { to: '/deliveries', ok: allowed('deliveries') },
    { to: '/sales', ok: allowed('sales') },
    { to: '/warehouse', ok: allowed('warehouse') },
    { to: '/branches', ok: allowed('branches') },
    { to: '/products', ok: allowed('products') },
    { to: '/supplier', ok: allowed('supplier') },
    { to: '/users', ok: isSuperAdmin },
  ];

  const first = candidates.find((c) => c.ok);
  return <Navigate to={first ? first.to : '/welcome'} replace />;
};
function App() {
  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (token) {
      startActivityTracking();
    }
    return () => stopActivityTracking();
  }, []);

  return (
    <Router>
      <AuthProvider>
        <AuthLoading>
          <ReferenceDataProvider>
            <Routes>
              <Route path="/login" element={<LoginPage />} />

              <Route path="/welcome" element={
                <ProtectedRoute>
                  <Layout>
                    <Welcome />
                  </Layout>
                </ProtectedRoute>
              } />

              <Route path="/dashboard" element={
                <ProtectedRoute>
                  <PermissionRoute feature="dashboard">
                    <Layout>
                      <Dashboard />
                    </Layout>
                  </PermissionRoute>
                </ProtectedRoute>
              } />

              <Route path="/supplier" element={
                <ProtectedRoute>
                  <AdminOrUserRoute>
                    <PermissionRoute feature="supplier">
                      <Layout>
                        <Supplier />
                      </Layout>
                    </PermissionRoute>
                  </AdminOrUserRoute>
                </ProtectedRoute>
              } />

              <Route path="/procurement" element={
                <ProtectedRoute>
                  <AdminOrUserRoute>
                    <PermissionRoute feature="procurement">
                      <Layout>
                        <ProcurementManagement />
                      </Layout>
                    </PermissionRoute>
                  </AdminOrUserRoute>
                </ProtectedRoute>
              } />

              <Route path="/transmittals" element={
                <ProtectedRoute>
                  <AdminOrUserRoute>
                    <PermissionRoute feature="deliveries">
                      <ActionRoute feature="deliveries" action="transmittal" fallback="/deliveries">
                        <Layout>
                          <TransmittalManagement />
                        </Layout>
                      </ActionRoute>
                    </PermissionRoute>
                  </AdminOrUserRoute>
                </ProtectedRoute>
              } />

              <Route path="/deliveries" element={
                <ProtectedRoute>
                  <PermissionRoute feature="deliveries">
                    <Layout>
                      <DeliveryManagement />
                    </Layout>
                  </PermissionRoute>
                </ProtectedRoute>
              } />

              <Route path="/warehouse-inventory" element={
                <ProtectedRoute>
                  <AdminOrUserRoute>
                    <PermissionRoute feature="warehouse_inventory">
                      <Layout>
                        <WarehouseInventory />
                      </Layout>
                    </PermissionRoute>
                  </AdminOrUserRoute>
                </ProtectedRoute>
              } />

              <Route path="/users" element={
                <ProtectedRoute>
                  <SuperAdminRoute>
                    <Layout>
                      <UserManagement />
                    </Layout>
                  </SuperAdminRoute>
                </ProtectedRoute>
              } />

              <Route path="/inventory" element={
                <ProtectedRoute>
                  <AdminOrUserRoute>
                    <PermissionRoute feature="inventory">
                      <Layout>
                        <InventoryManagement />
                      </Layout>
                    </PermissionRoute>
                  </AdminOrUserRoute>
                </ProtectedRoute>
              } />

              <Route path="/sales" element={
                <ProtectedRoute>
                  <PermissionRoute feature="sales">
                    <Layout>
                      <SalesManagement />
                    </Layout>
                  </PermissionRoute>
                </ProtectedRoute>
              } />

              <Route path="/sales/journal" element={
                <ProtectedRoute>
                  <PermissionRoute feature="sales">
                    <ActionRoute feature="sales" action="invoice" fallback="/sales">
                      <Layout>
                        <SalesManagement />
                      </Layout>
                    </ActionRoute>
                  </PermissionRoute>
                </ProtectedRoute>
              } />

              <Route path="/sales/report" element={
                <ProtectedRoute>
                  <PermissionRoute feature="sales">
                    <ActionRoute feature="sales" action="report" fallback="/sales">
                      <Layout>
                        <SalesManagement />
                      </Layout>
                    </ActionRoute>
                  </PermissionRoute>
                </ProtectedRoute>
              } />

              <Route path="/warehouse" element={
                <ProtectedRoute>
                  <AdminOrUserRoute>
                    <PermissionRoute feature="warehouse">
                      <Layout>
                        <WarehouseManagement />
                      </Layout>
                    </PermissionRoute>
                  </AdminOrUserRoute>
                </ProtectedRoute>
              } />

              <Route path="/products" element={
                <ProtectedRoute>
                  <AdminOrUserRoute>
                    <PermissionRoute feature="products">
                      <Layout>
                        <ProductManagement />
                      </Layout>
                    </PermissionRoute>
                  </AdminOrUserRoute>
                </ProtectedRoute>
              } />

              <Route path="/branches" element={
                <ProtectedRoute>
                  <AdminOrUserRoute>
                    <PermissionRoute feature="branches">
                      <Layout>
                        <BranchCompanyManagement />
                      </Layout>
                    </PermissionRoute>
                  </AdminOrUserRoute>
                </ProtectedRoute>
              } />

              <Route path="/employees" element={
                <ProtectedRoute>
                  <PermissionRoute feature="employees">
                    <Layout>
                      <EmployeeManagement />
                    </Layout>
                  </PermissionRoute>
                </ProtectedRoute>
              } />

              <Route path="/pay-types" element={
                <ProtectedRoute>
                  <PermissionRoute feature="employees">
                    <Layout>
                      <PayTypeManagement />
                    </Layout>
                  </PermissionRoute>
                </ProtectedRoute>
              } />

              <Route path="/loans-benefits" element={
                <ProtectedRoute>
                  <PermissionRoute feature="employees">
                    <Layout>
                      <LoansAndBenefits />
                    </Layout>
                  </PermissionRoute>
                </ProtectedRoute>
              } />

              <Route path="/leave" element={
                <ProtectedRoute>
                  <PermissionRoute feature="employees">
                    <Layout>
                      <LeaveManagement />
                    </Layout>
                  </PermissionRoute>
                </ProtectedRoute>
              } />

              <Route path="/tax-statutory" element={
                <ProtectedRoute>
                  <PermissionRoute feature="employees">
                    <Layout>
                      <TaxStatutoryManagement />
                    </Layout>
                  </PermissionRoute>
                </ProtectedRoute>
              } />

              <Route path="/payroll-runs" element={
                <ProtectedRoute>
                  <PermissionRoute feature="employees">
                    <Layout>
                      <PayrollRunManagement />
                    </Layout>
                  </PermissionRoute>
                </ProtectedRoute>
              } />

              <Route path="/year-end" element={
                <ProtectedRoute>
                  <PermissionRoute feature="employees">
                    <Layout>
                      <YearEndManagement />
                    </Layout>
                  </PermissionRoute>
                </ProtectedRoute>
              } />

              {/* Redirect root to the first page in the user's sidebar */}
              <Route path="/" element={<HomeRedirect />} />

              {/* 404 Page */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </ReferenceDataProvider>
        </AuthLoading>
      </AuthProvider>
    </Router>
  );
}

export default App;