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
import BranchCompanyManagement from './pages/BranchCompanyManagement';
import WarehouseInventory from './pages/InventoryRecord';
import Supplier from './pages/SupplierInventoryManagement';
import NotFound from './pages/NotFound';
import Layout from './components/layout/Layout';
import { AuthProvider, AuthLoading, ProtectedRoute, AdminRoute } from './context/AuthContext';

function App() {
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


            

            <Route path="/deliveries" element={
              <ProtectedRoute>
                <Layout>
                  <DeliveryManagement />
                </Layout>
              </ProtectedRoute>
            } />

            <Route path="/warehouseinventory" element={
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