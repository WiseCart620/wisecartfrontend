// pages/UserManagement.jsx
import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Search, X, User, Shield, UserCheck, UserX, Eye, EyeOff, ChevronLeft, ChevronRight } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import { api } from '../services/api';
import { LoadingOverlay } from '../components/common/LoadingOverlay';
import Pagination from '../components/common/Pagination';
import { useIsSuperAdmin } from '../context/AuthContext';

const ACTION_LABELS = {
  view: 'View', create: 'Create', edit: 'Edit', delete: 'Delete',
  invoice: 'Invoice', report: 'Reports', summary: 'Summary',
  cancel: 'Cancel', print: 'Print', confirm: 'Confirm',
  payment: 'Payments', transmittal: 'Transmittals', manage: 'Approve Payroll',
  submit: 'Submit', approve: 'Approve / Reject', download: 'Download Docs', pay: 'Mark Paid',
};

const FILTERS = {
  sales: [
    { key: 'search', label: 'Search' },
    { key: 'company', label: 'Company' },
    { key: 'branch', label: 'Branch' },
    { key: 'status', label: 'Status' },
    { key: 'date', label: 'Date Range' },
    { key: 'product', label: 'Product' },
  ],
  deliveries: [
    { key: 'search', label: 'Search' },
    { key: 'company', label: 'Company' },
    { key: 'branch', label: 'Branch' },
    { key: 'warehouse', label: 'Warehouse' },
    { key: 'status', label: 'Status' },
    { key: 'date', label: 'Date Range' },
    { key: 'product', label: 'Product' },
    { key: 'receiptNumber', label: 'Receipt #' },
    { key: 'poNumber', label: 'PO #' },
  ],
  inventory: [
    { key: 'search', label: 'Search' },
    { key: 'status', label: 'Status' },
    { key: 'type', label: 'Type' },
    { key: 'warehouse', label: 'Warehouse' },
    { key: 'branch', label: 'Branch' },
    { key: 'date', label: 'Date Range' },
    { key: 'product', label: 'Product/UPC/SKU' },
  ],
  warehouse_inventory: [
    { key: 'search', label: 'Search' },
    { key: 'company', label: 'Company' },
    { key: 'branch', label: 'Branch' },
    { key: 'warehouse', label: 'Warehouse' },
    { key: 'product', label: 'Product' },
    { key: 'quantity', label: 'Stock Qty' },
    { key: 'date', label: 'Date Range' },
    { key: 'type', label: 'Transaction Type' },
    { key: 'verifiedBy', label: 'Verified By' },
    { key: 'items', label: 'Item Count' },
  ],
};

const FEATURES = [
  { key: 'dashboard', label: 'Dashboard', description: 'Business analytics, charts, and performance overview', actions: ['view'] },
  { key: 'alerts', label: 'Alerts', description: 'Low-stock and system alerts', actions: ['view', 'edit', 'delete'] },
  { key: 'sales', label: 'Sales', description: 'Create and manage sales orders, invoices, and reports', actions: ['view', 'create', 'edit', 'delete', 'invoice', 'report', 'summary'] },
  { key: 'deliveries', label: 'Deliveries', description: 'Track and manage delivery transactions', actions: ['view', 'create', 'edit', 'delete', 'cancel', 'print', 'transmittal'] },
  { key: 'warehouse_inventory', label: 'Warehouse Inventory', description: 'Warehouse stock levels and confirmations', actions: ['view', 'create', 'edit', 'delete', 'confirm'] },
  { key: 'inventory', label: 'Inventory Record', description: 'Stock movement records across all locations', actions: ['view', 'create', 'edit', 'delete', 'confirm'] },
  { key: 'procurement', label: 'Procurement', description: 'Inventory requests, RPQ, purchase orders, and payments', actions: ['view', 'create', 'edit', 'delete', 'confirm', 'payment'] },
  { key: 'warehouse', label: 'Warehouse', description: 'Warehouse locations and configuration', actions: ['view', 'create', 'edit', 'delete'] },
  { key: 'branches', label: 'Branches & Companies', description: 'Company and branch records', actions: ['view', 'create', 'edit', 'delete'] },
  { key: 'products', label: 'Products', description: 'Product catalog and variations', actions: ['view', 'create', 'edit', 'delete'] },
  { key: 'supplier', label: 'Supplier', description: 'Supplier records and contacts', actions: ['view', 'create', 'edit', 'delete'] },
  { key: 'employees', label: 'Employees', description: 'Manage employee records and payroll data', actions: ['view', 'create', 'edit', 'delete', 'manage'] },
  { key: 'payroll', label: 'Payroll Runs', description: 'View: see runs. Create: create runs, OT/undertime. Submit. Edit: change payslip items (GM). Approve/Reject. Download docs. Mark Paid.', actions: ['view', 'create', 'submit', 'edit', 'approve', 'download', 'pay'] },
];

