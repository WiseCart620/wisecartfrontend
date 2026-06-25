// src/App.jsx
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import UserManagement from './pages/UserManagement';
import InventoryManagement from './pages/InventoryManagement';
import WarehouseManagement from './pages/WarehouseManagement';
import DeliveryManagement from './pages/DeliveryManagement';
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';
import SalesManagement from './pages/SalesManagement/index';
import ProductManagement from './pages/ProductManagement';
import BranchCompanyManagement from './pages/BranchCompanyManagement/index.jsx';
import WarehouseInventory from './pages/InventoryRecordsManagement/index.jsx';
import NotFound from './pages/NotFound';
import Layout from './components/layout/Layout';
import Supplier from './pages/SupplierManagement';
import ProcurementManagement from './pages/ProcurementManagement/index.jsx';
import TransmittalManagement from './pages/TransmittalManagement';
import { AuthProvider, AuthLoading, ProtectedRoute, AdminRoute, FinanceRoute, AdminOrUserRoute } from './context/AuthContext';
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
          <Routes>
            <Route path="/login" element={<LoginPage />} />

            <Route path="/dashboard" element={
              <ProtectedRoute>
                <AdminOrUserRoute>
                  <Layout>
                    <Dashboard />
                  </Layout>
                </AdminOrUserRoute>
              </ProtectedRoute>
            } />


            <Route path="/supplier" element={
              <ProtectedRoute>
                <AdminOrUserRoute>
                  <Layout>
                    <Supplier />
                  </Layout>
                </AdminOrUserRoute>
              </ProtectedRoute>
            } />


            <Route path="/procurement" element={
              <ProtectedRoute>
                <AdminOrUserRoute>
                  <Layout>
                    <ProcurementManagement />
                  </Layout>
                </AdminOrUserRoute>
              </ProtectedRoute>
            } />

            <Route path="/transmittals" element={
              <ProtectedRoute>
                <AdminOrUserRoute>
                  <Layout>
                    <TransmittalManagement />
                  </Layout>
                </AdminOrUserRoute>
              </ProtectedRoute>
            } />




            <Route path="/deliveries" element={
              <ProtectedRoute>
                <Layout>
                  <DeliveryManagement />
                </Layout>
              </ProtectedRoute>
            } />

            <Route path="/warehouse-inventory" element={
              <ProtectedRoute>
                <AdminOrUserRoute>
                  <Layout>
                    <WarehouseInventory />
                  </Layout>
                </AdminOrUserRoute>
              </ProtectedRoute>
            } />


            <Route path="/users" element={
              <ProtectedRoute>
                <AdminRoute>
                  <Layout>
                    <UserManagement />
                  </Layout>
                </AdminRoute>
              </ProtectedRoute>
            } />

            <Route path="/inventory" element={
              <ProtectedRoute>
                <AdminOrUserRoute>
                  <Layout>
                    <InventoryManagement />
                  </Layout>
                </AdminOrUserRoute>
              </ProtectedRoute>
            } />

            <Route path="/sales" element={
              <ProtectedRoute>
                <Layout>
                  <SalesManagement />
                </Layout>
              </ProtectedRoute>
            } />

            <Route path="/warehouse" element={
              <ProtectedRoute>
                <AdminOrUserRoute>
                  <Layout>
                    <WarehouseManagement />
                  </Layout>
                </AdminOrUserRoute>
              </ProtectedRoute>
            } />

            <Route path="/products" element={
              <ProtectedRoute>
                <AdminOrUserRoute>
                  <Layout>
                    <ProductManagement />
                  </Layout>
                </AdminOrUserRoute>
              </ProtectedRoute>
            } />

            <Route path="/branches" element={
              <ProtectedRoute>
                <AdminOrUserRoute>
                  <Layout>
                    <BranchCompanyManagement />
                  </Layout>
                </AdminOrUserRoute>
              </ProtectedRoute>
            } />

            {/* Redirect root to dashboard */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />

            {/* 404 Page */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthLoading>
      </AuthProvider>
    </Router>
  );
}

export default App;