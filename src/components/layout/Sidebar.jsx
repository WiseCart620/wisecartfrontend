
import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  Package, Truck, Warehouse, ShoppingCart, Users, Home,
  UserPlus, PackageSearch, PackageOpen, ChevronDown, ChevronRight,
  ChevronLeft, Database, Factory, ClipboardList, X, BookOpen, BarChart3, FileText,
  Briefcase, Coins, Landmark, CalendarDays, Percent, Wallet, Gift, HandCoins, LogOut, ChevronsUpDown, Shield
} from 'lucide-react';
import { NavLink, Link, useLocation } from 'react-router-dom';
import { useAuth, hasPermission, can } from '../../context/AuthContext';

const allMainMenuItems = [
  { to: '/dashboard', label: 'Dashboard', icon: Home, userHidden: true },
  { to: '/warehouse-inventory', label: 'Warehouse Inventory', icon: PackageOpen, userHidden: true },
  { to: '/inventory', label: 'Inventory Record', icon: PackageSearch, userHidden: true },
  { to: '/procurement', label: 'Procurement', icon: ClipboardList, userHidden: true },
];

const payrollSubItems = [
  { to: '/employees', label: 'Employees', icon: Briefcase },
  { to: '/pay-types', label: 'Pay Types', icon: Coins },
  { to: '/loans-benefits', label: 'Loans & Other Deductions', icon: Landmark },
  { to: '/leave', label: 'Leave', icon: CalendarDays },
  { to: '/tax-statutory', label: 'Tax & Statutory', icon: Percent },
  { to: '/payroll-runs', label: 'Payroll Runs', icon: Wallet },
  { to: '/year-end', label: 'Year-End', icon: Gift },
];

const dataEntryItems = [
  { to: '/warehouse', label: 'Warehouse', icon: Warehouse },
  { to: '/branches', label: 'Branches & Companies', icon: Users },
  { to: '/products', label: 'Products', icon: Package },
  { to: '/supplier', label: 'Supplier', icon: Factory },
];

const salesSubItems = [
  { to: '/sales', label: 'All Sales', icon: ShoppingCart, end: true, permAction: 'view' },
  { to: '/sales/journal', label: 'Sales Journal', icon: BookOpen, permAction: 'invoice' },
  { to: '/sales/report', label: 'Sales Report', icon: BarChart3, permAction: 'report' },
];

const deliveriesSubItems = [
  { to: '/deliveries', label: 'Delivery', icon: Truck, end: true, permAction: 'view' },
  { to: '/transmittals', label: 'Transmittal', icon: FileText, permAction: 'transmittal' },
];