const ROLE_PRESETS = {
  PAYROLL_INCHARGE: ['employees:view', 'payroll:view', 'payroll:create', 'payroll:submit'],
  GENERAL_MANAGER: ['employees:view', 'payroll:view', 'payroll:edit', 'payroll:approve'],
  FINANCE_OFFICER: ['employees:view', 'payroll:view', 'payroll:download', 'payroll:pay'],
};

const UserManagement = () => {
  const isSuperAdmin = useIsSuperAdmin();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [resettingUser, setResettingUser] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const PRESET_ROLES = ['ENCODER', 'ASSISTANT_ADMIN', 'ADMIN', 'FINANCE', 'PAYROLL_INCHARGE', 'GENERAL_MANAGER', 'FINANCE_OFFICER'];

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  const [formData, setFormData] = useState({
    username: '',
    email: '',
    fullName: '',
    password: '',
    role: 'ENCODER',
    enabled: true,
    permissions: []
  });

  const [isCustomRole, setIsCustomRole] = useState(false);

  const togglePermission = (permKey) => {
    setFormData(prev => {
      const has = prev.permissions.includes(permKey);
      return {
        ...prev,
        permissions: has ? prev.permissions.filter(p => p !== permKey) : [...prev.permissions, permKey]
      };
    });
  };

  const toggleAllForFeature = (feature, checked) => {
    setFormData(prev => {
      const keys = feature.actions.map(a => `${feature.key}:${a}`);
      const withoutFeature = prev.permissions.filter(p => !keys.includes(p));
      return { ...prev, permissions: checked ? [...withoutFeature, ...keys] : withoutFeature };
    });
  };

  const [passwordData, setPasswordData] = useState({
    newPassword: '',
    confirmPassword: ''
  });

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    setLoadingMessage('Loading users...');
    try {
      const response = await api.get('/users');
      if (response.success) {
        setUsers(response.data || []);
      } else {
        toast.error(response.error || 'Failed to load users');
        setUsers([]);
      }
    } catch (error) {
      toast.error('Failed to load users');
      console.error(error);
      setUsers([]);
    } finally {
      setLoading(false);
      setLoadingMessage('');
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.username || !formData.email || !formData.fullName || !formData.role) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (!editingUser && !formData.password) {
      toast.error('Password is required for new users');
      return;
    }

    if (!editingUser && formData.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setActionLoading(true);
    setLoadingMessage(editingUser ? 'Updating user...' : 'Creating user...');

    try {
      const payload = {
        username: formData.username,
        email: formData.email,
        fullName: formData.fullName,
        role: formData.role,
        enabled: formData.enabled,
        permissions: formData.role === 'SUPER_ADMIN' ? [] : formData.permissions
      };

      if (!editingUser) {
        payload.password = formData.password;
      }

      if (editingUser) {
        await api.put(`/users/${editingUser.id}`, payload);
        toast.success('User updated successfully');
      } else {
        await api.post('/auth/register', payload);
        toast.success('User created successfully');
      }

      setShowModal(false);
      resetForm();
      loadUsers();
      setCurrentPage(1);
    } catch (error) {
      toast.error(error.message || 'Failed to save user');
      console.error(error);
    } finally {
      setActionLoading(false);
      setLoadingMessage('');
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();

    if (!passwordData.newPassword) {
      toast.error('Please enter a new password');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setActionLoading(true);
    setLoadingMessage('Resetting password...');

    try {
      await api.put(`/users/${resettingUser.id}/reset-password`, {
        newPassword: passwordData.newPassword
      });
      toast.success('Password reset successfully');
      setShowPasswordModal(false);
      resetPasswordForm();
    } catch (error) {
      toast.error(error.message || 'Failed to reset password');
      console.error(error);
    } finally {
      setActionLoading(false);
      setLoadingMessage('');
    }
  };

  const handleEdit = (user) => {
    setEditingUser(user);
    const role = user.role || 'ENCODER';
    setFormData({
      username: user.username || '',
      email: user.email || '',
      fullName: user.fullName || '',
      password: '',
      role,
      enabled: user.enabled,
      permissions: user.permissions || []
    });
    setIsCustomRole(!PRESET_ROLES.includes(role));
    setShowModal(true);
  };

  const handleResetPasswordClick = (user) => {
    setResettingUser(user);
    setShowPasswordModal(true);
  };

  const handleToggleStatus = async (user) => {
    if (!window.confirm(`Are you sure you want to ${user.enabled ? 'disable' : 'enable'} this user?`)) return;

    setActionLoading(true);
    setLoadingMessage(`${user.enabled ? 'Disabling' : 'Enabling'} user...`);

    try {
      await api.put(`/users/${user.id}/toggle-status`);
      toast.success(`User ${user.enabled ? 'disabled' : 'enabled'} successfully`);
      loadUsers();
    } catch (error) {
      toast.error('Failed to update user status');
      console.error(error);
    } finally {
      setActionLoading(false);
      setLoadingMessage('');
    }
  };

  const handleDelete = async (user) => {
    if (!window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) return;

    setActionLoading(true);
    setLoadingMessage('Deleting user...');

    try {
      await api.delete(`/users/${user.id}`);
      toast.success('User deleted successfully');
      loadUsers();
      if (currentUsers.length % itemsPerPage === 1 && currentPage > 1) {
        setCurrentPage(currentPage - 1);
      }
    } catch (error) {
      toast.error(error.message || 'Failed to delete user');
      console.error(error);
    } finally {
      setActionLoading(false);
      setLoadingMessage('');
    }
  };

  const resetForm = () => {
    setFormData({
      username: '',
      email: '',
      fullName: '',
      password: '',
      role: 'ENCODER',
      enabled: true,
      permissions: []
    });
    setEditingUser(null);
    setIsCustomRole(false);
  };

  const resetPasswordForm = () => {
    setPasswordData({
      newPassword: '',
      confirmPassword: ''
    });
    setResettingUser(null);
    setShowPassword(false);
  };

  const filteredUsers = users.filter(user =>
    user.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.role?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Pagination calculations
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentUsers = filteredUsers.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);

  const getRoleBadge = (role) => {
    const roleStyles = {
      SUPER_ADMIN: 'bg-black text-white',
      ADMIN: 'bg-purple-100 text-purple-800',
      ENCODER: 'bg-blue-100 text-blue-800',
      ASSISTANT_ADMIN: 'bg-indigo-100 text-indigo-800',
      FINANCE: 'bg-green-100 text-green-800',
      PAYROLL_INCHARGE: 'bg-cyan-100 text-cyan-800',
      GENERAL_MANAGER: 'bg-amber-100 text-amber-800',
      FINANCE_OFFICER: 'bg-emerald-100 text-emerald-800',
    };

    const roleLabels = {
      SUPER_ADMIN: 'Super Admin',
      ADMIN: 'Admin',
      ENCODER: 'Encoder',
      ASSISTANT_ADMIN: 'Assistant Admin',
      FINANCE: 'Finance',
      PAYROLL_INCHARGE: 'Payroll In-charge',
      GENERAL_MANAGER: 'General Manager',
      FINANCE_OFFICER: 'Finance Officer',
    };

    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${roleStyles[role] || 'bg-gray-100 text-gray-800'}`}>
        {roleLabels[role] || role}
      </span>
    );
  };

  const getStatusBadge = (enabled) => {
    return enabled ? (
      <span className="flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
        <UserCheck size={12} />
        Active
      </span>
    ) : (
      <span className="flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">
        <UserX size={12} />
        Disabled
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <LoadingOverlay show={true} message="Loading users..." />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <LoadingOverlay show={actionLoading} message={loadingMessage} />
      <Toaster position="top-right" />
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
        <p className="text-gray-600 mt-1">Manage system users and permissions</p>
      </div>
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search by username, email, or name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <button
          disabled={!isSuperAdmin}
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-blue-600"
        >
          <Plus size={20} />
          Add User
        </button>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {currentUsers.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-8 text-center text-gray-500">
                    {filteredUsers.length === 0 ? 'No users found' : 'No users on this page'}
                  </td>
                </tr>
              ) : (
                currentUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <User size={20} className="text-blue-600" />
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">{user.fullName}</div>
                          <div className="text-sm text-gray-500">{user.username}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">{user.email}</td>
                    <td className="px-6 py-4">
                      {getRoleBadge(user.role)}
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(user.enabled)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          disabled={!isSuperAdmin}
                          onClick={() => handleEdit(user)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                          title="Edit User"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button
                          onClick={() => handleResetPasswordClick(user)}
                          className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition"
                          title="Reset Password"
                        >
                          <Shield size={18} />
                        </button>
                        <button
                          onClick={() => handleToggleStatus(user)}
                          className={`p-2 rounded-lg transition ${user.enabled
                            ? 'text-orange-600 hover:bg-orange-50'
                            : 'text-green-600 hover:bg-green-50'
                            }`}
                          title={user.enabled ? 'Disable User' : 'Enable User'}
                        >
                          {user.enabled ? <UserX size={18} /> : <UserCheck size={18} />}
                        </button>
                        <button
                          onClick={() => handleDelete(user)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                          title="Delete User"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {filteredUsers.length > 0 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            onNextPage={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            onPrevPage={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            showingStart={indexOfFirstItem + 1}
            showingEnd={Math.min(indexOfLastItem, filteredUsers.length)}
            totalItems={filteredUsers.length}
          />
        )}
      </div>

      {/* Add/Edit User Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[92vh] overflow-hidden flex flex-col">

            {/* Sticky Header */}
            <div className="flex-shrink-0 bg-white border-b border-gray-200 px-8 py-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                  <User size={20} className="text-blue-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">
                    {editingUser ? 'Edit User' : 'Add New User'}
                  </h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {editingUser ? `Editing ${editingUser.fullName}` : 'Create a new account and set their access'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => { setShowModal(false); resetForm(); }}
                className="p-2 hover:bg-gray-100 rounded-lg transition text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>

            {/* Scrollable Body */}
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
              <div className="px-8 py-6 space-y-8">

                {/* Section: Account Details */}
                <section>
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-1 h-4 bg-blue-600 rounded-full" />
                    <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Account Details</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5 bg-gray-50 rounded-xl p-5 border border-gray-100">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Username <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="username"
                        value={formData.username}
                        onChange={handleInputChange}
                        required
                        className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                        placeholder="e.g. jonathan.elano"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Email <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        required
                        className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                        placeholder="name@company.com"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Full Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="fullName"
                        value={formData.fullName}
                        onChange={handleInputChange}
                        required
                        className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                        placeholder="Enter full name"
                      />
                    </div>

                    {!editingUser && (
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                          Password <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <input
                            type={showPassword ? "text" : "password"}
                            name="password"
                            value={formData.password}
                            onChange={handleInputChange}
                            required={!editingUser}
                            className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition pr-10"
                            placeholder="Minimum 6 characters"
                            minLength="6"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                          >
                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </section>

                {/* Section: Role & Status */}
                <section>
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-1 h-4 bg-blue-600 rounded-full" />
                    <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Role & Status</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Role <span className="text-red-500">*</span>
                      </label>
                      <select
                        name="role"
                        value={isCustomRole ? 'CUSTOM' : formData.role}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === 'CUSTOM') {
                            setIsCustomRole(true);
                            setFormData(prev => ({ ...prev, role: '' }));
                          } else {
                            setIsCustomRole(false);
                            setFormData(prev => ({
                              ...prev,
                              role: val,
                              permissions: ROLE_PRESETS[val] ? [...ROLE_PRESETS[val]] : prev.permissions
                            }));
                          }
                        }}
                        required
                        className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition bg-white"
                      >
                        <option value="" disabled>Select a role...</option>
                        <option value="ENCODER">Encoder</option>
                        <option value="ASSISTANT_ADMIN">Assistant Admin</option>
                        <option value="ADMIN">Admin</option>
                        <option value="FINANCE">Finance</option>
                        <option value="PAYROLL_INCHARGE">Payroll In-charge</option>
                        <option value="GENERAL_MANAGER">General Manager</option>
                        <option value="FINANCE_OFFICER">Finance Officer</option>
                        <option value="CUSTOM">Custom...</option>
                      </select>
                      {isCustomRole && (
                        <input
                          type="text"
                          name="role"
                          value={formData.role}
                          onChange={handleInputChange}
                          required
                          placeholder="e.g. WAREHOUSE_STAFF, AUDITOR"
                          autoFocus
                          className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition mt-2"
                        />
                      )}
                      <p className="text-xs text-gray-500 mt-1.5">
                        Access is controlled entirely by the permissions below, not the role name.
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Account Status</label>
                      <label
                        htmlFor="enabled"
                        className="flex items-center justify-between gap-3 px-4 py-2.5 bg-white border border-gray-300 rounded-lg cursor-pointer hover:border-gray-400 transition h-[42px]"
                      >
                        <span className="text-sm text-gray-700">
                          {formData.enabled ? 'Enabled — can sign in' : 'Disabled — access blocked'}
                        </span>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={formData.enabled}
                          onClick={() => setFormData(prev => ({ ...prev, enabled: !prev.enabled }))}
                          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors flex-shrink-0 ${formData.enabled ? 'bg-blue-600' : 'bg-gray-300'
                            }`}
                        >
                          <span
                            className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${formData.enabled ? 'translate-x-5' : 'translate-x-1'
                              }`}
                          />
                        </button>
                        <input
                          type="checkbox"
                          id="enabled"
                          name="enabled"
                          checked={formData.enabled}
                          onChange={handleInputChange}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>
                </section>

                {/* Section: Permissions */}
                {isSuperAdmin && formData.role !== 'SUPER_ADMIN' && (
                  <section>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <div className="w-1 h-4 bg-blue-600 rounded-full" />
                        <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Feature Access</h3>
                      </div>
                      <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full">
                        {formData.permissions.length} permission{formData.permissions.length !== 1 ? 's' : ''} selected
                      </span>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                      {FEATURES.map(f => {
                        const keys = f.actions.map(a => `${f.key}:${a}`);
                        const checkedCount = keys.filter(k => formData.permissions.includes(k)).length;
                        const allChecked = checkedCount === keys.length;
                        const someChecked = checkedCount > 0 && !allChecked;

                        return (
                          <div
                            key={f.key}
                            className={`rounded-xl border transition-all ${allChecked
                              ? 'bg-blue-50/60 border-blue-300'
                              : someChecked
                                ? 'bg-white border-blue-200'
                                : 'bg-white border-gray-200'
                              }`}
                          >
                            <div className="p-4">
                              <div className="flex items-start justify-between gap-3 mb-3">
                                <div className="min-w-0">
                                  <span className="font-semibold text-gray-900 text-sm">{f.label}</span>
                                  {f.description && (
                                    <p className="text-xs text-gray-500 mt-0.5 leading-snug">{f.description}</p>
                                  )}
                                </div>
                                <label className="flex items-center gap-1.5 text-xs font-medium text-blue-700 cursor-pointer flex-shrink-0">
                                  <input
                                    type="checkbox"
                                    checked={allChecked}
                                    ref={(el) => { if (el) el.indeterminate = someChecked; }}
                                    onChange={(e) => toggleAllForFeature(f, e.target.checked)}
                                    className="w-3.5 h-3.5 text-blue-600 rounded"
                                  />
                                  {allChecked ? 'All' : someChecked ? `${checkedCount}/${keys.length}` : 'All'}
                                </label>
                              </div>

                              <div className="flex flex-wrap gap-1.5">
                                {f.actions.map(action => {
                                  const permKey = `${f.key}:${action}`;
                                  const isChecked = formData.permissions.includes(permKey);
                                  return (
                                    <label
                                      key={permKey}
                                      className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border cursor-pointer transition-colors ${isChecked
                                        ? 'bg-blue-600 border-blue-600 text-white font-medium'
                                        : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                                        }`}
                                    >
                                      <input
                                        type="checkbox"
                                        checked={isChecked}
                                        onChange={() => togglePermission(permKey)}
                                        className="hidden"
                                      />
                                      {ACTION_LABELS[action] || action}
                                    </label>
                                  );
                                })}
                              </div>

                              {FILTERS[f.key] && (
                                <div className="mt-3 pt-3 border-t border-gray-100">
                                  <div className="flex items-center justify-between mb-2">
                                    <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">
                                      Visible filters {(() => {
                                        const filterKeys = FILTERS[f.key].map(fl => `${f.key}:filter_${fl.key}`);
                                        const checkedFilters = filterKeys.filter(k => formData.permissions.includes(k)).length;
                                        return checkedFilters === 0
                                          ? '(none — all hidden)'
                                          : `(${checkedFilters}/${filterKeys.length} visible)`;
                                      })()}
                                    </p>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const filterKeys = FILTERS[f.key].map(fl => `${f.key}:filter_${fl.key}`);
                                        const allChecked = filterKeys.every(k => formData.permissions.includes(k));
                                        setFormData(prev => {
                                          const withoutFilters = prev.permissions.filter(p => !filterKeys.includes(p));
                                          return {
                                            ...prev,
                                            permissions: allChecked ? withoutFilters : [...withoutFilters, ...filterKeys]
                                          };
                                        });
                                      }}
                                      className="text-[10px] font-medium text-purple-600 hover:text-purple-800"
                                    >
                                      {FILTERS[f.key].every(fl => formData.permissions.includes(`${f.key}:filter_${fl.key}`)) ? 'Clear all' : 'Select all'}
                                    </button>
                                  </div>
                                  <div className="flex flex-wrap gap-1.5">
                                    {FILTERS[f.key].map(fl => {
                                      const permKey = `${f.key}:filter_${fl.key}`;
                                      const isChecked = formData.permissions.includes(permKey);
                                      return (
                                        <label
                                          key={permKey}
                                          className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border cursor-pointer transition-colors ${isChecked
                                            ? 'bg-purple-600 border-purple-600 text-white font-medium'
                                            : 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100'
                                            }`}
                                        >
                                          <input
                                            type="checkbox"
                                            checked={isChecked}
                                            onChange={() => togglePermission(permKey)}
                                            className="hidden"
                                          />
                                          {fl.label}
                                        </label>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                )}

                {formData.role === 'SUPER_ADMIN' && (
                  <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4">
                    <Shield size={20} className="text-amber-600 flex-shrink-0" />
                    <p className="text-sm text-amber-800">
                      <span className="font-semibold">Super Admin</span> automatically has full access to every feature. Individual permissions don't apply.
                    </p>
                  </div>
                )}
              </div>
            </form>

            {/* Sticky Footer */}
            <div className="flex-shrink-0 bg-white border-t border-gray-200 px-8 py-4 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => { setShowModal(false); resetForm(); }}
                className="px-5 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition text-sm font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                onClick={handleSubmit}
                className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium shadow-sm"
              >
                {editingUser ? 'Save Changes' : 'Create User'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {showPasswordModal && resettingUser && (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">
                Reset Password
              </h2>
              <button
                onClick={() => {
                  setShowPasswordModal(false);
                  resetPasswordForm();
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleResetPassword} className="p-6 space-y-4">
              <div>
                <p className="text-sm text-gray-600 mb-4">
                  Reset password for <strong>{resettingUser.fullName}</strong> ({resettingUser.username})
                </p>

                <label className="block text-sm font-medium text-gray-700 mb-1">
                  New Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    name="newPassword"
                    value={passwordData.newPassword}
                    onChange={handlePasswordChange}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-10"
                    placeholder="Enter new password"
                    minLength="6"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Confirm Password <span className="text-red-500">*</span>
                </label>
                <input
                  type={showPassword ? "text" : "password"}
                  name="confirmPassword"
                  value={passwordData.confirmPassword}
                  onChange={handlePasswordChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Confirm new password"
                  minLength="6"
                />
              </div>

              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowPasswordModal(false);
                    resetPasswordForm();
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                  Reset Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;