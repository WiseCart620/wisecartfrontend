import React, { useState } from 'react';
import { Menu } from 'lucide-react';
import Sidebar from './Sidebar';

const Layout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-white [--layout-nav-h:48px] lg:[--layout-nav-h:0px]">
      {/* Mobile-only top bar (just the hamburger) */}
      <div className="sticky top-0 z-30 h-12 flex items-center gap-3 px-4 bg-white border-b border-gray-200 lg:hidden">
        <button
          onClick={() => setSidebarOpen(true)}
          className="text-gray-600 hover:text-gray-900"
          aria-label="Open sidebar"
        >
          <Menu size={24} />
        </button>
        <span className="text-base font-bold text-orange-600">WiseCart ERP</span>
      </div>

      <div className="flex">
        <Sidebar isOpen={sidebarOpen} toggle={() => setSidebarOpen(!sidebarOpen)} />

        <main className="flex-1 min-h-screen min-w-0 pt-4 lg:pt-6">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;