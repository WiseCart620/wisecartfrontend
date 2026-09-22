// components/layout/Sidebar.jsx
import React, { useState } from 'react';
import {
  Package, Truck, Warehouse, ShoppingCart, Users, Home,
  UserPlus, PackageSearch, PackageOpen, ChevronDown, ChevronRight,
  ChevronLeft, Database, Factory, ClipboardList, Menu, X,
} from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { useAuth, hasPermission } from '../../context/AuthContext';

const allMainMenuItems = [
  { to: '/dashboard', label: 'Dashboard', icon: Home, userHidden: true },
  { to: '/sales', label: 'Sales', icon: ShoppingCart, userHidden: false },
  { to: '/deliveries', label: 'Deliveries', icon: Truck, userHidden: false },
  { to: '/warehouse-inventory', label: 'Warehouse Inventory', icon: PackageOpen, userHidden: true },
  { to: '/inventory', label: 'Inventory Record', icon: PackageSearch, userHidden: true },
  { to: '/procurement', label: 'Procurement', icon: ClipboardList, userHidden: true },
];


const dataEntryItems = [
  { to: '/warehouse', label: 'Warehouse', icon: Warehouse },
  { to: '/branches', label: 'Branches & Companies', icon: Users },
  { to: '/products', label: 'Products', icon: Package },
  { to: '/supplier', label: 'Supplier', icon: Factory },
];

// ── Collapsed width (icon-only) ───────────────────────────────────
const W_COLLAPSED = 64;   // px
const W_EXPANDED = 240;  // px

const Sidebar = ({ isOpen, toggle }) => {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  const featureKeyByPath = {
    '/dashboard': 'dashboard', '/sales': 'sales', '/deliveries': 'deliveries',
    '/warehouse-inventory': 'warehouse_inventory', '/inventory': 'inventory',
    '/procurement': 'procurement',
  };

  const mainMenuItems = isSuperAdmin
    ? allMainMenuItems
    : allMainMenuItems.filter(i => hasPermission(user, featureKeyByPath[i.to]));
  const showDataEntry = isSuperAdmin ||
    ['warehouse', 'branches', 'products', 'supplier'].some(f => hasPermission(user, f));

  const dataEntryFeatureByPath = {
    '/warehouse': 'warehouse', '/branches': 'branches', '/products': 'products', '/supplier': 'supplier',
  };

  const visibleDataEntryItems = (user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN')
    ? dataEntryItems
    : dataEntryItems.filter(i => hasPermission(user, dataEntryFeatureByPath[i.to]));

  const [dataEntryOpen, setDataEntryOpen] = useState(true);
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
          bg-orange-200 text-gray-900 overflow-y-auto overflow-x-hidden
          transition-all duration-300 flex flex-col
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0
        `}
      >
        {/* Logo row */}
        <div className="flex items-center justify-between px-4 py-5 border-b border-orange-300 flex-shrink-0">
          {!sidebarCollapsed && (
            <span className="text-xl font-bold whitespace-nowrap text-orange-600">WiseCart</span>
          )}
          {sidebarCollapsed && (
            <span className="text-xl font-bold mx-auto text-orange-600">WC</span>
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
                   ${isActive ? 'bg-orange-600 text-white' : 'hover:bg-orange-300 hover:text-gray-900 text-gray-800'}
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
                className="flex items-center justify-between w-full px-3 py-2.5 rounded-lg hover:bg-orange-300 hover:text-gray-900 text-gray-800 transition-colors text-sm"
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
                <div className="ml-6 mt-1 space-y-1 border-l border-orange-400 pl-2">
                  {visibleDataEntryItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        onClick={() => window.innerWidth < 1024 && toggle()}
                        className={({ isActive }) =>
                          `flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-sm
                           ${isActive ? 'bg-orange-600 text-white' : 'hover:bg-orange-300 hover:text-gray-900 text-gray-700'}`
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
              {visibleDataEntryItems.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    title={item.label}
                    className={({ isActive }) =>
                      `flex items-center justify-center px-3 py-2.5 rounded-lg transition-colors
                       ${isActive ? 'bg-orange-600 text-white' : 'hover:bg-orange-300 hover:text-gray-900 text-gray-800'}`
                    }
                  >
                    <Icon size={20} className="flex-shrink-0" />
                  </NavLink>
                );
              })}
            </div>
          )}

          {/* User Management */}
          {isSuperAdmin && (
            <div className="pt-1 border-t border-orange-300 mt-1">
              <NavLink to="/users"
                onClick={() => window.innerWidth < 1024 && toggle()}
                title={sidebarCollapsed ? 'User Management' : undefined}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-sm
                   ${isActive ? 'bg-orange-600 text-white' : 'hover:bg-orange-300 hover:text-gray-900 text-gray-800'}
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
        <div className="flex-shrink-0 border-t border-orange-300 p-2">
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className={`
              flex items-center gap-3 w-full px-3 py-2.5 rounded-lg
              hover:bg-orange-300 text-gray-800 transition-colors text-sm
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