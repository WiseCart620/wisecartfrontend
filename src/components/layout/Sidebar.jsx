// components/layout/Sidebar.jsx
import React, { useState } from 'react';
import {
  Package, Truck, Warehouse, ShoppingCart, Users, Home,
  UserPlus, PackageSearch, PackageOpen, ChevronDown, ChevronRight,
  ChevronLeft, Database, Factory, ClipboardList, X,
} from 'lucide-react';
import { NavLink, Link, useLocation } from 'react-router-dom';
import { useAuth, hasPermission } from '../../context/AuthContext';

const allMainMenuItems = [
  { to: '/dashboard', label: 'Dashboard', icon: Home, userHidden: true },
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

const salesSubItems = [
  { to: '/sales', label: 'New Sale / All Sales', icon: ShoppingCart },
  { to: '/sales', label: 'Generate Invoice / COS', icon: ClipboardList },
  { to: '/sales', label: 'Sales Journal', icon: ClipboardList },
  { to: '/sales', label: 'Sales Report', icon: ClipboardList },
];

const Sidebar = ({ isOpen, toggle }) => {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  const featureKeyByPath = {
    '/dashboard': 'dashboard', '/deliveries': 'deliveries',
    '/warehouse-inventory': 'warehouse_inventory', '/inventory': 'inventory',
    '/procurement': 'procurement',
  };

  const mainMenuItems = isSuperAdmin
    ? allMainMenuItems
    : allMainMenuItems.filter(i => hasPermission(user, featureKeyByPath[i.to]));
  const showDataEntry = isSuperAdmin ||
    ['warehouse', 'branches', 'products', 'supplier'].some(f => hasPermission(user, f));
  const showSales = isSuperAdmin || hasPermission(user, 'sales');

  const dataEntryFeatureByPath = {
    '/warehouse': 'warehouse', '/branches': 'branches', '/products': 'products', '/supplier': 'supplier',
  };

  const visibleDataEntryItems = (user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN')
    ? dataEntryItems
    : dataEntryItems.filter(i => hasPermission(user, dataEntryFeatureByPath[i.to]));

  const [dataEntryOpen, setDataEntryOpen] = useState(true);
  const [salesOpen, setSalesOpen] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const location = useLocation();
  const isSalesActive = location.pathname === '/sales';

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
        className={`
          fixed top-0 left-0 z-50 h-full
          w-72 sm:w-64 ${sidebarCollapsed ? 'lg:w-16' : 'lg:w-60'}
          bg-white text-gray-700 border-r border-gray-200 overflow-y-auto overflow-x-hidden
          transition-all duration-300 flex flex-col
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0
        `}
      >
        {/* Logo row */}
        <div className="flex items-center justify-between px-4 py-5 border-b border-gray-200 flex-shrink-0">
          {!sidebarCollapsed && (
            <span className="text-xl font-bold whitespace-nowrap text-orange-600">WiseCart ERP</span>
          )}
          {sidebarCollapsed && (
            <span className="text-xl font-bold mx-auto text-orange-600">WC</span>
          )}
          <button
            onClick={toggle}
            className="lg:hidden p-2 -mr-1 rounded-lg hover:bg-orange-50 text-gray-500 flex-shrink-0"
            aria-label="Close sidebar"
          >
            <X size={20} />
          </button>
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
                  ${isActive ? 'bg-orange-600 text-white font-[600]' : 'hover:bg-orange-50 hover:text-gray-900 hover:font-[600] font-[480] text-gray-600'}

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

          {/* Sales section (collapsible) */}
          {showSales && !sidebarCollapsed && (
            <div>
              <button
                onClick={() => setSalesOpen(!salesOpen)}
                className={`flex items-center justify-between w-full px-3 py-2.5 rounded-lg transition-colors text-sm
                  ${isSalesActive ? 'bg-orange-600 text-white font-[600]' : 'hover:bg-orange-50 hover:text-gray-900 hover:font-[600] font-[480] text-gray-600'}`}
              >
                <div className="flex items-center gap-3">
                  <ShoppingCart size={20} className="flex-shrink-0" />
                  <span className="font-medium">Sales</span>
                </div>
                {salesOpen
                  ? <ChevronDown size={16} />
                  : <ChevronRight size={16} />}
              </button>

              <div className={`overflow-hidden transition-all duration-300 ${salesOpen ? 'max-h-60' : 'max-h-0'}`}>
                <div className="ml-6 mt-1 space-y-1 border-l border-gray-200 pl-2">
                  {salesSubItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.label}
                        to={item.to}
                        onClick={() => window.innerWidth < 1024 && toggle()}
                        className="flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-sm hover:bg-orange-50 hover:text-gray-900 hover:font-[600] font-[480] text-gray-500"
                      >
                        <Icon size={17} className="flex-shrink-0" />
                        <span className="truncate">{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Sales icon-only when collapsed */}
          {showSales && sidebarCollapsed && (
            <NavLink
              to="/sales"
              title="Sales"
              onClick={() => window.innerWidth < 1024 && toggle()}
              className={({ isActive }) =>
                `flex items-center justify-center px-3 py-2.5 rounded-lg transition-colors
               ${isActive ? 'bg-orange-600 text-white font-[600]' : 'hover:bg-orange-50 hover:text-gray-900 hover:font-[600] font-[480] text-gray-600'}`
              }
            >
              <ShoppingCart size={20} className="flex-shrink-0" />
            </NavLink>
          )}

          {/* Data Entry section */}
          {showDataEntry && !sidebarCollapsed && (
            <div className="pt-1">
              <button
                onClick={() => setDataEntryOpen(!dataEntryOpen)}
                className="flex items-center justify-between w-full px-3 py-2.5 rounded-lg hover:bg-orange-50 hover:text-gray-900 hover:font-[600] font-[480] text-gray-600 transition-colors text-sm">                <div className="flex items-center gap-3">
                  <Database size={20} className="flex-shrink-0" />
                  <span className="font-medium">Data Entry</span>
                </div>
                {dataEntryOpen
                  ? <ChevronDown size={16} />
                  : <ChevronRight size={16} />}
              </button>

              <div className={`overflow-hidden transition-all duration-300 ${dataEntryOpen ? 'max-h-60' : 'max-h-0'}`}>
                <div className="ml-6 mt-1 space-y-1 border-l border-gray-200 pl-2">
                  {visibleDataEntryItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        onClick={() => window.innerWidth < 1024 && toggle()}
                        className={({ isActive }) =>
                          `flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-sm
                          ${isActive ? 'bg-orange-600 text-white font-[600]' : 'hover:bg-orange-50 hover:text-gray-900 hover:font-[600] font-[480] text-gray-500'}`
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
                     ${isActive ? 'bg-orange-600 text-white font-[600]' : 'hover:bg-orange-50 hover:text-gray-900 hover:font-[600] font-[480] text-gray-600'}`
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
            <div className="pt-1 border-t border-gray-200 mt-1">
              <NavLink to="/users"
                onClick={() => window.innerWidth < 1024 && toggle()}
                title={sidebarCollapsed ? 'User Management' : undefined}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-sm
                  ${isActive ? 'bg-orange-600 text-white font-[600]' : 'hover:bg-orange-50 hover:text-gray-900 hover:font-[600] font-[480] text-gray-600'}
                    ${sidebarCollapsed ? 'justify-center' : ''}`
                }
              >
                <UserPlus size={20} className="flex-shrink-0" />
                {!sidebarCollapsed && <span className="truncate">User Management</span>}
              </NavLink>
            </div>
          )}
        </nav>

        {/* Collapse toggle — desktop only, bottom of sidebar */}
        <div className="hidden lg:block flex-shrink-0 border-t border-gray-200 p-2">
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className={`
              flex items-center gap-3 w-full px-3 py-2.5 rounded-lg
              hover:bg-orange-50 text-gray-600 transition-colors text-sm
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
        className={`hidden lg:block flex-shrink-0 transition-all duration-300 ${sidebarCollapsed ? 'lg:w-16' : 'lg:w-60'}`}
      />
    </>
  );
};

export default Sidebar;