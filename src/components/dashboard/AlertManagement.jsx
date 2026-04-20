import React, { useState, useMemo, useCallback, memo } from 'react';
import { Bell, X, Download, CheckCheck, Trash2, RefreshCw, AlertCircle, AlertTriangle, Info, CheckCircle, Database, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import StatusBadge from '../common/StatusBadge';
import { api } from '../../services/api';

const PAGE_SIZE = 15;

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
    <div
      className={`p-6 transition-colors ${alertConfig.bgColor} border-b ${alertConfig.borderColor} ${isThisResolving ? 'opacity-60' : ''}`}
    >
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

// ── Pagination controls ───────────────────────────────────────────────────────
const Pagination = memo(({ currentPage, totalPages, onPageChange, totalItems, pageSize }) => {
  if (totalPages <= 1) return null;

  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  return (
    <div className="flex items-center justify-between px-6 py-3 bg-gray-50 border-t border-gray-200">
      <span className="text-sm text-gray-500">
        Showing {startItem}–{endItem} of {totalItems} alerts
      </span>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1}
          className="px-2 py-1 text-xs rounded border border-gray-300 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          «
        </button>
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="p-1 rounded border border-gray-300 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <ChevronLeft size={16} />
        </button>

        {/* Page number pills */}
        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
          let page;
          if (totalPages <= 5) {
            page = i + 1;
          } else if (currentPage <= 3) {
            page = i + 1;
          } else if (currentPage >= totalPages - 2) {
            page = totalPages - 4 + i;
          } else {
            page = currentPage - 2 + i;
          }
          return (
            <button
              key={page}
              onClick={() => onPageChange(page)}
              className={`w-8 h-8 text-xs rounded border transition-colors ${
                page === currentPage
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'border-gray-300 hover:bg-gray-100'
              }`}
            >
              {page}
            </button>
          );
        })}

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="p-1 rounded border border-gray-300 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <ChevronRight size={16} />
        </button>
        <button
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage === totalPages}
          className="px-2 py-1 text-xs rounded border border-gray-300 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          »
        </button>
      </div>
    </div>
  );
});

Pagination.displayName = 'Pagination';

