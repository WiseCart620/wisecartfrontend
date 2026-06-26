// components/layout/Sidebar.jsx
import React, { useState } from 'react';
import {
  Package, Truck, Warehouse, ShoppingCart, Users, Home,
  UserPlus, PackageSearch, PackageOpen, ChevronDown, ChevronRight,
  ChevronLeft, Database, Factory, ClipboardList, Menu, X,
} from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const allMainMenuItems = [
  { to: '/dashboard',           label: 'Dashboard',        icon: Home,          userHidden: true  },
  { to: '/sales',               label: 'Sales',            icon: ShoppingCart,  userHidden: false },
  { to: '/deliveries',          label: 'Deliveries',       icon: Truck,         userHidden: false },
  { to: '/warehouse-inventory', label: 'Warehouse',        icon: PackageOpen,   userHidden: true  },
  { to: '/inventory',           label: 'Inventory Record', icon: PackageSearch, userHidden: true  },
  { to: '/procurement',         label: 'Procurement',      icon: ClipboardList, userHidden: true  },
];

const dataEntryItems = [
  { to: '/warehouse', label: 'Warehouse',           icon: Warehouse },
  { to: '/branches',  label: 'Branches & Companies',icon: Users     },
  { to: '/products',  label: 'Products',            icon: Package   },
  { to: '/supplier',  label: 'Supplier',            icon: Factory   },
];

// ── Collapsed width (icon-only) ───────────────────────────────────
const W_COLLAPSED = 64;   // px
const W_EXPANDED  = 240;  // px

const Sidebar = ({ isOpen, toggle }) => {
  const { user } = useAuth();
  const isAdmin          = user?.role === 'ADMIN';
  const isAssistantAdmin = user?.role === 'ASSISTANT_ADMIN';
  const isFinance        = user?.role === 'FINANCE';
  const isEncoder        = user?.role === 'ENCODER';

  const mainMenuItems = isEncoder
    ? allMainMenuItems.filter(i => ['/sales', '/deliveries'].includes(i.to))
    : allMainMenuItems;

  const showDataEntry = isAdmin || isAssistantAdmin || isFinance;

  const [dataEntryOpen,    setDataEntryOpen]    = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const sidebarW = sidebarCollapsed ? W_COLLAPSED : W_EXPANDED;

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={toggle}
        />
      )}

      {/* ── Sidebar panel ── */}
      <aside
        style={{ width: sidebarW }}
        className={`
          fixed top-0 left-0 z-50 h-full
          bg-gray-900 text-white overflow-y-auto overflow-x-hidden
          transition-all duration-300 flex flex-col
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0
        `}
      >
        {/* Logo row */}
        <div className="flex items-center justify-between px-4 py-5 border-b border-gray-800 flex-shrink-0">
          {!sidebarCollapsed && (
            <span className="text-xl font-bold whitespace-nowrap">WiseCart</span>
          )}
          {sidebarCollapsed && (
            <span className="text-xl font-bold mx-auto">WC</span>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 p-2 space-y-1">

          {/* Main items */}
          {mainMenuItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => window.innerWidth < 1024 && toggle()}
                title={sidebarCollapsed ? item.label : undefined}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-sm
                   ${isActive ? 'bg-blue-600 text-white' : 'hover:bg-gray-800 text-gray-300'}
                   ${sidebarCollapsed ? 'justify-center' : ''}`
                }
              >
                <Icon size={20} className="flex-shrink-0" />
                {!sidebarCollapsed && (
                  <span className="truncate">{item.label}</span>
                )}
              </NavLink>
            );
          })}

          {/* Data Entry section */}
          {showDataEntry && !sidebarCollapsed && (
            <div className="pt-1">
              <button
                onClick={() => setDataEntryOpen(!dataEntryOpen)}
                className="flex items-center justify-between w-full px-3 py-2.5 rounded-lg hover:bg-gray-800 text-gray-300 transition-colors text-sm"
              >
                <div className="flex items-center gap-3">
                  <Database size={20} className="flex-shrink-0" />
                  <span className="font-medium">Data Entry</span>
                </div>
                {dataEntryOpen
                  ? <ChevronDown size={16} />
                  : <ChevronRight size={16} />}
              </button>

              <div className={`overflow-hidden transition-all duration-300 ${dataEntryOpen ? 'max-h-60' : 'max-h-0'}`}>
                <div className="ml-6 mt-1 space-y-1 border-l border-gray-700 pl-2">
                  {dataEntryItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        onClick={() => window.innerWidth < 1024 && toggle()}
                        className={({ isActive }) =>
                          `flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-sm
                           ${isActive ? 'bg-blue-600 text-white' : 'hover:bg-gray-800 text-gray-400'}`
                        }
                      >
                        <Icon size={17} className="flex-shrink-0" />
                        <span className="truncate">{item.label}</span>
                      </NavLink>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Data Entry icons-only when collapsed */}
          {showDataEntry && sidebarCollapsed && (
            <div className="pt-1 space-y-1">
              {dataEntryItems.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    title={item.label}
                    className={({ isActive }) =>
                      `flex items-center justify-center px-3 py-2.5 rounded-lg transition-colors
                       ${isActive ? 'bg-blue-600 text-white' : 'hover:bg-gray-800 text-gray-300'}`
                    }
                  >
                    <Icon size={20} className="flex-shrink-0" />
                  </NavLink>
                );
              })}
            </div>
          )}

          {/* User Management */}
          {isAdmin && (
            <div className="pt-1 border-t border-gray-800 mt-1">
              <NavLink
                to="/users"
                onClick={() => window.innerWidth < 1024 && toggle()}
                title={sidebarCollapsed ? 'User Management' : undefined}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-sm
                   ${isActive ? 'bg-blue-600 text-white' : 'hover:bg-gray-800 text-gray-300'}
                   ${sidebarCollapsed ? 'justify-center' : ''}`
                }
              >
                <UserPlus size={20} className="flex-shrink-0" />
                {!sidebarCollapsed && <span className="truncate">User Management</span>}
              </NavLink>
            </div>
          )}
        </nav>

        {/* Collapse toggle — bottom of sidebar */}
        <div className="flex-shrink-0 border-t border-gray-800 p-2">
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className={`
              flex items-center gap-3 w-full px-3 py-2.5 rounded-lg
              hover:bg-gray-800 text-gray-400 transition-colors text-sm
              ${sidebarCollapsed ? 'justify-center' : ''}
            `}
            title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {sidebarCollapsed
              ? <ChevronRight size={18} />
              : <>
                  <ChevronLeft size={18} />
                  <span className="text-xs">Collapse</span>
                </>
            }
          </button>
        </div>
      </aside>

      {/* ── Spacer that pushes page content — desktop only ── */}
      <div
        style={{ width: sidebarW }}
        className="hidden lg:block flex-shrink-0 transition-all duration-300"
      />
    </>
  );
};

export default Sidebar;