const Sidebar = ({ isOpen, toggle }) => {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  const mainMenuItems = isSuperAdmin
    ? allMainMenuItems
    : allMainMenuItems.filter(i => hasPermission(user, {
      '/dashboard': 'dashboard',
      '/warehouse-inventory': 'warehouse_inventory',
      '/inventory': 'inventory',
      '/procurement': 'procurement',
    }[i.to]));

  const showPayroll = isSuperAdmin || hasPermission(user, 'employees');
  const visiblePayrollSubItems = isSuperAdmin
    ? payrollSubItems
    : payrollSubItems.filter(() => hasPermission(user, 'employees'));
  // ^ all payroll pages share the "employees" feature key today, so this is a single
  // check rather than a per-item one — if a payroll sub-item ever gets its own
  // feature key, filter it individually here the same way visibleSalesSubItems does.

  const showDataEntry = isSuperAdmin ||
    ['warehouse', 'branches', 'products', 'supplier'].some(f => hasPermission(user, f));
  const showSales = isSuperAdmin || hasPermission(user, 'sales');
  const visibleSalesSubItems = isSuperAdmin
    ? salesSubItems
    : salesSubItems.filter(i => can(user, 'sales', i.permAction));
  const showDeliveries = isSuperAdmin || hasPermission(user, 'deliveries');
  const visibleDeliveriesSubItems = isSuperAdmin
    ? deliveriesSubItems
    : deliveriesSubItems.filter(i => can(user, 'deliveries', i.permAction));

  const dataEntryFeatureByPath = {
    '/warehouse': 'warehouse', '/branches': 'branches', '/products': 'products', '/supplier': 'supplier',
  };

  const visibleDataEntryItems = (user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN')
    ? dataEntryItems
    : dataEntryItems.filter(i => hasPermission(user, dataEntryFeatureByPath[i.to]));

  const location = useLocation();
  const isUnder = (paths) => paths.some(p => location.pathname === p || location.pathname.startsWith(p + '/'));

  const [payrollOpen, setPayrollOpen] = useState(() =>
    isUnder(['/employees', '/pay-types', '/loans-benefits', '/leave', '/tax-statutory', '/payroll-runs', '/year-end']));
  const [deliveriesOpen, setDeliveriesOpen] = useState(() =>
    isUnder(['/deliveries', '/transmittals']));
  const [salesOpen, setSalesOpen] = useState(() =>
    isUnder(['/sales']));
  const [dataEntryOpen, setDataEntryOpen] = useState(() =>
    isUnder(['/warehouse', '/branches', '/products', '/supplier']));
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const profileRef = useRef(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [menuPos, setMenuPos] = useState({});

  const stored = JSON.parse(localStorage.getItem('user') || '{}');
  const fullName = user?.fullName ?? stored.fullName ?? '';
  const username = user?.username ?? stored.username ?? '';
  const email = user?.email ?? stored.email ?? '';
  const role = user?.role ?? stored.role ?? 'User';
  const displayName = fullName || username || 'User';
  const initials = displayName.split(' ').filter(Boolean).slice(0, 2)
    .map(s => s[0]).join('').toUpperCase();

  const toggleProfile = () => {
    if (profileOpen) { setProfileOpen(false); return; }
    const r = profileRef.current.getBoundingClientRect();
    setMenuPos(sidebarCollapsed
      ? { left: r.right + 8, bottom: window.innerHeight - r.bottom }
      : { left: r.left, width: r.width, bottom: window.innerHeight - r.top + 8 });
    setProfileOpen(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    localStorage.removeItem('refreshToken');
    window.location.href = '/login';
  };

  return (
    <>
      <div
        className={`fixed inset-0 bg-white/30 backdrop-blur-sm z-40 lg:hidden transition-opacity duration-300
    ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={toggle}
      />

      {/* ── Sidebar panel ── */}
      <aside
        className={`
          fixed top-0 left-0 z-50 h-full
          w-72 sm:w-64 ${sidebarCollapsed ? 'lg:w-16' : 'lg:w-60'}
          bg-white text-gray-700 border-r border-gray-200 overflow-hidden
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
            className="lg:hidden p-2 -mr-1 rounded hover:bg-orange-50 text-gray-500 flex-shrink-0"
            aria-label="Close sidebar"
          >
            <X size={20} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-2 space-y-1">

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
                  `flex items-center gap-3 px-3 py-2.5 rounded transition-colors text-sm
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

          {/* Payroll section (collapsible) */}
          {showPayroll && !sidebarCollapsed && (
            <div>
              <button
                onClick={() => setPayrollOpen(!payrollOpen)}
                className="flex items-center justify-between w-full px-3 py-2.5 rounded hover:bg-orange-50 hover:text-gray-900 hover:font-[600] font-[480] text-gray-600 transition-colors text-sm"
              >
                <div className="flex items-center gap-3">
                  <HandCoins size={20} className="flex-shrink-0" />
                  <span className="font-medium">Payroll</span>
                </div>
                {payrollOpen
                  ? <ChevronDown size={16} />
                  : <ChevronRight size={16} />}
              </button>

              <div className={`overflow-hidden transition-all duration-300 ${payrollOpen ? 'max-h-96' : 'max-h-0'}`}>
                <div className="ml-6 mt-1 space-y-1 border-l border-gray-200 pl-2">
                  {visiblePayrollSubItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        onClick={() => window.innerWidth < 1024 && toggle()}
                        className={({ isActive }) =>
                          `flex items-center gap-3 px-3 py-2 rounded transition-colors text-sm
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

          {/* Payroll icon-only when collapsed */}
          {showPayroll && sidebarCollapsed && (
            <NavLink
              to="/employees"
              title="Payroll"
              onClick={() => window.innerWidth < 1024 && toggle()}
              className={({ isActive }) =>
                `flex items-center justify-center px-3 py-2.5 rounded transition-colors
               ${isActive ? 'bg-orange-600 text-white font-[600]' : 'hover:bg-orange-50 hover:text-gray-900 hover:font-[600] font-[480] text-gray-600'}`
              }
            >
              <HandCoins size={20} className="flex-shrink-0" />
            </NavLink>
          )}

          {/* Deliveries section (collapsible) */}
          {showDeliveries && !sidebarCollapsed && (
            <div>
              <button
                onClick={() => setDeliveriesOpen(!deliveriesOpen)}
                className="flex items-center justify-between w-full px-3 py-2.5 rounded hover:bg-orange-50 hover:text-gray-900 hover:font-[600] font-[480] text-gray-600 transition-colors text-sm"
              >
                <div className="flex items-center gap-3">
                  <Truck size={20} className="flex-shrink-0" />
                  <span className="font-medium">Deliveries</span>
                </div>
                {deliveriesOpen
                  ? <ChevronDown size={16} />
                  : <ChevronRight size={16} />}
              </button>

              <div className={`overflow-hidden transition-all duration-300 ${deliveriesOpen ? 'max-h-60' : 'max-h-0'}`}>
                <div className="ml-6 mt-1 space-y-1 border-l border-gray-200 pl-2">
                  {visibleDeliveriesSubItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        end={item.end}
                        onClick={() => window.innerWidth < 1024 && toggle()}
                        className={({ isActive }) =>
                          `flex items-center gap-3 px-3 py-2 rounded transition-colors text-sm
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

          {/* Deliveries icon-only when collapsed */}
          {showDeliveries && sidebarCollapsed && (
            <NavLink
              to="/deliveries"
              end
              title="Deliveries"
              onClick={() => window.innerWidth < 1024 && toggle()}
              className={({ isActive }) =>
                `flex items-center justify-center px-3 py-2.5 rounded transition-colors
               ${isActive ? 'bg-orange-600 text-white font-[600]' : 'hover:bg-orange-50 hover:text-gray-900 hover:font-[600] font-[480] text-gray-600'}`
              }
            >
              <Truck size={20} className="flex-shrink-0" />
            </NavLink>
          )}

          {/* Sales section (collapsible) */}
          {showSales && !sidebarCollapsed && (
            <div>
              <button
                onClick={() => setSalesOpen(!salesOpen)}
                className="flex items-center justify-between w-full px-3 py-2.5 rounded hover:bg-orange-50 hover:text-gray-900 hover:font-[600] font-[480] text-gray-600 transition-colors text-sm"
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
                  {visibleSalesSubItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        end={item.end}
                        onClick={() => window.innerWidth < 1024 && toggle()}
                        className={({ isActive }) =>
                          `flex items-center gap-3 px-3 py-2 rounded transition-colors text-sm
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

          {/* Sales icon-only when collapsed */}
          {showSales && sidebarCollapsed && (
            <NavLink
              to="/sales"
              end
              title="Sales"
              onClick={() => window.innerWidth < 1024 && toggle()}
              className={({ isActive }) =>
                `flex items-center justify-center px-3 py-2.5 rounded transition-colors
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
                className="flex items-center justify-between w-full px-3 py-2.5 rounded hover:bg-orange-50 hover:text-gray-900 hover:font-[600] font-[480] text-gray-600 transition-colors text-sm">                <div className="flex items-center gap-3">
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
                          `flex items-center gap-3 px-3 py-2 rounded transition-colors text-sm
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
                      `flex items-center justify-center px-3 py-2.5 rounded transition-colors
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
                  `flex items-center gap-3 px-3 py-2.5 rounded transition-colors text-sm
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

        {/* Profile (Claude-style, bottom of sidebar) */}
        <div className="flex-shrink-0 border-t border-gray-200 p-2">
          <button
            ref={profileRef}
            onClick={toggleProfile}
            title={sidebarCollapsed ? displayName : undefined}
            className={`flex items-center gap-3 w-full px-2 py-2 rounded hover:bg-orange-50 transition-colors
      ${sidebarCollapsed ? 'lg:justify-center' : ''}`}
          >
            <div className="relative w-8 h-8 rounded-full bg-orange-100 text-orange-700 text-xs font-semibold flex items-center justify-center flex-shrink-0">
              {initials || 'U'}
              {role === 'SUPER_ADMIN' && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-orange-500 rounded-full flex items-center justify-center">
                  <Shield size={10} className="text-white" />
                </span>
              )}
            </div>
            {!sidebarCollapsed && (
              <>
                <div className="min-w-0 flex-1 text-left">
                  <p className="text-sm font-medium text-gray-900 truncate leading-tight">{displayName}</p>
                  <p className="text-xs text-gray-500 truncate leading-tight">{role}</p>
                </div>
                <ChevronsUpDown size={16} className="text-gray-400 flex-shrink-0" />
              </>
            )}
          </button>
        </div>

        {/* Popup rendered in a portal so the sidebar's overflow can't clip it */}
        {profileOpen && createPortal(
          <>
            <div className="fixed inset-0 z-[60]" onClick={() => setProfileOpen(false)} />
            <div
              className="fixed z-[70] min-w-[14rem] bg-white rounded-xl shadow-lg border border-gray-200 py-2"
              style={menuPos}
            >
              <div className="px-4 py-2 border-b border-gray-100">
                {fullName && <p className="font-medium text-gray-900 truncate">{fullName}</p>}
                <p className="text-sm text-gray-500 truncate">{username}</p>
                {email && <p className="text-sm text-gray-500 truncate">{email}</p>}
                <span className="inline-block mt-2 px-2.5 py-1 bg-gray-100 rounded-full text-xs font-medium text-gray-700">
                  {role}
                </span>
              </div>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-2 mt-1 text-left text-sm text-red-600 hover:bg-white"
              >
                <LogOut size={16} /> Logout
              </button>
            </div>
          </>,
          document.body
        )}

        {/* Collapse toggle — desktop only, bottom of sidebar */}
        <div className="hidden lg:block flex-shrink-0 border-t border-gray-200 p-2">
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className={`
              flex items-center gap-3 w-full px-3 py-2.5 rounded
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