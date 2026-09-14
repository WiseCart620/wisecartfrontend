import React, { useState } from 'react';
import { LogOut, User, Menu, ChevronDown, Shield } from 'lucide-react';

const Navbar = ({ toggleSidebar }) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const username = user.username || 'User';
  const fullName = user.fullName || '';
  const role = user.role || 'User';
  const email = user.email || '';

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    localStorage.removeItem('refreshToken');
    window.location.href = '/login';
  };

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200 px-4 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={toggleSidebar}
            className="lg:hidden text-gray-600 hover:text-gray-900"
          >
            <Menu size={24} />
          </button>
          <h1 className="text-xl font-bold text-gray-800">WiseCart ERP</h1>
        </div>

        <div className="flex items-center gap-4">
          {/* User Profile with Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center gap-3 hover:bg-gray-50 rounded-lg p-2 transition-colors"
            >
              <div className="text-right">
                <p className="text-sm font-semibold text-gray-900">
                  {fullName || username}
                </p>
                <p className="text-xs text-gray-600">
                  {fullName ? username : role}
                </p>
              </div>

              {/* User Avatar */}
              <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center relative">
                <User size={18} className="text-blue-600" />
                {(role === 'SUPER_ADMIN') && (
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                    <Shield size={10} className="text-white" />
                  </div>
                )}
              </div>

              <ChevronDown
                size={16}
                className={`text-gray-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`}
              />
            </button>

            {/* Dropdown Menu */}
            {isDropdownOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-lg border border-gray-100 py-2 z-50">
                {/* User Info Section */}
                <div className="px-4 py-3 border-b border-gray-100">
                  {fullName && (
                    <p className="font-medium text-gray-900">{fullName}</p>
                  )}
                  <p className="text-sm text-gray-500 truncate">{username}</p>
                  {email && (
                    <p className="text-sm text-gray-500 truncate">{email}</p>
                  )}
                </div>

                {/* Role Badge */}
                <div className="px-4 py-2">
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-full">
                    {role === 'SUPER_ADMIN' ? (
                      <Shield size={14} className="text-blue-600" />
                    ) : (
                      <User size={14} className="text-gray-600" />
                    )}
                    <span className="text-sm font-medium text-gray-700">
                      {role}
                    </span>
                  </div>
                </div>

                {/* Menu Items */}
                <div className="py-2">
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-4 py-2 text-left hover:bg-gray-50 text-red-600"
                  >
                    <LogOut size={16} />
                    <span className="text-sm">Logout</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {isDropdownOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsDropdownOpen(false)}
        />
      )}
    </nav>
  );
};

export default Navbar;