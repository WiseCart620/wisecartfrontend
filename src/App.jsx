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
import { AuthProvider, AuthLoading, ProtectedRoute, AdminRoute, FinanceRoute } from './context/AuthContext';
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
                <FinanceRoute>
                  <Layout>
                    <Dashboard />
                  </Layout>
                </FinanceRoute>
              </ProtectedRoute>
            } />


            <Route path="/supplier" element={
              <ProtectedRoute>
                <FinanceRoute>
                  <Layout>
                    <Supplier />
                  </Layout>
                </FinanceRoute>
              </ProtectedRoute>
            } />


            <Route path="/procurement" element={
              <ProtectedRoute>
                <FinanceRoute>
                  <Layout>
                    <ProcurementManagement />
                  </Layout>
                </FinanceRoute>
              </ProtectedRoute>
            } />

            <Route path="/transmittals" element={
              <ProtectedRoute>
                <FinanceRoute>
                  <Layout>
                    <TransmittalManagement />
                  </Layout>
                </FinanceRoute>
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
                <FinanceRoute>
                  <Layout>
                    <WarehouseInventory />
                  </Layout>
                </FinanceRoute>
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
                <FinanceRoute>
                  <Layout>
                    <InventoryManagement />
                  </Layout>
                </FinanceRoute>
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
                <FinanceRoute>
                  <Layout>
                    <WarehouseManagement />
                  </Layout>
                </FinanceRoute>
              </ProtectedRoute>
            } />

            <Route path="/products" element={
              <ProtectedRoute>
                <FinanceRoute>
                  <Layout>
                    <ProductManagement />
                  </Layout>
                </FinanceRoute>
              </ProtectedRoute>
            } />

            <Route path="/branches" element={
              <ProtectedRoute>
                <FinanceRoute>
                  <Layout>
                    <BranchCompanyManagement />
                  </Layout>
                </FinanceRoute>
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