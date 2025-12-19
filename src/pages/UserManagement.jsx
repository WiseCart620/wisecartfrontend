// pages/UserManagement.jsx
import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Search, X, User, Shield, UserCheck, UserX, Eye, EyeOff, ChevronLeft, ChevronRight } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import { api } from '../services/api';
import { LoadingOverlay } from './LoadingOverlay';

const UserManagement = () => {
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

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  const [formData, setFormData] = useState({
    username: '',
    email: '',
    fullName: '',
    password: '',
    role: 'USER',
    enabled: true
  });

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
      enabled: formData.enabled
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
    setFormData({
      username: user.username || '',
      email: user.email || '',
      fullName: user.fullName || '',
      password: '',
      role: user.role || 'USER',
      enabled: user.enabled
    });
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
      role: 'USER',
      enabled: true
    });
    setEditingUser(null);
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

  // Pagination controls
  const paginate = (pageNumber) => setCurrentPage(pageNumber);
  const nextPage = () => setCurrentPage(prev => Math.min(prev + 1, totalPages));
  const prevPage = () => setCurrentPage(prev => Math.max(prev - 1, 1));

  // Generate page numbers to display
  const getPageNumbers = () => {
    const pageNumbers = [];
    const maxVisiblePages = 5;
    
    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pageNumbers.push(i);
      }
    } else {
      const startPage = Math.max(1, currentPage - 2);
      const endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
      
      for (let i = startPage; i <= endPage; i++) {
        pageNumbers.push(i);
      }
    }
    
    return pageNumbers;
  };

  const getRoleBadge = (role) => {
    const roleStyles = {
      ADMIN: 'bg-purple-100 text-purple-800',
      USER: 'bg-blue-100 text-blue-800',
      MANAGER: 'bg-green-100 text-green-800'
    };
    
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${roleStyles[role] || 'bg-gray-100 text-gray-800'}`}>
        {role}
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
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
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
                          onClick={() => handleEdit(user)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
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
                          className={`p-2 rounded-lg transition ${
                            user.enabled 
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

        {/* Pagination */}
        {filteredUsers.length > 0 && (
          <div className="px-6 py-4 border-t border-gray-200 bg-white flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-sm text-gray-700">
              Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, filteredUsers.length)} of {filteredUsers.length} results
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={prevPage}
                disabled={currentPage === 1}
                className={`p-2 rounded-lg border ${
                  currentPage === 1 
                    ? 'text-gray-400 cursor-not-allowed border-gray-200' 
                    : 'text-gray-700 hover:bg-gray-50 border-gray-300'
                }`}
              >
                <ChevronLeft size={16} />
              </button>

              <div className="flex items-center gap-1">
                {getPageNumbers().map((number) => (
                  <button
                    key={number}
                    onClick={() => paginate(number)}
                    className={`min-w-[40px] px-3 py-2 text-sm rounded-lg border ${
                      currentPage === number
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'text-gray-700 hover:bg-gray-50 border-gray-300'
                    }`}
                  >
                    {number}
                  </button>
                ))}
              </div>

              <button
                onClick={nextPage}
                disabled={currentPage === totalPages}
                className={`p-2 rounded-lg border ${
                  currentPage === totalPages
                    ? 'text-gray-400 cursor-not-allowed border-gray-200'
                    : 'text-gray-700 hover:bg-gray-50 border-gray-300'
                }`}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add/Edit User Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">
                {editingUser ? 'Edit User' : 'Add New User'}
              </h2>
              <button
                onClick={() => {
                  setShowModal(false);
                  resetForm();
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Username <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="username"
                    value={formData.username}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter username"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter email"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter full name"
                  />
                </div>

                {!editingUser && (
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Password <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        name="password"
                        value={formData.password}
                        onChange={handleInputChange}
                        required={!editingUser}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-10"
                        placeholder="Enter password (min 6 characters)"
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

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Role <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="role"
                    value={formData.role}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="USER">User</option>
                    <option value="MANAGER">Manager</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                </div>

                <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                  <input
                    type="checkbox"
                    id="enabled"
                    name="enabled"
                    checked={formData.enabled}
                    onChange={handleInputChange}
                    className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <label htmlFor="enabled" className="flex-1 cursor-pointer">
                    <div className="font-medium text-gray-900">Account Enabled</div>
                    <div className="text-sm text-gray-500">User can login to the system</div>
                  </label>
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                  {editingUser ? 'Update User' : 'Create User'}
                </button>
              </div>
            </form>
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