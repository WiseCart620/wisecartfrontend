
import React, { useState } from 'react';
import { Mail, Lock, LogIn, AlertCircle, Building2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { LoadingOverlay } from './LoadingOverlay';

const LoginPage = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const [actionLoading, setActionLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  

  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const handleSubmit = async (e) => {
  e.preventDefault();
  setLoading(true);
  setError('');
  setActionLoading(true);
  setLoadingMessage('Signing in...');

  try {
    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || 'Invalid username or password');
    }

    const data = await response.json();

    login(data.token, {
      username: data.username,
      fullName: data.fullName,
      role: data.role
    });

    toast.success(`Welcome back, ${data.fullName || data.username}!`);
    window.location.href = '/dashboard';
  } catch (err) {
    setError(err.message);
    toast.error(err.message);
  } finally {
    setLoading(false);
    setActionLoading(false);
    setLoadingMessage('');
  }
};



  return (
    <>
    <LoadingOverlay show={actionLoading} message={loadingMessage} />
    <div className="min-h-screen bg-gray-900 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-blue-800 to-indigo-900 opacity-90" />
      <div className="absolute inset-0 bg-grid-white/5 bg-grid" />

      <div className="relative w-full max-w-md">
        <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-700 px-8 py-8 text-white text-center">
            <div className="w-16 h-16 bg-white/20 rounded-2xl mx-auto flex items-center justify-center backdrop-blur-sm">
              <Building2 size={36} className="text-white" />
            </div>
          </div>

          <div className="px-8 py-10">
            <h2 className="text-2xl font-semibold text-gray-900 text-center mb-2">
              Login
            </h2>
            <p className="text-sm text-gray-500 text-center mb-8">
              Enter your credentials to access your account
            </p>

            {/* Error Alert */}
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-red-700">
                <AlertCircle size={20} />
                <span className="text-sm font-medium">{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Username Field */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Username
                </label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={20} />
                  <input
                    type="text"
                    name="username"
                    value={formData.username}
                    onChange={handleChange}
                    required
                    autoComplete="username"
                    className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all duration-200 text-gray-900 placeholder-gray-400"
                    placeholder="Enter your username"
                  />
                </div>
              </div>

              {/* Password Field */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={20} />
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    autoComplete="current-password"
                    className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all duration-200 text-gray-900 placeholder-gray-400"
                    placeholder="Enter your password"
                  />
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-700 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-indigo-800 focus:ring-4 focus:ring-blue-500/30 shadow-lg transform transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-3 text-lg"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Signing in...
                  </>
                ) : (
                  <>
                    <LogIn size={22} />
                    Sign In
                  </>
                )}
              </button>
            </form>


          </div>
        </div>

        {/* Bottom Branding */}
        <div className="text-center mt-8 text-white/70">
          <p className="text-sm">
            © {new Date().getFullYear()} WiseCart ERP • All rights reserved
          </p>
        </div>
      </div>
    </div>
    </>
  );
};

export default LoginPage;