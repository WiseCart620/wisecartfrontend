import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  Package, Truck, Warehouse, ShoppingCart, Users, LayoutGrid,
  UserPlus, PackageSearch, PackageOpen, ChevronRight, ChevronLeft, ChevronDown,
  Factory, ClipboardList, X, BookOpen, BarChart3, FileText,
  Briefcase, Coins, Landmark, CalendarDays, Percent, Wallet, Gift,
  LogOut, Shield, Search
} from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { useAuth, hasPermission, can } from '../../context/AuthContext';

// File lives in /public, so it is served from the site root. Spaces and brackets are URL-encoded.
const LOGO_SRC = '/WISECART%20Logo%20(8).png';

const allMainMenuItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutGrid },
  { to: '/warehouse-inventory', label: 'Warehouse Inventory', icon: PackageOpen },
  { to: '/inventory', label: 'Inventory Record', icon: PackageSearch },
  { to: '/procurement', label: 'Procurement', icon: ClipboardList },
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

// Optional per-item badge: add  badge: { text: '05', tone: 'orange' }  or  { text: 'New', tone: 'purple' }
const badgeTones = {
  orange: 'bg-orange-500 text-white',
  purple: 'bg-violet-500 text-white',
};

const NavItem = ({ item, collapsed, onNavigate, onTip }) => {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.to}
      end={item.end}
      onClick={onNavigate}
      onMouseEnter={(e) => collapsed && onTip({ label: item.label, rect: e.currentTarget.getBoundingClientRect() })}
      onMouseLeave={() => onTip(null)}
      className={({ isActive }) =>
        `flex items-center gap-3 rounded-lg text-sm transition-colors
        ${collapsed ? 'justify-center w-10 h-10 mx-auto' : 'px-3 py-2'}
        ${isActive
          ? 'bg-orange-50 text-orange-600 font-semibold'
          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 font-medium'}`
      }
    >
      <Icon size={20} strokeWidth={1.75} className="flex-shrink-0" />
      {!collapsed && <span className="truncate flex-1">{item.label}</span>}
      {!collapsed && item.badge && (
        <span className={`px-1.5 py-0.5 rounded text-[11px] font-semibold ${badgeTones[item.badge.tone] || badgeTones.orange}`}>
          {item.badge.text}
        </span>
      )}
    </NavLink>
  );
};

