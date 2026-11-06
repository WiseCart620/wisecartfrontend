import React, { useState } from 'react';
import { Menu } from 'lucide-react';
import Sidebar from './Sidebar';

const Layout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="h-dvh flex flex-col overflow-hidden bg-white [--layout-nav-h:0px]">
      {/* Mobile-only top bar (just the hamburger) */}
      <div className="flex-shrink-0 z-30 h-12 flex items-center gap-3 px-4 bg-white border-b border-gray-200 lg:hidden">
        <button
          onClick={() => setSidebarOpen(true)}
          className="text-gray-600 hover:text-gray-900"
          aria-label="Open sidebar"
        >
          <Menu size={24} />
        </button>
        <span className="text-base font-bold text-orange-600">WiseCart ERP</span>
      </div>

      <div className="flex flex-1 min-h-0">
        <Sidebar isOpen={sidebarOpen} toggle={() => setSidebarOpen(!sidebarOpen)} />

        <main className="flex-1 min-w-0 min-h-0 overflow-y-auto pt-4 lg:pt-6">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;