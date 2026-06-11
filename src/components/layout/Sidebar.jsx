// components/layout/Sidebar.jsx
import React, { useState } from 'react';
import { Package, Truck, Warehouse, ShoppingCart, Users, Home, UserPlus, PackageSearch, PackageOpen, ChevronDown, ChevronRight, ChevronLeft, Database, BoxIcon, Factory, ClipboardList } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const allMainMenuItems = [
  { to: '/dashboard', label: 'Dashboard', icon: Home, userHidden: true },
  { to: '/sales', label: 'Sales', icon: ShoppingCart, userHidden: false },
  { to: '/deliveries', label: 'Deliveries', icon: Truck, userHidden: false },
  { to: '/warehouse-inventory', label: 'Warehouse', icon: PackageOpen, userHidden: true },
  { to: '/inventory', label: 'Inventory Record', icon: PackageSearch, userHidden: true },
  { to: '/procurement', label: 'Procurement', icon: ClipboardList, userHidden: true },
];

const dataEntryItems = [
  { to: '/warehouse', label: 'Warehouse', icon: Warehouse },
  { to: '/branches', label: 'Branches & Companies', icon: Users },
  { to: '/products', label: 'Products', icon: Package },
  { to: '/supplier', label: 'Supplier', icon: Factory },
];

const Sidebar = ({ isOpen, toggle }) => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const isAssistantAdmin = user?.role === 'ASSISTANT_ADMIN';
  const isFinance = user?.role === 'FINANCE';
  const isEncoder = user?.role === 'ENCODER';
  const mainMenuItems = allMainMenuItems;
  const showDataEntry = isAdmin || isAssistantAdmin || isFinance || isEncoder;

  const [dataEntryOpen, setDataEntryOpen] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden" onClick={toggle} />
      )}

      <div className={`fixed top-0 left-0 z-50 h-full transform transition-all duration-300
        ${isOpen ? 'translate-x-0' : '-translate-x-full'} 
        ${sidebarCollapsed ? 'lg:w-20' : 'lg:w-64'} 
        ${isOpen || !sidebarCollapsed ? 'w-64' : 'w-20'}
        lg:translate-x-0`}>

        {/* Sidebar content */}
        <aside className="relative h-full bg-gray-900 text-white overflow-y-auto">
          <div className="p-6 border-b border-gray-800 flex items-center justify-between">
            <div className={`transition-opacity duration-300 ${sidebarCollapsed ? 'lg:opacity-0 lg:hidden' : 'opacity-100'}`}>
              <h2 className="text-2xl font-bold">WiseCart</h2>
            </div>
            <div className={`transition-opacity duration-300 ${sidebarCollapsed ? 'lg:opacity-100 lg:block' : 'lg:opacity-0 lg:hidden'} hidden`}>
              <h2 className="text-2xl font-bold">WC</h2>
            </div>
          </div>

          <nav className="p-4 space-y-2">
            {mainMenuItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => window.innerWidth < 1024 && toggle()}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-3 rounded-lg transition ${isActive ? 'bg-blue-600 text-white' : 'hover:bg-gray-800 text-gray-300'
                    } ${sidebarCollapsed ? 'lg:justify-center' : ''}`
                  }
                  title={sidebarCollapsed ? item.label : ''}
                >
                  <Icon size={20} />
                  <span className={`transition-opacity duration-300 ${sidebarCollapsed ? 'lg:opacity-0 lg:hidden' : 'opacity-100'}`}>
                    {item.label}
                  </span>
                </NavLink>
              );
            })}

            {showDataEntry && (
              <div className={`pt-2 ${sidebarCollapsed ? 'lg:hidden' : ''}`}>
                <button
                  onClick={() => setDataEntryOpen(!dataEntryOpen)}
                  className="flex items-center justify-between w-full px-4 py-3 rounded-lg hover:bg-gray-800 text-gray-300 transition"
                >
                  <div className="flex items-center gap-3">
                    <Database size={20} />
                    <span className="font-medium">Data Entry</span>
                  </div>
                  {dataEntryOpen ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                </button>

                <div className={`overflow-hidden transition-all duration-300 ${dataEntryOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
                  <div className="ml-4 mt-1 space-y-1 border-l-2 border-gray-700 pl-2">
                    {dataEntryItems.map((item) => {
                      const Icon = item.icon;
                      return (
                        <NavLink
                          key={item.to}
                          to={item.to}
                          onClick={() => window.innerWidth < 1024 && toggle()}
                          className={({ isActive }) =>
                            `flex items-center gap-3 px-4 py-2.5 rounded-lg transition text-sm ${isActive ? 'bg-blue-600 text-white' : 'hover:bg-gray-800 text-gray-400'
                            }`
                          }
                        >
                          <Icon size={18} />
                          <span>{item.label}</span>
                        </NavLink>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {sidebarCollapsed && showDataEntry && (
              <div className="hidden lg:block pt-2 space-y-1">
                {dataEntryItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      className={({ isActive }) =>
                        `flex items-center justify-center px-4 py-3 rounded-lg transition ${isActive ? 'bg-blue-600 text-white' : 'hover:bg-gray-800 text-gray-300'
                        }`
                      }
                      title={item.label}
                    >
                      <Icon size={20} />
                    </NavLink>
                  );
                })}
              </div>
            )}

            {/* User Management - Only for ADMIN */}
            {isAdmin && (
              <div className="pt-2 border-t border-gray-800 mt-2">
                <NavLink
                  to="/users"
                  onClick={() => window.innerWidth < 1024 && toggle()}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-3 rounded-lg transition ${isActive ? 'bg-blue-600 text-white' : 'hover:bg-gray-800 text-gray-300'
                    } ${sidebarCollapsed ? 'lg:justify-center' : ''}`
                  }
                  title={sidebarCollapsed ? 'User Management' : ''}
                >
                  <UserPlus size={20} />
                  <span className={`transition-opacity duration-300 ${sidebarCollapsed ? 'lg:opacity-0 lg:hidden' : 'opacity-100'}`}>
                    User Management
                  </span>
                </NavLink>
              </div>
            )}
          </nav>
        </aside>

        {/* Collapse/Expand Button - Floating outside sidebar */}
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="hidden lg:flex absolute right-0 top-4 translate-x-1/2 items-center justify-center w-11 h-11 rounded-full bg-white text-black transition shadow-lg z-10"
          title={sidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
        >
          {sidebarCollapsed ? (
            <ChevronRight size={16} />
          ) : (
            <ChevronLeft size={16} />
          )}
        </button>
      </div>

      {/* Spacer div to push content on desktop - only visible on lg screens and up */}
      <div className={`hidden lg:block flex-shrink-0 transition-all duration-300 ${sidebarCollapsed ? 'w-20' : 'w-64'}`}></div>
    </>
  );
};

export default Sidebar;