const Sidebar = ({ isOpen, toggle }) => {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  /* ── permissions (unchanged logic) ── */
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

  /* ── state ── */
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [query, setQuery] = useState('');
  const [closedSections, setClosedSections] = useState({
    general: true, sales: true, deliveries: true, payroll: true, data: true, admin: true,
  });
  const toggleSection = (key) => setClosedSections(prev => ({ ...prev, [key]: !prev[key] }));
  const [tip, setTip] = useState(null);

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

  const onNavigate = () => { setTip(null); if (window.innerWidth < 1024) toggle(); };

  /* ── sections ── */
  const q = query.trim().toLowerCase();
  const sections = [
    { key: 'general', label: 'General', short: 'Gen', items: mainMenuItems },
    { key: 'sales', label: 'Sales', short: 'Sal', items: showSales ? visibleSalesSubItems : [] },
    { key: 'deliveries', label: 'Deliveries', short: 'Del', items: showDeliveries ? visibleDeliveriesSubItems : [] },
    { key: 'payroll', label: 'Payroll', short: 'Pay', items: showPayroll ? visiblePayrollSubItems : [] },
    { key: 'data', label: 'Data Entry', short: 'Data', items: showDataEntry ? visibleDataEntryItems : [] },
    { key: 'admin', label: 'Admin', short: 'Adm', items: isSuperAdmin ? [{ to: '/users', label: 'User Management', icon: UserPlus }] : [] },
  ]
    .map(s => ({ ...s, items: q ? s.items.filter(i => i.label.toLowerCase().includes(q)) : s.items }))
    .filter(s => s.items.length > 0);

  return (
    <>
      {/* Thin, subtle nav scrollbar: faint at rest, darker on hover */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&display=swap');
        .sidebar-scroll { scrollbar-width: thin; scrollbar-color: transparent transparent; }
        .sidebar-scroll:hover { scrollbar-color: #d1d5db transparent; }
        .sidebar-scroll::-webkit-scrollbar { width: 6px; }
        .sidebar-scroll::-webkit-scrollbar-button { display: none; width: 0; height: 0; }
        .sidebar-scroll::-webkit-scrollbar-track { background: transparent; }
        .sidebar-scroll::-webkit-scrollbar-thumb { background: transparent; border-radius: 9999px; }
        .sidebar-scroll:hover::-webkit-scrollbar-thumb { background: #d1d5db; }
        .sidebar-scroll::-webkit-scrollbar-thumb:hover { background: #9ca3af; }
      `}</style>

      {/* Mobile overlay */}
      <div
        className={`fixed inset-0 bg-white/30 backdrop-blur-sm z-40 lg:hidden transition-opacity duration-300
          ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={toggle}
      />

      <aside
        className={`
          fixed top-0 left-0 z-50 h-full
          w-72 sm:w-64 ${sidebarCollapsed ? 'lg:w-[68px]' : 'lg:w-64'}
          bg-white text-gray-700 border-r border-gray-200 overflow-hidden
          transition-[width,transform] duration-200 ease-out will-change-[width] flex flex-col
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0
        `}
      >
        {/* Header: logo + collapse toggle */}
        <div className={`flex-shrink-0 px-3 pt-4 pb-3 ${sidebarCollapsed ? 'flex flex-col items-center gap-3' : 'flex items-center justify-between'}`}>
          <div className="flex items-center gap-2 min-w-0">
            <div
              className={`flex items-center justify-center flex-shrink-0 bg-white rounded-xl shadow-[0_2px_10px_rgba(0,0,0,0.12)]
                ${sidebarCollapsed ? 'w-11 h-11 p-1.5' : 'w-14 h-14 p-2'}`}
            >
              <img src={LOGO_SRC} alt="WiseCart" className="w-full h-full object-contain" />
            </div>
            {!sidebarCollapsed && (
              <span
                className="text-[16px] font-bold tracking-wide text-gray-900 whitespace-nowrap truncate"
                style={{ fontFamily: "'Playfair Display', serif" }}
              >
                WISECART
              </span>
            )}
          </div>

          <button
            onClick={() => { setTip(null); setSidebarCollapsed(!sidebarCollapsed); }}
            className="hidden lg:flex w-6 h-6 rounded-full border border-gray-200 bg-white text-gray-500 hover:text-orange-600 hover:border-orange-300 items-center justify-center flex-shrink-0 transition-colors"
            title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {sidebarCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>

          <button
            onClick={toggle}
            className="lg:hidden p-1.5 rounded-md hover:bg-gray-100 text-gray-500 flex-shrink-0"
            aria-label="Close sidebar"
          >
            <X size={20} />
          </button>
        </div>

        {/* Search */}
        <div className={`flex-shrink-0 pb-2 ${sidebarCollapsed ? 'px-0' : 'px-3'}`}>
          {sidebarCollapsed ? (
            <button
              onClick={() => setSidebarCollapsed(false)}
              onMouseEnter={(e) => setTip({ label: 'Search', rect: e.currentTarget.getBoundingClientRect() })}
              onMouseLeave={() => setTip(null)}
              className="w-10 h-10 mx-auto flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50"
              aria-label="Search menu"
            >
              <Search size={18} strokeWidth={1.75} />
            </button>
          ) : (
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search menu"
                className="w-full h-9 pl-9 pr-3 rounded-lg border border-gray-200 bg-gray-50 text-sm text-gray-700 placeholder:text-gray-400
                  focus:outline-none focus:bg-white focus:border-orange-300 focus:ring-2 focus:ring-orange-100"
              />
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className={`flex-1 min-h-0 overflow-y-auto overflow-x-hidden pb-2 sidebar-scroll ${sidebarCollapsed ? 'px-0' : 'px-3'}`}>
          {sections.map((section, idx) => (
            <div key={section.key} className={sidebarCollapsed ? 'mb-2' : 'mb-1'}>
              {sidebarCollapsed ? (
                <p className={`text-center text-[10px] font-semibold tracking-wide text-gray-400 uppercase pb-1 ${idx > 0 ? 'mt-2 pt-2 border-t border-gray-100 mx-3' : 'pt-1'}`}>
                  {section.short}
                </p>
              ) : (
                <button
                  onClick={() => toggleSection(section.key)}
                  className="group w-full flex items-center justify-between px-3 pt-4 pb-1.5 text-[11px] font-semibold tracking-wider text-gray-400 hover:text-gray-600 uppercase transition-colors"
                  aria-expanded={!closedSections[section.key]}
                >
                  <span>{section.label}</span>
                  <ChevronDown
                    size={14}
                    className={`transition-transform duration-200 ${closedSections[section.key] ? '-rotate-90' : ''}`}
                  />
                </button>
              )}
              <div className={`space-y-0.5 ${!sidebarCollapsed && !q && closedSections[section.key] ? 'hidden' : ''}`}>
                {section.items.map(item => (
                  <NavItem
                    key={item.to}
                    item={item}
                    collapsed={sidebarCollapsed}
                    onNavigate={onNavigate}
                    onTip={setTip}
                  />
                ))}
              </div>
            </div>
          ))}

          {q && sections.length === 0 && !sidebarCollapsed && (
            <p className="px-3 py-6 text-sm text-gray-400 text-center">No matching pages</p>
          )}
        </nav>

        {/* Profile */}
        <div className="flex-shrink-0 border-t border-gray-200 p-2">
          <button
            ref={profileRef}
            onClick={toggleProfile}
            onMouseEnter={(e) => sidebarCollapsed && setTip({ label: displayName, rect: e.currentTarget.getBoundingClientRect() })}
            onMouseLeave={() => setTip(null)}
            className={`flex items-center gap-3 w-full px-2 py-2 rounded-lg hover:bg-gray-50 transition-colors
              ${sidebarCollapsed ? 'lg:justify-center' : ''}`}
          >
            <div className="relative w-9 h-9 rounded-full bg-orange-100 text-orange-700 text-xs font-semibold flex items-center justify-center flex-shrink-0">
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
                <span className="w-6 h-6 rounded-full border border-orange-300 text-orange-600 flex items-center justify-center flex-shrink-0">
                  <ChevronRight size={14} />
                </span>
              </>
            )}
          </button>
        </div>
      </aside>

      {/* Profile popup (portal so the sidebar's overflow can't clip it) */}
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
              className="w-full flex items-center gap-3 px-4 py-2 mt-1 text-left text-sm text-red-600 hover:bg-red-50"
            >
              <LogOut size={16} /> Logout
            </button>
          </div>
        </>,
        document.body
      )}

      {/* Tooltip for the collapsed rail (portal, so it isn't clipped) */}
      {tip && sidebarCollapsed && createPortal(
        <div
          className="fixed z-[80] pointer-events-none px-2.5 py-1.5 rounded-md bg-gray-900 text-white text-xs font-medium whitespace-nowrap shadow-lg"
          style={{ left: tip.rect.right + 10, top: tip.rect.top + tip.rect.height / 2, transform: 'translateY(-50%)' }}
        >
          {tip.label}
        </div>,
        document.body
      )}

      {/* Spacer that pushes page content — desktop only */}
      <div
        className={`hidden lg:block flex-shrink-0 transition-[width] duration-200 ease-out ${sidebarCollapsed ? 'lg:w-[68px]' : 'lg:w-64'}`}
      />
    </>
  );
};

export default Sidebar;