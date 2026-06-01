import React, { useState, useMemo, useCallback, memo } from 'react';
import { Bell, X, Download, CheckCheck, Trash2, RefreshCw, AlertCircle, AlertTriangle, Info, CheckCircle, Database, Loader2, Filter, XCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { api } from '../../services/api';

const PAGE_SIZE = 20;

// ── Memoized individual alert row ─────────────────────────────────────────────
const AlertRow = memo(({ alertItem, index, isThisResolving, bulkLoading, onResolve }) => {
  let alertConfig = {
    icon: AlertCircle,
    iconColor: 'text-yellow-600',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200',
    severityColor: 'bg-yellow-100 text-yellow-800'
  };

  if (alertItem.isResolved) {
    alertConfig = { icon: CheckCircle, iconColor: 'text-green-600', bgColor: 'bg-green-50', borderColor: 'border-green-200', severityColor: 'bg-green-100 text-green-800' };
  } else if (alertItem.severity === 'CRITICAL') {
    alertConfig = { icon: AlertTriangle, iconColor: 'text-red-600', bgColor: 'bg-red-50', borderColor: 'border-red-200', severityColor: 'bg-red-100 text-red-800' };
  } else if (alertItem.severity === 'HIGH') {
    alertConfig = { icon: AlertTriangle, iconColor: 'text-orange-600', bgColor: 'bg-orange-50', borderColor: 'border-orange-200', severityColor: 'bg-orange-100 text-orange-800' };
  } else if (alertItem.severity === 'MEDIUM') {
    alertConfig = { icon: Info, iconColor: 'text-blue-600', bgColor: 'bg-blue-50', borderColor: 'border-blue-200', severityColor: 'bg-blue-100 text-blue-800' };
  } else if (alertItem.severity === 'LOW') {
    alertConfig = { icon: Bell, iconColor: 'text-gray-600', bgColor: 'bg-gray-50', borderColor: 'border-gray-200', severityColor: 'bg-gray-100 text-gray-800' };
  }

  const Icon = alertConfig.icon;

  const alertDate = useMemo(() => {
    try { return alertItem.createdAt ? new Date(alertItem.createdAt) : new Date(); } catch { return new Date(); }
  }, [alertItem.createdAt]);

  const resolvedDate = useMemo(() => {
    try { return alertItem.resolvedAt ? new Date(alertItem.resolvedAt) : null; } catch { return null; }
  }, [alertItem.resolvedAt]);

  return (
    <div className={`p-6 transition-colors ${alertConfig.bgColor} border-b ${alertConfig.borderColor} ${isThisResolving ? 'opacity-60' : ''}`}>
      <div className="flex gap-4">
        <div className={`p-3 rounded-xl ${alertConfig.bgColor} ${alertConfig.iconColor} flex-shrink-0`}>
          <Icon size={24} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2 flex-wrap">
                <h4 className="font-bold text-gray-900 text-lg">
                  {alertItem.title || `Alert #${alertItem.id || index + 1}`}
                </h4>
                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${alertConfig.severityColor}`}>
                  {alertItem.severity || 'MEDIUM'}
                </span>
                {alertItem.alertType && (
                  <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                    {alertItem.alertType.replace(/_/g, ' ')}
                  </span>
                )}
                {alertItem.isResolved && (
                  <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded font-medium">RESOLVED</span>
                )}
              </div>
              <p className="text-gray-700 text-base">{alertItem.message || 'No message provided'}</p>
            </div>
            <div className="text-right text-sm text-gray-500 whitespace-nowrap ml-4 flex-shrink-0">
              <div className="font-medium">
                {alertDate.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
              </div>
              <div className="text-xs">
                {alertDate.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' })}
              </div>
              {resolvedDate && (
                <div className="mt-2 pt-2 border-t border-gray-200">
                  <div className="text-xs text-gray-400">Resolved:</div>
                  <div className="text-xs">
                    {resolvedDate.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {(alertItem.branch || alertItem.product || alertItem.currentValue !== null) && (
            <div className="grid grid-cols-3 gap-4 mt-4">
              {alertItem.branch && (
                <div className="bg-white p-3 rounded-lg border border-gray-200">
                  <p className="text-xs text-gray-500">Branch</p>
                  <p className="font-semibold text-gray-900 truncate">{alertItem.branch.branchName}</p>
                  <p className="text-xs text-gray-500 truncate">{alertItem.branch.branchCode}</p>
                </div>
              )}
              {alertItem.product && (
                <div className="bg-white p-3 rounded-lg border border-gray-200">
                  <p className="text-xs text-gray-500">Product</p>
                  <p className="font-semibold text-gray-900 truncate">{alertItem.product.productName}</p>
                  {alertItem.variationLabel && (
                    <span className="inline-flex items-center px-1.5 py-0.5 mt-1 rounded text-xs bg-blue-100 text-blue-700 font-medium">
                      {alertItem.variationLabel}
                    </span>
                  )}
                  <p className="text-xs text-gray-500 truncate">{alertItem.product.sku}</p>
                </div>
              )}
              {(alertItem.currentValue !== null || alertItem.thresholdValue !== null) && (
                <div className="bg-white p-3 rounded-lg border border-gray-200">
                  <p className="text-xs text-gray-500">
                    {alertItem.currentValue !== null ? 'Current / Threshold' : 'Threshold'}
                  </p>
                  <div className="flex items-baseline gap-2">
                    {alertItem.currentValue !== null && (
                      <span className="font-bold text-lg">{alertItem.currentValue}</span>
                    )}
                    {alertItem.thresholdValue !== null && (
                      <>
                        {alertItem.currentValue !== null && <span className="text-gray-400">/</span>}
                        <span className="font-semibold text-gray-700">{alertItem.thresholdValue}</span>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {!alertItem.isResolved && (
            <div className="flex items-center justify-between mt-6">
              <div className="flex items-center gap-2 text-sm text-gray-500">
                {alertItem.saleId && (
                  <span className="px-2 py-1 bg-gray-100 rounded text-xs">Sale #{alertItem.saleId}</span>
                )}
                {alertItem.referenceId && (
                  <span className="px-2 py-1 bg-gray-100 rounded text-xs">Ref: {alertItem.referenceId}</span>
                )}
              </div>
              <button
                onClick={() => onResolve(alertItem)}
                disabled={isThisResolving || bulkLoading}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isThisResolving
                  ? <><Loader2 size={16} className="animate-spin" /> Resolving...</>
                  : <><CheckCircle size={16} /> Mark as Resolved</>}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

AlertRow.displayName = 'AlertRow';

// ── Main component ────────────────────────────────────────────────────────────
const AlertManagement = ({
  showNotifications,
  setShowNotifications,
  alerts,
  loadAlerts,
  alertsCurrentPage = 0,
  alertsTotalPages = 1,
  alertsTotalElements = 0,
}) => {
  const [activeTab, setActiveTab] = useState('active');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSeverity, setFilterSeverity] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [filterBranch, setFilterBranch] = useState('all');
  const [filterCompany, setFilterCompany] = useState('all');
  const [loadingAlertIds, setLoadingAlertIds] = useState(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const branchOptions = useMemo(() => {
    const map = new Map();
    alerts.forEach(a => {
      if (a.branch?.id) map.set(a.branch.id, a.branch.branchName);
    });
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [alerts]);

  const companyOptions = useMemo(() => {
    const set = new Set();
    alerts.forEach(a => {
      const m = a.message?.match(/(?:Company:|companies\s+')([^,']+)/i);
      if (m) set.add(m[1].trim());
    });
    return [...set].sort();
  }, [alerts]);

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  const handleTabChange = useCallback((tab) => { setActiveTab(tab); }, []);

  const activeFilterCount = [
    searchQuery,
    filterSeverity !== 'all' ? filterSeverity : '',
    filterType !== 'all' ? filterType : '',
    filterBranch !== 'all' ? filterBranch : '',
    filterCompany !== 'all' ? filterCompany : '',
  ].filter(Boolean).length;

  const clearAllFilters = useCallback(() => {
    setSearchQuery('');
    setFilterSeverity('all');
    setFilterType('all');
    setFilterBranch('all');
    setFilterCompany('all');
  }, []);

  const filteredAlerts = useMemo(() => {
    let result = alerts;
    if (activeTab === 'active') result = result.filter(a => !a.isResolved);
    if (activeTab === 'resolved') result = result.filter(a => a.isResolved);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(a =>
        a.title?.toLowerCase().includes(q) ||
        a.message?.toLowerCase().includes(q) ||
        a.branch?.branchName?.toLowerCase().includes(q) ||
        a.product?.productName?.toLowerCase().includes(q) ||
        a.severity?.toLowerCase().includes(q) ||
        a.alertType?.toLowerCase().includes(q)
      );
    }
    if (filterSeverity !== 'all') result = result.filter(a => a.severity === filterSeverity);
    if (filterType !== 'all') result = result.filter(a => a.alertType === filterType);
    if (filterBranch !== 'all') result = result.filter(a => String(a.branch?.id) === filterBranch);
    if (filterCompany !== 'all') {
      const cLower = filterCompany.toLowerCase();
      result = result.filter(a => a.message?.toLowerCase().includes(cLower));
    }
    return result;
  }, [alerts, activeTab, searchQuery, filterSeverity, filterType, filterBranch, filterCompany]);

  const activeCount = useMemo(() => alerts.filter(a => !a.isResolved).length, [alerts]);
  const resolvedCount = useMemo(() => alerts.filter(a => a.isResolved).length, [alerts]);

  const goToPage = useCallback(async (page) => {
    if (page < 0 || page >= alertsTotalPages || pageLoading) return;
    setPageLoading(true);
    try { await loadAlerts(page); }
    finally { setPageLoading(false); }
  }, [alertsTotalPages, loadAlerts, pageLoading]);

  const pageButtons = useMemo(() => {
    if (alertsTotalPages <= 1) return [];
    const pages = [];
    const current = alertsCurrentPage;
    const total = alertsTotalPages;
    const toShow = new Set(
      [0, total - 1, current, current - 1, current + 1].filter(p => p >= 0 && p < total)
    );
    const sorted = [...toShow].sort((a, b) => a - b);
    sorted.forEach((page, i) => {
      if (i > 0 && page - sorted[i - 1] > 1) pages.push('...');
      pages.push(page);
    });
    return pages;
  }, [alertsCurrentPage, alertsTotalPages]);

  const handleResolveOne = useCallback(async (alertItem) => {
    setLoadingAlertIds(prev => new Set(prev).add(alertItem.id));
    try {
      const response = await api.put(`/alerts/${alertItem.id}/resolve`, {
        resolvedBy: 'admin', notes: 'Resolved manually'
      });
      if (response.success) { await loadAlerts(alertsCurrentPage); showToast('Alert resolved successfully'); }
      else showToast('Failed to resolve alert', 'error');
    } catch (err) {
      showToast('Failed to resolve alert: ' + err.message, 'error');
    } finally {
      setLoadingAlertIds(prev => { const n = new Set(prev); n.delete(alertItem.id); return n; });
    }
  }, [loadAlerts, showToast, alertsCurrentPage]);

  const handleResolveAll = useCallback(async () => {
    if (!window.confirm(`Resolve all active alerts?`)) return;
    setBulkLoading(true);
    try {
      const response = await api.put('/alerts/resolve-all', {
        resolvedBy: 'admin', notes: 'Resolved all via dashboard'
      });
      if (response.success) { await loadAlerts(0); showToast('All active alerts resolved'); }
      else showToast('Failed to resolve all alerts', 'error');
    } catch (err) {
      showToast('Failed to resolve alerts: ' + err.message, 'error');
    } finally { setBulkLoading(false); }
  }, [loadAlerts, showToast]);

  const handleDownloadAndClear = useCallback(async () => {
    setBulkLoading(true);
    try {
      const response = await api.get('/alerts/export');
      if (response.success && response.data) {
        const blob = new Blob([response.data], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `resolved-alerts-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a); a.click();
        window.URL.revokeObjectURL(url); document.body.removeChild(a);
        const del = await api.delete('/alerts/resolved');
        if (del.success) { await loadAlerts(0); showToast(`Downloaded and cleared resolved alerts`); }
      }
    } catch (err) {
      showToast('Failed to process resolved alerts: ' + err.message, 'error');
    } finally { setBulkLoading(false); }
  }, [loadAlerts, showToast]);

  const handleDeleteAllResolved = useCallback(async () => {
    if (!window.confirm(`Delete all resolved alerts?`)) return;
    setBulkLoading(true);
    try {
      const response = await api.delete('/alerts/resolved');
      if (response.success) { await loadAlerts(0); showToast('Deleted resolved alerts'); }
    } catch (err) {
      showToast('Failed to delete resolved alerts: ' + err.message, 'error');
    } finally { setBulkLoading(false); }
  }, [loadAlerts, showToast]);

  if (!showNotifications) return null;

  return (
    <>
      {/* Toast */}
      {toast && (
        <div className={`fixed top-6 right-6 z-[9999] flex items-center gap-3 px-5 py-3 rounded-xl shadow-xl text-white text-sm font-medium
          ${toast.type === 'error' ? 'bg-red-600' : 'bg-green-600'}`}>
          {toast.type === 'error' ? <AlertCircle size={18} /> : <CheckCircle size={18} />}
          {toast.message}
        </div>
      )}

      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/60 z-40 transition-opacity"
        onClick={() => !bulkLoading && setShowNotifications(false)}
      />

      {/* Modal */}
      <div
        className="fixed left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 w-11/12 max-w-6xl bg-white rounded-2xl shadow-2xl z-50 border border-gray-200 overflow-hidden flex flex-col"
        style={{ height: 'min(90vh, 900px)', minHeight: '500px' }}
      >
        {/* Loading overlay */}
        {(bulkLoading || pageLoading) && (
          <div className="absolute inset-0 bg-white/80 z-10 flex flex-col items-center justify-center gap-3 rounded-2xl">
            <Loader2 className="animate-spin text-blue-600" size={40} />
            <p className="text-gray-700 font-medium text-lg">
              {pageLoading ? 'Loading page...' : 'Processing alerts...'}
            </p>
            {!pageLoading && <p className="text-gray-500 text-sm">Please wait, do not close this window</p>}
          </div>
        )}

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="p-3 sm:p-6 border-b border-gray-200 bg-gradient-to-r from-red-50 to-orange-50 flex-shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-2 sm:mb-4 gap-2">
            <div className="flex items-center gap-3">
              <Bell className="text-red-600" size={24} />
              <div>
                <h3 className="text-2xl font-bold text-gray-900">Alert Management</h3>
                <p className="text-sm text-gray-600 mt-1">
                  {alertsTotalElements === 0
                    ? 'No alerts at the moment'
                    : `${alertsTotalElements} total · page ${alertsCurrentPage + 1} of ${alertsTotalPages}`}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handleDownloadAndClear}
                disabled={bulkLoading || resolvedCount === 0}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Download size={18} /> Download & Clear Resolved
              </button>
              {activeCount > 0 && (
                <button
                  onClick={handleResolveAll}
                  disabled={bulkLoading}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <CheckCheck size={18} /> Resolve All
                </button>
              )}
              <button
                onClick={() => setShowNotifications(false)}
                disabled={bulkLoading}
                className="p-2 hover:bg-gray-200 rounded-full transition-colors disabled:opacity-50"
              >
                <X size={24} />
              </button>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-col gap-2 mt-2">
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                placeholder="Search by title, message, product…"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white"
              />
              <select
                value={filterSeverity}
                onChange={e => setFilterSeverity(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
              >
                <option value="all">All Severities</option>
                <option value="CRITICAL">Critical</option>
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
              </select>
              <select
                value={filterType}
                onChange={e => setFilterType(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
              >
                <option value="all">All Types</option>
                <option value="LOW_STOCK">Low Stock</option>
                <option value="PENDING_SALE">Pending Sale</option>
                <option value="REPLENISHMENT_NEEDED">Replenishment</option>
                <option value="UNDERPERFORMING_BRANCH">Underperforming Branch</option>
                <option value="UNDERPERFORMING_PRODUCT">Underperforming Product</option>
                <option value="UNSOLD_PRODUCT">Unsold Product</option>
                <option value="HIGH_VALUE_PENDING">High Value Pending</option>
                <option value="TOP_COMPANY_INACTIVE">Company Inactive</option>
                <option value="LOW_SALES">Low Sales</option>
              </select>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 items-center">
              <select
                value={filterBranch}
                onChange={e => setFilterBranch(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
              >
                <option value="all">All Branches</option>
                {branchOptions.map(([id, name]) => (
                  <option key={id} value={String(id)}>{name}</option>
                ))}
              </select>

              <select
                value={filterCompany}
                onChange={e => setFilterCompany(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
              >
                <option value="all">All Companies</option>
                {companyOptions.map(name => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>

              {activeFilterCount > 0 && (
                <button
                  onClick={clearAllFilters}
                  className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm transition-colors whitespace-nowrap border border-gray-300"
                >
                  <XCircle size={15} />
                  Clear filters
                  <span className="ml-0.5 bg-blue-600 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold">
                    {activeFilterCount}
                  </span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── Tabs ───────────────────────────────────────────────────────── */}
        <div className="flex border-b border-gray-200 bg-gray-50 flex-shrink-0">
          <button
            className={`px-6 py-3 font-medium text-sm transition-colors ${activeTab === 'active' ? 'bg-white border-t border-l border-r border-gray-200 text-blue-600' : 'text-gray-600 hover:text-gray-900'}`}
            onClick={() => handleTabChange('active')}
          >
            Active Alerts
          </button>
          <button
            className={`px-6 py-3 font-medium text-sm transition-colors ${activeTab === 'resolved' ? 'bg-white border-t border-l border-r border-gray-200 text-green-600' : 'text-gray-600 hover:text-gray-900'}`}
            onClick={() => handleTabChange('resolved')}
          >
            Resolved
          </button>
        </div>

        {/* ── Alert list ─────────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto">
          {alerts.length === 0 ? (
            <div className="p-6 space-y-4 animate-pulse">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex gap-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
                  <div className="w-12 h-12 bg-gray-200 rounded-xl flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-1/3" />
                    <div className="h-3 bg-gray-100 rounded w-2/3" />
                    <div className="h-3 bg-gray-100 rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredAlerts.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center p-8">
              {activeFilterCount > 0 ? (
                <>
                  <Filter className="text-gray-400 mb-4" size={80} />
                  <p className="text-2xl font-semibold text-gray-700">No alerts match your filters</p>
                  <p className="text-gray-500 text-lg mt-2">Try adjusting or clearing your filters</p>
                  <button onClick={clearAllFilters} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                    Clear all filters
                  </button>
                </>
              ) : activeTab === 'active' ? (
                <>
                  <CheckCircle className="text-green-500 mb-4" size={80} />
                  <p className="text-2xl font-semibold text-gray-700">No Active Alerts on This Page</p>
                  <p className="text-gray-500 text-lg mt-2">All alerts on this page are resolved</p>
                </>
              ) : (
                <>
                  <Database className="text-blue-500 mb-4" size={80} />
                  <p className="text-2xl font-semibold text-gray-700">No Resolved Alerts on This Page</p>
                  <p className="text-gray-500 text-lg mt-2">No resolved alerts on this page</p>
                </>
              )}
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filteredAlerts.map((alertItem, index) => (
                <AlertRow
                  key={alertItem.id ?? index}
                  alertItem={alertItem}
                  index={alertsCurrentPage * PAGE_SIZE + index}
                  isThisResolving={loadingAlertIds.has(alertItem.id)}
                  bulkLoading={bulkLoading}
                  onResolve={handleResolveOne}
                />
              ))}
            </div>
          )}
        </div>

        {/* ── Pagination ─────────────────────────────────────────────────── */}
        {alertsTotalPages > 1 && (
          <div className="px-4 py-3 border-t border-gray-200 bg-gray-50 flex-shrink-0 flex items-center justify-between gap-2">
            <span className="text-xs text-gray-500 whitespace-nowrap">
              {alertsCurrentPage * PAGE_SIZE + 1}–{Math.min((alertsCurrentPage + 1) * PAGE_SIZE, alertsTotalElements)} of {alertsTotalElements}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => goToPage(alertsCurrentPage - 1)}
                disabled={alertsCurrentPage === 0 || pageLoading}
                className="p-1.5 rounded-lg hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft size={16} />
              </button>
              {pageButtons.map((item, i) =>
                item === '...'
                  ? <span key={`ellipsis-${i}`} className="px-1 text-gray-400 text-sm">…</span>
                  : (
                    <button
                      key={item}
                      onClick={() => goToPage(item)}
                      disabled={pageLoading}
                      className={`min-w-[32px] h-8 px-2 rounded-lg text-sm font-medium transition-colors disabled:cursor-not-allowed
                        ${item === alertsCurrentPage ? 'bg-blue-600 text-white' : 'hover:bg-gray-200 text-gray-700'}`}
                    >
                      {item + 1}
                    </button>
                  )
              )}
              <button
                onClick={() => goToPage(alertsCurrentPage + 1)}
                disabled={alertsCurrentPage >= alertsTotalPages - 1 || pageLoading}
                className="p-1.5 rounded-lg hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* ── Footer ─────────────────────────────────────────────────────── */}
        <div className="p-4 border-t border-gray-200 bg-gray-50 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              {alertsTotalElements === 0 ? 'No alerts in the system' : `${alertsTotalElements} total alerts`}
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => loadAlerts(alertsCurrentPage)}
                disabled={bulkLoading}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm disabled:opacity-50"
              >
                <RefreshCw size={16} /> Refresh
              </button>
              <button
                onClick={handleDeleteAllResolved}
                disabled={bulkLoading}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Trash2 size={16} /> Delete All Resolved
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default AlertManagement;