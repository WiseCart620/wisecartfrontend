// src/App.jsx
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import UserManagement from './pages/UserManagement';
import InventoryManagement from './pages/InventoryManagement';
import WarehouseManagement from './pages/WarehouseManagement';
import DeliveryManagement from './pages/DeliveryManagement';
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';
import SalesManagement from './pages/SalesManagement';
import ProductManagement from './pages/ProductManagement';
import BranchCompanyManagement from './pages/BranchCompanyManagement/index';
import WarehouseInventory from './pages/InventoryRecordsManagement/index.jsx';
import NotFound from './pages/NotFound';
import Layout from './components/layout/Layout';
import Supplier from './pages/SupplierManagement';
import ProcurementManagement from './pages/ProcurementManagement/index.jsx';
import TransmittalManagement from './pages/TransmittalManagement';
import { AuthProvider, AuthLoading, ProtectedRoute, AdminRoute } from './context/AuthContext';
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
                <Layout>
                  <Dashboard />
                </Layout>
              </ProtectedRoute>
            } />


            <Route path="/supplier" element={
              <ProtectedRoute>
                <Layout>
                  <Supplier />
                </Layout>
              </ProtectedRoute>
            } />


            <Route path="/procurement" element={
              <ProtectedRoute>
                <Layout>
                  <ProcurementManagement />
                </Layout>
              </ProtectedRoute>
            } />

            <Route path="/transmittals" element={
              <ProtectedRoute>
                <Layout>
                  <TransmittalManagement />
                </Layout>
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
                <Layout>
                  <WarehouseInventory />
                </Layout>
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
                <Layout>
                  <InventoryManagement />
                </Layout>
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
                <Layout>
                  <WarehouseManagement />
                </Layout>
              </ProtectedRoute>
            } />

            <Route path="/products" element={
              <ProtectedRoute>
                <Layout>
                  <ProductManagement />
                </Layout>
              </ProtectedRoute>
            } />

            <Route path="/branches" element={
              <ProtectedRoute>
                <Layout>
                  <BranchCompanyManagement />
                </Layout>
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