import React, { useState } from 'react';
import { AlertCircle, Building2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { LoadingOverlay } from '../components/common/LoadingOverlay';
import { useNavigate } from 'react-router-dom';

const LoginPage = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();
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

      localStorage.setItem('authToken', data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);

      const userResponse = await fetch(`${import.meta.env.VITE_API_BASE_URL}/auth/me`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${data.accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      let userData;
      if (userResponse.ok) {
        userData = await userResponse.json();
      } else {
        console.warn('⚠️ /me endpoint failed, using JWT fallback');

        userData = {
          username: data.username,
          role: decodeJWT(data.accessToken)?.role || 'USER'
        };
      }

      localStorage.setItem('user', JSON.stringify(userData));

      const userRole = userData.role || 'USER';
      localStorage.setItem('userRole', userRole);

      login(data.accessToken, userData);

      toast.success(`Welcome back, ${userData.fullName || userData.username}!`);

      // Use navigate instead of window.location.href
      navigate('/dashboard', { replace: true });

    } catch (err) {
      console.error('Login error:', err);
      setError(err.message);
      toast.error(err.message);
    } finally {
      setLoading(false);
      setActionLoading(false);
      setLoadingMessage('');
    }
  };

  // JWT decode helper
  const decodeJWT = (token) => {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      return JSON.parse(jsonPayload);
    } catch (error) {
      console.error('Error decoding JWT:', error);
      return null;
    }
  };

  return (
    <>
      <LoadingOverlay show={actionLoading} message={loadingMessage} />
      <div className="min-h-screen bg-[#F5F7F7] flex flex-col">
        {/* Top bar */}
        <header className="w-full border-b border-gray-200 bg-white">
          <div className="max-w-6xl mx-auto px-6 py-4 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-md bg-[#0B5FFF] flex items-center justify-center">
              <Building2 size={18} className="text-white" />
            </div>
            <span className="text-[17px] font-semibold text-gray-900 tracking-tight">
              WiseCart <span className="font-normal text-gray-500">ERP</span>
            </span>
          </div>
        </header>

        {/* Main */}
        <div className="flex-1 flex items-center justify-center px-4 py-12">
          <div className="w-full max-w-[440px]">
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm px-8 py-10 sm:px-10">
              <h1 className="text-[26px] leading-tight font-semibold text-gray-900 mb-1">
                Sign in
              </h1>
              <p className="text-[15px] text-gray-500 mb-7">
                Use your company account to continue to WiseCart ERP.
              </p>

              {error && (
                <div
                  role="alert"
                  className="mb-6 px-4 py-3 bg-red-50 border border-red-200 rounded-md flex items-start gap-2.5 text-red-800"
                >
                  <AlertCircle size={18} className="shrink-0 mt-0.5" />
                  <span className="text-sm">{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5" noValidate>
                {/* Username Field */}
                <div>
                  <label
                    htmlFor="username"
                    className="block text-[13px] font-medium text-gray-700 mb-1.5"
                  >
                    Username
                  </label>
                  <input
                    id="username"
                    type="text"
                    name="username"
                    value={formData.username}
                    onChange={handleChange}
                    required
                    autoComplete="username"
                    autoFocus
                    className="w-full h-12 px-3.5 bg-white border border-gray-300 rounded-md text-[15px] text-gray-900 placeholder-gray-400 outline-none transition-colors duration-150 focus:border-[#0B5FFF] focus:ring-2 focus:ring-[#0B5FFF]/20"
                    placeholder="Enter your username"
                  />
                </div>

                {/* Password Field */}
                <div>
                  <label
                    htmlFor="password"
                    className="block text-[13px] font-medium text-gray-700 mb-1.5"
                  >
                    Password
                  </label>
                  <input
                    id="password"
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    autoComplete="current-password"
                    className="w-full h-12 px-3.5 bg-white border border-gray-300 rounded-md text-[15px] text-gray-900 placeholder-gray-400 outline-none transition-colors duration-150 focus:border-[#0B5FFF] focus:ring-2 focus:ring-[#0B5FFF]/20"
                    placeholder="Enter your password"
                  />
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-12 mt-2 bg-[#0B5FFF] text-white font-semibold text-[15px] rounded-md hover:bg-[#0A4FD6] active:bg-[#0940B3] focus:outline-none focus:ring-2 focus:ring-[#0B5FFF]/40 focus:ring-offset-1 transition-colors duration-150 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2.5"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      Signing in
                    </>
                  ) : (
                    'Sign in'
                  )}
                </button>
              </form>
            </div>

            <p className="text-center text-[13px] text-gray-500 mt-6">
              Trouble signing in? Contact your system administrator.
            </p>
          </div>
        </div>

        {/* Footer */}
        <footer className="py-6 text-center text-[12px] text-gray-400">
          © {new Date().getFullYear()} WiseCart ERP · All rights reserved
        </footer>
      </div>
    </>
  );
};

export default LoginPage;