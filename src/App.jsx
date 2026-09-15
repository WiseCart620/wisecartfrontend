// src/App.jsx
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import UserManagement from './pages/UserManagement';
import Welcome from './pages/Welcome';
import InventoryManagement from './pages/InventoryManagement';
import WarehouseManagement from './pages/WarehouseManagement';
import DeliveryManagement from './pages/DeliveryManagement';
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';
import SalesManagement from './pages/SalesManagement/index.jsx';
import ProductManagement from './pages/ProductManagement';
import BranchCompanyManagement from './pages/BranchCompanyManagement/index.jsx';
import WarehouseInventory from './pages/InventoryRecordsManagement/index.jsx';
import NotFound from './pages/NotFound';
import Layout from './components/layout/Layout';
import Supplier from './pages/SupplierManagement';
import ProcurementManagement from './pages/ProcurementManagement/index.jsx';
import TransmittalManagement from './pages/TransmittalManagement';
import { AuthProvider, AuthLoading, ProtectedRoute, FinanceRoute, AdminOrUserRoute, SuperAdminRoute, PermissionRoute } from './context/AuthContext';
import { ReferenceDataProvider } from './context/ReferenceDataContext';
import { startActivityTracking, stopActivityTracking } from './services/api';
import { useEffect } from 'react';

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
                      <Layout>
                        <TransmittalManagement />
                      </Layout>
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
                    <PermissionRoute feature="inventory">
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

              {/* Redirect root to dashboard */}
              <Route path="/" element={<Navigate to="/welcome" replace />} />

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