// ── Main component ────────────────────────────────────────────────────────────
const AlertManagement = ({ showNotifications, setShowNotifications, alerts, loadAlerts }) => {
  const [activeTab, setActiveTab] = useState('active');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSeverity, setFilterSeverity] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [loadingAlertIds, setLoadingAlertIds] = useState(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  // Reset to page 1 whenever filters/tab change
  const handleTabChange = useCallback((tab) => {
    setActiveTab(tab);
    setCurrentPage(1);
  }, []);

  const handleSearchChange = useCallback((e) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1);
  }, []);

  const handleSeverityChange = useCallback((e) => {
    setFilterSeverity(e.target.value);
    setCurrentPage(1);
  }, []);

  const handleTypeChange = useCallback((e) => {
    setFilterType(e.target.value);
    setCurrentPage(1);
  }, []);

  // 1️⃣  Full filtered list (NOT paginated yet)
  const filteredAlerts = useMemo(() => {
    let filtered = alerts;

    if (activeTab === 'active') {
      filtered = filtered.filter(a => !a.isResolved);
    } else if (activeTab === 'resolved') {
      filtered = filtered.filter(a => a.isResolved);
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(a =>
        (a.title && a.title.toLowerCase().includes(q)) ||
        (a.message && a.message.toLowerCase().includes(q)) ||
        (a.branch?.branchName && a.branch.branchName.toLowerCase().includes(q)) ||
        (a.product?.productName && a.product.productName.toLowerCase().includes(q)) ||
        (a.severity && a.severity.toLowerCase().includes(q)) ||
        (a.alertType && a.alertType.toLowerCase().includes(q))
      );
    }

    if (filterSeverity !== 'all') filtered = filtered.filter(a => a.severity === filterSeverity);
    if (filterType !== 'all') filtered = filtered.filter(a => a.alertType === filterType);

    return filtered;
  }, [alerts, activeTab, searchQuery, filterSeverity, filterType]);

  // 2️⃣  Pagination slice — only PAGE_SIZE items go into the DOM
  const totalPages = Math.max(1, Math.ceil(filteredAlerts.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);

  const pageAlerts = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return filteredAlerts.slice(start, start + PAGE_SIZE);
  }, [filteredAlerts, safePage]);

  // Derived counts (computed once from source array)
  const activeCount = useMemo(() => alerts.filter(a => !a.isResolved).length, [alerts]);
  const resolvedCount = useMemo(() => alerts.filter(a => a.isResolved).length, [alerts]);

  // ── Handlers ────────────────────────────────────────────────────────────────
  const handleResolveOne = useCallback(async (alertItem) => {
    setLoadingAlertIds(prev => new Set(prev).add(alertItem.id));
    try {
      const response = await api.put(`/alerts/${alertItem.id}/resolve`, {
        resolvedBy: 'admin',
        notes: 'Resolved manually'
      });
      if (response.success) {
        await loadAlerts();
        showToast('Alert resolved successfully');
      } else {
        showToast('Failed to resolve alert', 'error');
      }
    } catch (err) {
      showToast('Failed to resolve alert: ' + err.message, 'error');
    } finally {
      setLoadingAlertIds(prev => {
        const next = new Set(prev);
        next.delete(alertItem.id);
        return next;
      });
    }
  }, [loadAlerts, showToast]);

  const handleResolveAll = useCallback(async () => {
    if (!window.confirm(`Resolve all ${activeCount} active alerts?`)) return;
    setBulkLoading(true);
    try {
      const response = await api.put('/alerts/resolve-all', {
        resolvedBy: 'admin',
        notes: 'Resolved all via dashboard'
      });
      if (response.success) {
        await loadAlerts();
        showToast(`Resolved ${activeCount} alerts successfully`);
      } else {
        showToast('Failed to resolve all alerts', 'error');
      }
    } catch (err) {
      showToast('Failed to resolve alerts: ' + err.message, 'error');
    } finally {
      setBulkLoading(false);
    }
  }, [activeCount, loadAlerts, showToast]);

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
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        const deleteResponse = await api.delete('/alerts/resolved');
        if (deleteResponse.success) {
          await loadAlerts();
          showToast(`Downloaded and cleared ${deleteResponse.data || 0} resolved alerts`);
        }
      }
    } catch (err) {
      showToast('Failed to process resolved alerts: ' + err.message, 'error');
    } finally {
      setBulkLoading(false);
    }
  }, [loadAlerts, showToast]);

  const handleDeleteAllResolved = useCallback(async () => {
    if (!window.confirm(`Delete all ${resolvedCount} resolved alerts?`)) return;
    setBulkLoading(true);
    try {
      const response = await api.delete('/alerts/resolved');
      if (response.success) {
        await loadAlerts();
        showToast(`Deleted ${resolvedCount} resolved alerts`);
      }
    } catch (err) {
      showToast('Failed to delete resolved alerts: ' + err.message, 'error');
    } finally {
      setBulkLoading(false);
    }
  }, [resolvedCount, loadAlerts, showToast]);

  if (!showNotifications) return null;

  return (
    <>
      {/* Toast */}
      {toast && (
        <div className={`fixed top-6 right-6 z-[9999] flex items-center gap-3 px-5 py-3 rounded-xl shadow-xl text-white text-sm font-medium transition-all
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
      <div className="fixed left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 w-11/12 max-w-6xl h-5/6 bg-white rounded-2xl shadow-2xl z-50 border border-gray-200 overflow-hidden flex flex-col">

        {bulkLoading && (
          <div className="absolute inset-0 bg-white/80 z-10 flex flex-col items-center justify-center gap-3 rounded-2xl">
            <Loader2 className="animate-spin text-blue-600" size={40} />
            <p className="text-gray-700 font-medium text-lg">Processing alerts...</p>
            <p className="text-gray-500 text-sm">Please wait, do not close this window</p>
          </div>
        )}

        {/* Header */}
        <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-red-50 to-orange-50 flex-shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-3">
            <div className="flex items-center gap-3">
              <Bell className="text-red-600" size={24} />
              <div>
                <h3 className="text-2xl font-bold text-gray-900">Alert Management</h3>
                <p className="text-sm text-gray-600 mt-1">
                  {alerts.length === 0
                    ? 'No alerts at the moment'
                    : `${activeCount} active, ${resolvedCount} resolved alerts`}
                </p>
              </div>
              {activeCount > 0 && (
                <span className="bg-red-600 text-white text-sm font-semibold rounded-full px-3 py-1">
                  {activeCount} active
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handleDownloadAndClear}
                disabled={bulkLoading || resolvedCount === 0}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Download size={18} />
                Download & Clear Resolved
              </button>

              {activeCount > 0 && (
                <button
                  onClick={handleResolveAll}
                  disabled={bulkLoading}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <CheckCheck size={18} />
                  Resolve All
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

          {/* Search & Filters */}
          <div className="flex flex-col sm:flex-row gap-2 mt-2">
            <input
              type="text"
              placeholder="Search alerts..."
              value={searchQuery}
              onChange={handleSearchChange}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white"
            />
            <select
              value={filterSeverity}
              onChange={handleSeverityChange}
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
              onChange={handleTypeChange}
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
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 bg-gray-50 flex-shrink-0">
          <button
            className={`px-6 py-3 font-medium text-sm transition-colors ${activeTab === 'active' ? 'bg-white border-t border-l border-r border-gray-200 text-blue-600' : 'text-gray-600 hover:text-gray-900'}`}
            onClick={() => handleTabChange('active')}
          >
            Active Alerts ({activeCount})
          </button>
          <button
            className={`px-6 py-3 font-medium text-sm transition-colors ${activeTab === 'resolved' ? 'bg-white border-t border-l border-r border-gray-200 text-green-600' : 'text-gray-600 hover:text-gray-900'}`}
            onClick={() => handleTabChange('resolved')}
          >
            Resolved ({resolvedCount})
          </button>
        </div>

        {/* Alert list */}
        <div className="flex-1 overflow-y-auto">
          {filteredAlerts.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center p-8">
              {activeTab === 'active' ? (
                <>
                  <CheckCircle className="text-green-500 mb-4" size={80} />
                  <p className="text-2xl font-semibold text-gray-700">No Active Alerts</p>
                  <p className="text-gray-500 text-lg mt-2">All alerts have been addressed</p>
                  {resolvedCount > 0 && (
                    <button onClick={() => handleTabChange('resolved')} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                      View {resolvedCount} Resolved Alerts
                    </button>
                  )}
                </>
              ) : (
                <>
                  <Database className="text-blue-500 mb-4" size={80} />
                  <p className="text-2xl font-semibold text-gray-700">No Resolved Alerts</p>
                  <p className="text-gray-500 text-lg mt-2">No alerts have been resolved yet</p>
                  {activeCount > 0 && (
                    <button onClick={() => handleTabChange('active')} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                      View {activeCount} Active Alerts
                    </button>
                  )}
                </>
              )}
            </div>
          ) : (
            <>
              <div className="px-6 py-3 bg-gray-50 border-b border-gray-200 text-sm text-gray-500">
                Showing {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filteredAlerts.length)} of {filteredAlerts.length} {activeTab === 'active' ? 'active' : 'resolved'} alert{filteredAlerts.length !== 1 ? 's' : ''}
              </div>
              <div className="divide-y divide-gray-100">
                {pageAlerts.map((alertItem, index) => (
                  <AlertRow
                    key={alertItem.id ?? index}
                    alertItem={alertItem}
                    index={(safePage - 1) * PAGE_SIZE + index}
                    isThisResolving={loadingAlertIds.has(alertItem.id)}
                    bulkLoading={bulkLoading}
                    onResolve={handleResolveOne}
                  />
                ))}
              </div>
            </>
          )}
        </div>

        {/* Pagination */}
        <Pagination
          currentPage={safePage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          totalItems={filteredAlerts.length}
          pageSize={PAGE_SIZE}
        />

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 bg-gray-50 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              {alerts.length === 0
                ? 'No alerts in the system'
                : `${activeCount} active, ${resolvedCount} resolved alerts`}
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={loadAlerts}
                disabled={bulkLoading}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm disabled:opacity-50"
              >
                <RefreshCw size={16} />
                Refresh
              </button>
              {resolvedCount > 0 && (
                <button
                  onClick={handleDeleteAllResolved}
                  disabled={bulkLoading}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Trash2 size={16} />
                  Delete All Resolved
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default AlertManagement;