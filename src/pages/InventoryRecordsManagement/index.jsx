// src/pages/InventoryRecordsManagement/index.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Check, X, AlertTriangle, Package, ShoppingCart } from 'lucide-react';
import LoadingOverlay from '../../components/common/LoadingOverlay';
import InventoryFilters from '../../components/filters/InventoryFilters';
import InventoryTable from '../../components/tables/InventoryTable';
import InventoryFormModal from '../../components/modals/InventoryFormModal';
import InventoryViewModal from '../../components/modals/InventoryViewModal';
import Pagination from '../../components/common/Pagination';
import useInventory from '../../hooks/data/useInventory';
import usePagination from '../../hooks/ui/usePagination';
import { getCurrentUser, isAdmin } from '../../utils/authUtils';
import { api } from '../../services/api';
import VariationSearchableDropdown from '../../components/common/VariationSearchableDropdown';


// ─── Fixed Delete Error Modal with Collapsible Product Cards ─────────────────────
const DeleteErrorModal = ({ message, onClose }) => {
  if (!message) return null;

  const lines = message.split('\n');
  const [expandedProducts, setExpandedProducts] = useState({});

  const productMap = {};
  let inDeliveries = false;
  let inSales = false;
  let currentKey = null;

  lines.forEach(line => {
    if (line.includes('USED IN DELIVERIES')) { inDeliveries = true; inSales = false; return; }
    if (line.includes('USED IN SALES')) { inSales = true; inDeliveries = false; return; }

    if (inDeliveries || inSales) {
      if (line.trim().startsWith('•')) {
        currentKey = line.trim().replace('•', '').trim();
        if (!productMap[currentKey]) productMap[currentKey] = { deliveryReceipts: [], saleRefs: [] };
      } else if (line.trim().startsWith('-') && currentKey) {
        const val = line.trim().replace(/^-\s*/, '').trim();
        if (inDeliveries) productMap[currentKey].deliveryReceipts.push(val);
        if (inSales) productMap[currentKey].saleRefs.push(val);
      }
    }
  });

  const products = Object.entries(productMap);
  const hasStructuredData = products.length > 0;

  const toggleProduct = (productIndex) => {
    setExpandedProducts(prev => ({ ...prev, [productIndex]: !prev[productIndex] }));
  };

  const expandAll = () => {
    const allExpanded = {};
    products.forEach((_, index) => { allExpanded[index] = true; });
    setExpandedProducts(allExpanded);
  };

  const collapseAll = () => { setExpandedProducts({}); };

  const parseRef = (raw) => {
    const parenMatch = raw.match(/^(.+?)\s*\(([^)]+)\)\s*$/);
    if (!parenMatch) return { label: raw, qty: null, status: null, from: null, to: null, branch: null, company: null };

    const label = parenMatch[1].trim();
    const inside = parenMatch[2];

    const fields = {};
    inside.split('|').forEach(part => {
      const idx = part.indexOf(':');
      if (idx !== -1) {
        fields[part.slice(0, idx).trim()] = part.slice(idx + 1).trim();
      }
    });

    return {
      label,
      qty: fields.qty ? parseInt(fields.qty, 10) : null,
      status: fields.status || null,
      from: fields.from || null,
      to: fields.to || null,
      branch: fields.branch || null,
      company: fields.company || null,
    };
  };

  const getStatusMeta = (status) => {
    switch (status) {
      case 'DELIVERED': return { bg: 'bg-green-500/90', text: 'text-white', border: 'border-green-400', icon: '✅', label: 'Delivered' };
      case 'IN_TRANSIT': return { bg: 'bg-yellow-400/90', text: 'text-yellow-900', border: 'border-yellow-300', icon: '🚚', label: 'In Transit' };
      case 'PREPARING': return { bg: 'bg-blue-400/90', text: 'text-white', border: 'border-blue-300', icon: '📋', label: 'Preparing' };
      case 'PENDING': return { bg: 'bg-gray-400/90', text: 'text-white', border: 'border-gray-300', icon: '⏳', label: 'Pending' };
      default: return { bg: 'bg-gray-300/90', text: 'text-gray-800', border: 'border-gray-200', icon: '📦', label: status || 'Unknown' };
    }
  };

  const getConflictMeta = (hasDelivery, hasSale) => {
    if (hasDelivery && hasSale) return {
      borderColor: 'border-red-400/70', headerBg: 'bg-red-50/80', headerBorder: 'border-b border-red-200/70',
      leftBar: 'bg-red-500/80', titleColor: 'text-red-900', icon: '⚠️', label: 'Delivery + Sale Conflict', labelBg: 'bg-red-100/80 text-red-700',
    };
    if (hasDelivery) return {
      borderColor: 'border-blue-400/70', headerBg: 'bg-blue-50/80', headerBorder: 'border-b border-blue-200/70',
      leftBar: 'bg-blue-500/80', titleColor: 'text-blue-900', icon: '📦', label: 'Delivery Conflict', labelBg: 'bg-blue-100/80 text-blue-700',
    };
    return {
      borderColor: 'border-orange-400/70', headerBg: 'bg-orange-50/80', headerBorder: 'border-b border-orange-200/70',
      leftBar: 'bg-orange-500/80', titleColor: 'text-orange-900', icon: '🛒', label: 'Sale Conflict', labelBg: 'bg-orange-100/80 text-orange-700',
    };
  };

  const totalDeliveries = products.reduce((s, [, v]) => s + v.deliveryReceipts.length, 0);
  const totalSales = products.reduce((s, [, v]) => s + v.saleRefs.length, 0);
  const totalDeliveryQty = products.reduce((s, [, v]) => s + v.deliveryReceipts.reduce((a, dr) => a + (parseRef(dr).qty ?? 0), 0), 0);
  const totalSaleQty = products.reduce((s, [, v]) => s + v.saleRefs.reduce((a, r) => a + (parseRef(r).qty ?? 0), 0), 0);
  const grandTotalQty = totalDeliveryQty + totalSaleQty;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-gradient-to-br from-black/60 via-black/50 to-black/60 backdrop-blur-md" onClick={onClose} />

      <div className="relative w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden rounded-2xl shadow-2xl shadow-black/25">
        <div className="absolute inset-0 bg-white/90 backdrop-blur-xl" />
        <div className="absolute inset-0 bg-gradient-to-br from-white/80 via-white/90 to-white/80" />
        <div className="absolute inset-0 border border-white/30 rounded-2xl pointer-events-none" />
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-500/70 via-amber-500/70 to-orange-500/70" />

        <div className="relative flex flex-col max-h-[90vh]">

          {/* Header */}
          <div className="flex items-center gap-3 px-6 py-5 bg-red-500/10 border-b border-red-200/50 flex-shrink-0 backdrop-blur-sm">
            <div className="flex-shrink-0 w-10 h-10 bg-red-500/20 rounded-full flex items-center justify-center backdrop-blur-sm">
              <AlertTriangle size={20} className="text-red-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-bold text-red-800">Cannot Delete Inventory Record</h2>
              <p className="text-sm text-red-600/80 mt-0.5">Stock has already been consumed by the transactions below</p>
            </div>
            <button onClick={onClose} className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full hover:bg-black/5 text-red-400 hover:text-red-600 transition-colors backdrop-blur-sm">
              <X size={18} />
            </button>
          </div>

          {/* Summary pills + expand/collapse controls */}
          <div className="flex items-center justify-between px-6 py-3 bg-gray-500/5 border-b border-gray-200/50 flex-shrink-0 backdrop-blur-sm">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide mr-1">Conflicts:</span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/70 border border-gray-200/60 rounded-full text-xs font-semibold text-gray-700 shadow-sm backdrop-blur-sm">
                <span className="w-2 h-2 rounded-full bg-gray-400 inline-block" />
                {products.length} product{products.length !== 1 ? 's' : ''}
              </span>
              {totalDeliveries > 0 && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-500/10 border border-blue-200/60 rounded-full text-xs font-semibold text-blue-700 shadow-sm backdrop-blur-sm">
                  <Package size={11} />
                  {totalDeliveries} DR{totalDeliveries !== 1 ? 's' : ''} · {totalDeliveryQty} pcs
                </span>
              )}
              {totalSales > 0 && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-orange-500/10 border border-orange-200/60 rounded-full text-xs font-semibold text-orange-700 shadow-sm backdrop-blur-sm">
                  <ShoppingCart size={11} />
                  {totalSales} sale{totalSales !== 1 ? 's' : ''} · {totalSaleQty} pcs
                </span>
              )}
              {grandTotalQty > 0 && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-500/10 border border-red-300/60 rounded-full text-xs font-bold text-red-700 shadow-sm backdrop-blur-sm">
                  Total blocked: {grandTotalQty} pcs
                </span>
              )}
            </div>
            {products.length > 0 && (
              <div className="flex items-center gap-2 ml-4">
                <button onClick={expandAll} className="px-3 py-1 text-xs font-medium text-gray-600 bg-white/70 border border-gray-200/60 rounded-full hover:bg-white/90 transition-colors backdrop-blur-sm flex items-center gap-1">
                  <span>▼</span> Expand All
                </button>
                <button onClick={collapseAll} className="px-3 py-1 text-xs font-medium text-gray-600 bg-white/70 border border-gray-200/60 rounded-full hover:bg-white/90 transition-colors backdrop-blur-sm flex items-center gap-1">
                  <span>▶</span> Collapse All
                </button>
              </div>
            )}
          </div>

          {/* Scrollable product cards */}
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 scrollbar-thin scrollbar-thumb-gray-300/50 scrollbar-track-transparent hover:scrollbar-thumb-gray-400/70">
            {hasStructuredData ? (
              <>
                {products.map(([productName, { deliveryReceipts, saleRefs }], i) => {
                  const meta = getConflictMeta(deliveryReceipts.length > 0, saleRefs.length > 0);
                  const productDrQty = deliveryReceipts.reduce((a, dr) => a + (parseRef(dr).qty ?? 0), 0);
                  const productSaleQty = saleRefs.reduce((a, r) => a + (parseRef(r).qty ?? 0), 0);
                  const productTotalQty = productDrQty + productSaleQty;
                  const isExpanded = expandedProducts[i] || false;

                  return (
                    <div key={i} className={`rounded-xl border-2 ${meta.borderColor} overflow-hidden shadow-sm backdrop-blur-sm bg-white/80 transition-all duration-200`}>
                      <div className={`flex items-center gap-3 px-4 py-3 ${meta.headerBg} ${meta.headerBorder} backdrop-blur-sm cursor-pointer hover:brightness-95 transition-all duration-200`} onClick={() => toggleProduct(i)}>
                        <div className={`w-1 h-8 rounded-full ${meta.leftBar} flex-shrink-0`} />
                        <span className="text-xs font-mono text-gray-500 w-5">{isExpanded ? '▼' : '▶'}</span>
                        <span className="text-base">{meta.icon}</span>
                        <span className={`font-semibold text-sm flex-1 min-w-0 truncate ${meta.titleColor}`}>{productName}</span>
                        <div className="flex items-center gap-2">
                          {deliveryReceipts.length > 0 && (
                            <span className="flex items-center gap-1 text-xs bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-200/60">
                              <Package size={10} className="text-blue-600" />
                              <span className="text-blue-700">{deliveryReceipts.length}</span>
                            </span>
                          )}
                          {saleRefs.length > 0 && (
                            <span className="flex items-center gap-1 text-xs bg-orange-500/10 px-2 py-0.5 rounded-full border border-orange-200/60">
                              <ShoppingCart size={10} className="text-orange-600" />
                              <span className="text-orange-700">{saleRefs.length}</span>
                            </span>
                          )}
                        </div>
                        {productTotalQty > 0 && (
                          <span className="flex-shrink-0 text-xs font-bold px-2.5 py-1 rounded-full bg-white/80 border border-gray-300/60 text-gray-700 mr-1 backdrop-blur-sm">{productTotalQty} pcs</span>
                        )}
                        <span className={`flex-shrink-0 text-xs font-bold px-2.5 py-1 rounded-full ${meta.labelBg} backdrop-blur-sm`}>{meta.label}</span>
                      </div>

                      <div className={isExpanded ? 'block' : 'hidden'}>
                        <div className="px-4 py-3 bg-white/60 backdrop-blur-sm space-y-4">

                          {deliveryReceipts.length > 0 && (
                            <div>
                              <div className="flex items-center gap-1.5 mb-3">
                                <Package size={12} className="text-blue-500/90 flex-shrink-0" />
                                <span className="text-xs font-semibold text-blue-600 uppercase tracking-wide">
                                  Delivery Receipt{deliveryReceipts.length !== 1 ? 's' : ''}
                                </span>
                                <span className="ml-auto flex items-center gap-1.5">
                                  <span className="bg-blue-500/10 border border-blue-200/60 text-blue-600 text-xs font-semibold px-2 py-0.5 rounded-full backdrop-blur-sm">{productDrQty} pcs</span>
                                  <span className="bg-blue-500/20 text-blue-700 text-xs font-bold px-2 py-0.5 rounded-full backdrop-blur-sm">{deliveryReceipts.length} DR{deliveryReceipts.length !== 1 ? 's' : ''}</span>
                                </span>
                              </div>

                              <div className="grid grid-cols-2 gap-3">
                                {deliveryReceipts.map((dr, j) => {
                                  const { label, qty, status, from, to } = parseRef(dr);
                                  const sm = status ? getStatusMeta(status) : null;
                                  return (
                                    <div key={j} className="flex flex-col bg-white/70 backdrop-blur-sm rounded-lg border border-blue-200/60 shadow-sm overflow-visible">
                                      <div className="flex w-full min-h-[2rem]">
                                        <div className="flex-shrink-0 px-2 py-1.5 bg-blue-500/10 border-r border-blue-200/60" style={{ minWidth: '8rem', maxWidth: '14rem', overflowX: 'auto' }}>
                                          <span className="block text-xs font-mono font-medium text-blue-800 whitespace-nowrap">{label}</span>
                                        </div>
                                        {qty !== null && (
                                          <div className="w-16 flex-shrink-0 px-2 py-1.5 bg-blue-500/80 border-r border-blue-300/60 flex items-center justify-center">
                                            <span className="text-xs font-bold text-white text-center whitespace-nowrap">{qty} pcs</span>
                                          </div>
                                        )}
                                        {sm ? (
                                          <div className={`flex-1 min-w-0 px-2 py-1.5 ${sm.bg} flex items-center justify-center gap-1 backdrop-blur-sm`}>
                                            <span>{sm.icon}</span>
                                            <span className={`text-xs font-bold ${sm.text} whitespace-nowrap`}>{sm.label}</span>
                                          </div>
                                        ) : (
                                          <div className="flex-1 px-2 py-1.5 bg-gray-100/50" />
                                        )}
                                      </div>
                                      {(from || to) ? (
                                        <div className="flex items-center justify-between px-2 py-1.5 bg-gray-500/5 border-t border-blue-100/60 text-[10px] backdrop-blur-sm gap-1">
                                          <div className="flex items-center gap-1 min-w-0 flex-1">
                                            <span className="text-blue-400/90 flex-shrink-0">🏭</span>
                                            <span className="font-medium text-blue-700/90 break-words leading-tight" title={from || ''}>{from || 'Unknown'}</span>
                                          </div>
                                          <span className="text-gray-400/70 flex-shrink-0 mx-1">→</span>
                                          <div className="flex items-center gap-1 min-w-0 flex-1 justify-end">
                                            <span className="font-medium text-green-700/90 break-words leading-tight text-right" title={to || ''}>{to || 'Unknown'}</span>
                                            <span className="text-green-400/90 flex-shrink-0">🏪</span>
                                          </div>
                                        </div>
                                      ) : (
                                        <div className="h-[34px] bg-white/30 border-t border-blue-100/60" />
                                      )}
                                    </div>
                                  );
                                })}
                              </div>

                              {[...new Set(deliveryReceipts.map(dr => parseRef(dr).status).filter(Boolean))].length > 1 && (
                                <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 pt-2 border-t border-gray-200/50">
                                  <span className="text-xs text-gray-400 mr-1">Status:</span>
                                  {['DELIVERED', 'IN_TRANSIT', 'PREPARING', 'PENDING']
                                    .filter(s => deliveryReceipts.some(dr => parseRef(dr).status === s))
                                    .map(s => {
                                      const sm = getStatusMeta(s);
                                      return (
                                        <span key={s} className="inline-flex items-center gap-1 text-xs text-gray-500">
                                          <span className={`w-2 h-2 rounded-full inline-block ${sm.bg.replace('/90', '')}`} />
                                          {sm.icon} {sm.label}
                                        </span>
                                      );
                                    })
                                  }
                                </div>
                              )}
                            </div>
                          )}

                          {saleRefs.length > 0 && (
                            <div>
                              <div className="flex items-center gap-1.5 mb-3">
                                <ShoppingCart size={12} className="text-orange-500/90 flex-shrink-0" />
                                <span className="text-xs font-semibold text-orange-600 uppercase tracking-wide">
                                  Sale Reference{saleRefs.length !== 1 ? 's' : ''}
                                </span>
                                <span className="ml-auto flex items-center gap-1.5">
                                  <span className="bg-orange-500/10 border border-orange-200/60 text-orange-600 text-xs font-semibold px-2 py-0.5 rounded-full backdrop-blur-sm">{productSaleQty} pcs</span>
                                  <span className="bg-orange-500/20 text-orange-700 text-xs font-bold px-2 py-0.5 rounded-full backdrop-blur-sm">{saleRefs.length} sale{saleRefs.length !== 1 ? 's' : ''}</span>
                                </span>
                              </div>

                              <div className="grid grid-cols-2 gap-3">
                                {saleRefs.map((ref, j) => {
                                  const { label, qty, status, branch, company } = parseRef(ref);
                                  return (
                                    <div key={j} className="flex flex-col bg-white/70 backdrop-blur-sm rounded-lg border border-orange-200/60 shadow-sm overflow-visible">
                                      <div className="flex w-full min-h-[2rem]">
                                        <div className="flex-shrink-0 px-2 py-1.5 bg-orange-500/10 border-r border-orange-200/60" style={{ minWidth: '8rem', maxWidth: '14rem', overflowX: 'auto' }}>
                                          <span className="block text-xs font-mono font-medium text-orange-800 whitespace-nowrap">{label}</span>
                                        </div>
                                        {qty !== null && (
                                          <div className="w-16 flex-shrink-0 px-2 py-1.5 bg-orange-500/80 border-r border-orange-300/60 flex items-center justify-center">
                                            <span className="text-xs font-bold text-white text-center whitespace-nowrap">{qty} pcs</span>
                                          </div>
                                        )}
                                        {status ? (
                                          <div className={`flex-1 min-w-0 px-2 py-1.5 ${status === 'INVOICED' ? 'bg-purple-500/80' : 'bg-yellow-400/80'} flex items-center justify-center gap-1 backdrop-blur-sm`}>
                                            <span className="text-xs font-bold text-white whitespace-nowrap">
                                              {status === 'INVOICED' ? '🧾 Invoiced' : '✅ Confirmed'}
                                            </span>
                                          </div>
                                        ) : (
                                          <div className="flex-1 px-2 py-1.5 bg-gray-100/50" />
                                        )}
                                      </div>
                                      {(branch || company) ? (
                                        <div className="flex items-center justify-between px-2 py-1.5 bg-gray-500/5 border-t border-orange-100/60 text-[10px] backdrop-blur-sm gap-1">
                                          {branch && (
                                            <div className="flex items-center gap-1 min-w-0 flex-1">
                                              <span className="text-orange-400/90 flex-shrink-0">🏪</span>
                                              <span className="font-medium text-orange-700/90 break-words leading-tight" title={branch}>{branch}</span>
                                            </div>
                                          )}
                                          {branch && company && <span className="text-gray-300/70 flex-shrink-0 mx-1">·</span>}
                                          {company && (
                                            <div className="flex items-center gap-1 min-w-0 flex-1 justify-end">
                                              <span className="font-medium text-gray-600/90 break-words leading-tight text-right" title={company}>{company}</span>
                                              <span className="text-gray-400/90 flex-shrink-0">🏢</span>
                                            </div>
                                          )}
                                          {(!branch || !company) && <div className="flex-1" />}
                                        </div>
                                      ) : (
                                        <div className="h-[34px] bg-white/30 border-t border-orange-100/60" />
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}

                <div className="bg-amber-500/10 border border-amber-200/60 rounded-xl p-4 mt-2 backdrop-blur-sm">
                  <p className="text-sm text-amber-800/90 leading-relaxed">
                    <strong>ℹ️ To delete this record,</strong> you must first void or cancel all the delivery receipts and sales listed above, then try again.
                  </p>
                </div>
              </>
            ) : (
              <pre className="whitespace-pre-wrap text-sm text-gray-700 font-mono bg-white/50 backdrop-blur-sm rounded-xl p-4 border border-gray-200/60 leading-relaxed">
                {message}
              </pre>
            )}
          </div>

          <div className="flex-shrink-0 px-6 py-4 bg-gray-500/5 border-t border-gray-200/50 backdrop-blur-sm">
            <button onClick={onClose} className="w-full py-2.5 px-4 bg-gray-800/90 hover:bg-gray-900 text-white font-medium rounded-xl transition-colors text-sm backdrop-blur-sm">
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Toast Notification ───────────────────────────────────────────────────────
const Toast = ({ toasts, removeToast }) => (
  <div className="fixed top-5 right-5 z-[99999] flex flex-col gap-2 pointer-events-none">
    {toasts.map(({ id, message, type }) => (
      <div
        key={id}
        className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border text-sm font-medium pointer-events-auto transition-all duration-300
          ${type === 'error' ? 'bg-red-50 border-red-200 text-red-800'
            : type === 'warning' ? 'bg-amber-50 border-amber-200 text-amber-800'
              : 'bg-green-50 border-green-200 text-green-800'}`}
      >
        <span className="text-base">
          {type === 'error' ? '❌' : type === 'warning' ? '⚠️' : '✅'}
        </span>
        <span className="flex-1">{message}</span>
        <button onClick={() => removeToast(id)} className="ml-2 opacity-50 hover:opacity-100 transition-opacity text-lg leading-none">×</button>
      </div>
    ))}
  </div>
);

// ─── Main Component ────────────────────────────────────────────────────────

const InventoryRecordsManagement = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [fromWarehouseFilter, setFromWarehouseFilter] = useState('');
  const [fromBranchFilter, setFromBranchFilter] = useState('');
  const [toWarehouseFilter, setToWarehouseFilter] = useState('');
  const [toBranchFilter, setToBranchFilter] = useState('');
  const [startDateFilter, setStartDateFilter] = useState('');
  const [endDateFilter, setEndDateFilter] = useState('');

  // ── Product filter state — must be declared before filteredInventories ──
  const [productFilter, setProductFilter] = useState({ productId: '', variationId: '', productName: '' });

  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('create');
  const [selectedInventory, setSelectedInventory] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [deleteErrorMessage, setDeleteErrorMessage] = useState(null);
  const [toasts, setToasts] = useState([]);

  const showToast = (message, type = 'error', duration = 4500) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), duration);
  };

  const removeToast = (id) => setToasts(prev => prev.filter(t => t.id !== id));

  const [products, setProducts] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [branches, setBranches] = useState([]);

  const [selectedProductForAdd, setSelectedProductForAdd] = useState('');
  const [tempQuantity, setTempQuantity] = useState(1);

  const [formData, setFormData] = useState({
    inventoryType: 'STOCK_IN',
    fromWarehouseId: '',
    toWarehouseId: '',
    fromBranchId: '',
    toBranchId: '',
    dateProcessed: new Date().toISOString().split('T')[0],
    processedBy: getCurrentUser(),
    remarks: '',
    status: 'PENDING',
    confirmedBy: '',
    items: []
  });

  const {
    inventories, loading, canModifyStatus, warehouseStocks, branchStocks, loadingStocks,
    loadData, loadLocationStock, checkCanModify, confirmInventory, deleteInventory,
    updateInventory, createInventory, setWarehouseStocks, setBranchStocks
  } = useInventory();

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setActionLoading(true);
        setLoadingMessage('Loading data...');
        const [productsRes, warehousesRes, branchesRes] = await Promise.all([
          api.get('/products'), api.get('/warehouse'), api.get('/branches')
        ]);
        setProducts(productsRes.success ? productsRes.data || [] : []);
        setWarehouses(warehousesRes.success ? warehousesRes.data || [] : []);
        setBranches(branchesRes.success ? branchesRes.data || [] : []);
        await loadData(0, 50);
      } catch (error) {
        console.error('Failed to load initial data', error);
        alert('Failed to load data: ' + error.message);
      } finally {
        setActionLoading(false);
        setLoadingMessage('');
      }
    };
    loadInitialData();
  }, [loadData]);

  const productOptions = useMemo(() => {
    return products.flatMap(p => {
      if (p.variations && p.variations.length > 0) {
        return p.variations.map(v => ({
          id: `${p.id}_${v.id}`,
          parentProductId: p.id,
          variationId: v.id,
          originalProductId: p.id,
          originalVariationId: v.id,
          name: p.productName,
          subLabel: v.combinationDisplay || 'Variation',
          fullName: p.productName,
          upc: v.upc || p.upc || 'No UPC',
          sku: v.sku || p.sku || 'No SKU',
          price: v.price || p.price,
          isVariation: true
        }));
      } else {
        return [{
          id: `prod_${p.id}`,
          parentProductId: p.id,
          variationId: null,
          originalProductId: p.id,
          originalVariationId: null,
          name: p.productName,
          subLabel: 'No variations',
          fullName: p.productName,
          upc: p.upc || 'No UPC',
          sku: p.sku || 'No SKU',
          price: p.price,
          isVariation: false
        }];
      }
    });
  }, [products]);

  const filteredInventories = (Array.isArray(inventories) ? inventories : []).filter(inventory => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = inventory.processedBy?.toLowerCase().includes(searchLower) || inventory.remarks?.toLowerCase().includes(searchLower);
    const matchesStatus = statusFilter === 'ALL' || inventory.status === statusFilter;
    const matchesType = typeFilter === 'ALL' || inventory.inventoryType === typeFilter;
    const matchesFromWarehouse = !fromWarehouseFilter || inventory.fromWarehouse?.id === parseInt(fromWarehouseFilter);
    const matchesToWarehouse = !toWarehouseFilter || inventory.toWarehouse?.id === parseInt(toWarehouseFilter);
    const matchesFromBranch = !fromBranchFilter || inventory.fromBranch?.id === parseInt(fromBranchFilter);
    const matchesToBranch = !toBranchFilter || inventory.toBranch?.id === parseInt(toBranchFilter);
    const inventoryDate = new Date(inventory.dateProcessed);
    const matchesStartDate = !startDateFilter || inventoryDate >= new Date(startDateFilter);
    const matchesEndDate = !endDateFilter || inventoryDate <= new Date(endDateFilter + 'T23:59:59');
    const matchesProduct = !productFilter.productId || inventory.items?.some(item => {
      const productMatch = item.product?.id === productFilter.productId;
      if (!productMatch) return false;
      if (productFilter.variationId) return item.variationId === productFilter.variationId;
      return true;
    });

    return matchesSearch && matchesStatus && matchesType && matchesFromWarehouse && matchesToWarehouse
      && matchesFromBranch && matchesToBranch && matchesStartDate && matchesEndDate && matchesProduct;
  });

  const sortedInventories = [...filteredInventories].sort((a, b) => {
    const isAConfirmed = a.status === 'CONFIRMED' ? 1 : 0;
    const isBConfirmed = b.status === 'CONFIRMED' ? 1 : 0;
    if (isAConfirmed !== isBConfirmed) return isAConfirmed - isBConfirmed;
    return 0;
  });

  const { currentPage, setCurrentPage, currentItems: currentInventories, totalPages, indexOfFirstItem, indexOfLastItem, nextPage, prevPage } = usePagination(sortedInventories, 10);

  const handleOpenModal = async (mode, inventory = null) => {
    setModalMode(mode);
    if (mode === 'create') {
      setSelectedInventory(null);
      setFormData({
        inventoryType: 'STOCK_IN', fromWarehouseId: '', toWarehouseId: '', fromBranchId: '', toBranchId: '',
        dateProcessed: new Date().toISOString().split('T')[0], processedBy: getCurrentUser(),
        remarks: '', status: 'PENDING', confirmedBy: '', items: []
      });
      setWarehouseStocks({});
      setBranchStocks({});
      setShowModal(true);
    } else if (mode === 'edit' && inventory) {
      if (inventory.status === 'CONFIRMED') {
        alert('⚠️ CONFIRMED INVENTORY CANNOT BE EDITED\n\nOnce an inventory is confirmed, it cannot be edited.\n\nStock changes have been applied to the system.\n\nIf you need to make changes:\n1. Delete this record (admin only, if stock hasn\'t been used)\n2. Create a new inventory record with the correct information\n\nContact your administrator for assistance.');
        return;
      }
      try {
        setActionLoading(true);
        setLoadingMessage('Loading inventory details...');
        const fullInventoryRes = await api.get(`/inventories/${inventory.id}`);
        if (!fullInventoryRes.success) throw new Error(fullInventoryRes.error || 'Failed to load inventory');
        const fullInventory = fullInventoryRes.data;
        setSelectedInventory(fullInventory);
        setFormData({
          inventoryType: fullInventory.inventoryType,
          fromWarehouseId: fullInventory.fromWarehouse?.id || '',
          toWarehouseId: fullInventory.toWarehouse?.id || '',
          fromBranchId: fullInventory.fromBranch?.id || '',
          toBranchId: fullInventory.toBranch?.id || '',
          dateProcessed: fullInventory.dateProcessed,
          processedBy: fullInventory.processedBy,
          remarks: fullInventory.remarks || '',
          status: 'PENDING',
          confirmedBy: fullInventory.confirmedBy || '',
          items: fullInventory.items.map(item => ({ productId: item.product.id, variationId: item.variationId || null, quantity: item.quantity }))
        });
        setWarehouseStocks({});
        setBranchStocks({});
        for (let i = 0; i < fullInventory.items.length; i++) {
          const item = fullInventory.items[i];
          if (item.product?.id) {
            const locationType = fullInventory.fromWarehouse ? 'warehouse' : fullInventory.fromBranch ? 'branch' : fullInventory.toWarehouse ? 'warehouse' : 'branch';
            const locationId = fullInventory.fromWarehouse?.id || fullInventory.fromBranch?.id || fullInventory.toWarehouse?.id || fullInventory.toBranch?.id;
            if (locationId && locationType) await loadLocationStock(item.product.id, item.variationId || null, i, locationId, locationType);
          }
        }
        setActionLoading(false);
        setLoadingMessage('');
        setShowModal(true);
      } catch (error) {
        console.error('Failed to load inventory details');
        alert('Failed to load inventory details: ' + error.message);
        setActionLoading(false);
        setLoadingMessage('');
      }
    } else if (mode === 'view' && inventory) {
      try {
        setActionLoading(true);
        setLoadingMessage('Loading inventory details...');
        const fullInventoryRes = await api.get(`/inventories/${inventory.id}`);
        if (fullInventoryRes.success) setSelectedInventory(fullInventoryRes.data);
        setActionLoading(false);
        setLoadingMessage('');
        setShowModal(true);
      } catch (error) {
        console.error('Failed to load inventory details:', error);
        setActionLoading(false);
        setLoadingMessage('');
      }
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedInventory(null);
    setSelectedProductForAdd('');
    setWarehouseStocks({});
    setBranchStocks({});
  };

  const handleAddProductToTable = () => {
    if (!selectedProductForAdd) { alert('Please select a product first'); return; }
    const selectedOption = productOptions.find(opt => opt.id === selectedProductForAdd);
    if (!selectedOption) { alert('Product not found'); return; }
    const isDuplicate = formData.items.some(item => item.productId === selectedOption.parentProductId && item.variationId === selectedOption.variationId);
    if (isDuplicate) { alert('⚠️ This product variation is already added!\n\nPlease select a different variation or update the quantity of the existing item.'); return; }
    if (formData.inventoryType !== 'STOCK_IN') {
      const hasLocation = formData.fromWarehouseId || formData.fromBranchId || formData.toWarehouseId || formData.toBranchId;
      if (hasLocation) {
        const stockInfo = getItemStockInfo(-1, selectedOption.parentProductId, selectedOption.variationId);
        if (stockInfo) {
          const availableQty = stockInfo.availableQuantity ?? stockInfo.quantity ?? 0;
          if (availableQty === 0) { alert(`❌ Cannot add this product!\n\nProduct: ${selectedOption.fullName}\nAvailable Stock: ${availableQty}\n\nThis product has no available stock at the selected location.\nPlease select a different product or location.`); return; }
        }
      }
    }
    const newItems = [...formData.items, { productId: selectedOption.parentProductId, variationId: selectedOption.variationId, quantity: '' }];
    setFormData({ ...formData, items: newItems });
    const hasLocation = formData.fromWarehouseId || formData.fromBranchId || formData.toWarehouseId || formData.toBranchId;
    if (hasLocation) {
      setTimeout(() => {
        const locationType = formData.fromWarehouseId ? 'warehouse' : formData.fromBranchId ? 'branch' : formData.toWarehouseId ? 'warehouse' : 'branch';
        const locationId = formData.fromWarehouseId || formData.fromBranchId || formData.toWarehouseId || formData.toBranchId;
        loadLocationStock(selectedOption.originalProductId, selectedOption.originalVariationId, newItems.length - 1, locationId, locationType);
      }, 0);
    }
    setSelectedProductForAdd('');
  };

  const handleItemChange = async (index, field, value) => {
    const newItems = [...formData.items];
    if (field === 'productId') {
      const selectedOption = productOptions.find(opt => opt.id === value);
      if (selectedOption) {
        const isDuplicate = formData.items.some((item, idx) => idx !== index && item.productId === selectedOption.parentProductId && item.variationId === selectedOption.variationId);
        if (isDuplicate) { alert('⚠️ This product variation is already added!\n\nPlease select a different variation or update the quantity of the existing item.'); return; }
        newItems[index] = { ...newItems[index], productId: selectedOption.parentProductId, variationId: selectedOption.variationId };
        setFormData({ ...formData, items: newItems });
        const hasLocation = formData.fromWarehouseId || formData.fromBranchId || formData.toWarehouseId || formData.toBranchId;
        if (hasLocation) {
          setTimeout(() => {
            const locationType = formData.fromWarehouseId ? 'warehouse' : formData.fromBranchId ? 'branch' : formData.toWarehouseId ? 'warehouse' : 'branch';
            const locationId = formData.fromWarehouseId || formData.fromBranchId || formData.toWarehouseId || formData.toBranchId;
            loadLocationStock(selectedOption.originalProductId, selectedOption.originalVariationId, index, locationId, locationType);
          }, 0);
        }
        return;
      }
    } else if (field === 'quantity') {
      const newQuantity = value === '' ? '' : parseInt(value) || 1;
      if (newQuantity !== '' && formData.inventoryType !== 'STOCK_IN') {
        const item = newItems[index];
        const stockInfo = getItemStockInfo(index, item.productId, item.variationId);
        if (stockInfo) {
          const availableQty = stockInfo.availableQuantity ?? stockInfo.quantity ?? 0;
          if (newQuantity > availableQty) {
            const selectedOption = productOptions.find(opt => opt.originalProductId === item.productId && opt.originalVariationId === item.variationId);
            alert(`❌ Quantity Exceeds Available Stock!\n\nProduct: ${selectedOption?.fullName || 'Unknown'}\nAvailable Stock: ${availableQty}\nRequested Quantity: ${newQuantity}\n\nPlease enter a quantity that does not exceed the available stock.`);
            return;
          }
        }
      }
      newItems[index][field] = newQuantity;
    }
    setFormData({ ...formData, items: newItems });
  };

  const handleRemoveItem = (index) => {
    const newItems = formData.items.filter((_, i) => i !== index);
    setFormData({ ...formData, items: newItems });
    const newWarehouseStocks = { ...warehouseStocks };
    const newBranchStocks = { ...branchStocks };
    Object.keys(warehouseStocks).forEach(key => { if (key.startsWith(`${index}_`)) delete newWarehouseStocks[key]; });
    Object.keys(branchStocks).forEach(key => { if (key.startsWith(`${index}_`)) delete newBranchStocks[key]; });
    setWarehouseStocks(newWarehouseStocks);
    setBranchStocks(newBranchStocks);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.processedBy) { showToast('Please enter the name of the person who processed this.', 'error'); return; }

    const type = formData.inventoryType;
    if (type === 'STOCK_IN') {
      if (!formData.toWarehouseId && !formData.toBranchId) {
        showToast('Please select a destination warehouse or branch before saving.', 'warning'); return;
      }
    } else if (type === 'TRANSFER') {
      if (!formData.fromWarehouseId && !formData.fromBranchId) {
        showToast('Please select a source warehouse or branch for the transfer.', 'warning'); return;
      }
      if (!formData.toWarehouseId && !formData.toBranchId) {
        showToast('Please select a destination warehouse or branch for the transfer.', 'warning'); return;
      }
    } else if (type === 'RETURN') {
      if (!formData.fromBranchId) {
        showToast('Please select the source branch for the return.', 'warning'); return;
      }
      if (!formData.toWarehouseId) {
        showToast('Please select the destination warehouse for the return.', 'warning'); return;
      }
    } else if (type === 'DAMAGE') {
      if (!formData.toWarehouseId && !formData.toBranchId) {
        showToast('Please select a warehouse or branch where the damaged items are located.', 'warning'); return;
      }
    }

    if (formData.items.length === 0) { showToast('Please add at least one item before saving.', 'error'); return; }
    const duplicates = formData.items.filter((item, index) => formData.items.findIndex(i => i.productId === item.productId && i.variationId === item.variationId) !== index);
    if (duplicates.length > 0) { alert('Error: Duplicate items detected!'); return; }
    if (formData.inventoryType !== 'STOCK_IN') {
      const stockErrors = [];
      for (let i = 0; i < formData.items.length; i++) {
        const item = formData.items[i];
        const stockInfo = getItemStockInfo(i, item.productId, item.variationId);
        if (stockInfo) {
          const availableQty = stockInfo.availableQuantity ?? stockInfo.quantity ?? 0;
          if (item.quantity > availableQty) {
            const selectedOption = productOptions.find(opt => opt.originalProductId === item.productId && opt.originalVariationId === item.variationId);
            stockErrors.push({ product: selectedOption?.fullName || `Product ${item.productId}`, requested: item.quantity, available: availableQty });
          }
        }
      }
      if (stockErrors.length > 0) {
        alert('❌ Cannot submit - Stock availability issues:\n\n' + stockErrors.map(err => `• ${err.product}\n  Requested: ${err.requested} | Available: ${err.available}`).join('\n\n') + '\n\nPlease adjust quantities or remove items with insufficient stock.');
        return;
      }
    }
    try {
      setActionLoading(true);
      setLoadingMessage(modalMode === 'create' ? 'Creating inventory record...' : 'Updating inventory record...');
      const payload = { ...formData, status: 'PENDING' };
      if (modalMode === 'create') { await createInventory(payload); alert('Inventory record created successfully as PENDING!'); }
      else { await updateInventory(selectedInventory.id, payload); alert('Inventory record updated successfully!'); }
      handleCloseModal();
      await loadData(0, 50);
      setCurrentPage(1);
    } catch (error) {
      console.error('Failed to save inventory:', error);
      alert('Failed to save inventory: ' + error.message);
    } finally {
      setActionLoading(false);
      setLoadingMessage('');
    }
  };

  const handleConfirmInventory = async (inventory, confirmedByUser = null) => {
    let locationInfo = '';
    if (inventory.inventoryType === 'STOCK_IN') locationInfo = `\n📦 Adding stock to: ${inventory.toWarehouse?.warehouseName || inventory.toBranch?.branchName}`;
    else if (inventory.inventoryType === 'TRANSFER') locationInfo = `\n📦 Transfer from: ${inventory.fromWarehouse?.warehouseName || inventory.fromBranch?.branchName}\n📍 Transfer to: ${inventory.toWarehouse?.warehouseName || inventory.toBranch?.branchName}`;
    else if (inventory.inventoryType === 'RETURN') locationInfo = `\n📦 Return from: ${inventory.fromBranch?.branchName}\n📍 Return to: ${inventory.toWarehouse?.warehouseName}`;
    else if (inventory.inventoryType === 'DAMAGE') locationInfo = `\n📦 Mark damaged at: ${inventory.toWarehouse?.warehouseName || inventory.toBranch?.branchName}`;
    const itemCount = inventory.items?.length || 0;
    const totalQty = inventory.items?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0;
    if (!window.confirm(`Are you sure you want to confirm this ${inventory.inventoryType} record?${locationInfo}\n\n📊 Items: ${itemCount}\n📦 Total Quantity: ${totalQty}\n\n⚠️ This will update stock levels and cannot be undone.`)) return;
    const currentUser = confirmedByUser || getCurrentUser() || 'System';
    try {
      setActionLoading(true);
      setLoadingMessage('Confirming inventory...');
      await confirmInventory(inventory.id, currentUser);
      alert(`✅ Inventory confirmed successfully!\n\n${inventory.inventoryType} record has been processed and stock levels have been updated.`);
      await loadData(0, 50);
    } catch (error) {
      console.error('Failed to confirm inventory:', error);
      const errorMsg = error.response?.data?.error || error.message || 'Unknown error';
      alert(`❌ Failed to confirm inventory:\n\n${errorMsg}\n\nPlease check stock availability and try again.`);
    } finally {
      setActionLoading(false);
      setLoadingMessage('');
    }
  };

  const handleDelete = async (id) => {
    const inventory = inventories.find(inv => inv.id === id);
    const userRole = localStorage.getItem('userRole') || 'USER';
    if (inventory && inventory.status === 'CONFIRMED') {
      if (userRole !== 'ADMIN') { alert('⚠️ PERMISSION DENIED\n\nOnly administrators can delete CONFIRMED inventory records.\n\nPlease contact your system administrator if you need to delete this record.'); return; }
      if (!window.confirm('⚠️ Warning: Deleting CONFIRMED Inventory\n\nThis inventory has been confirmed and stock changes have been applied.\n\nDeleting will:\n• Permanently remove this inventory record\n• Reverse all stock changes that were applied\n• Cannot be undone\n\nAre you absolutely sure you want to delete this record?')) return;
    } else {
      if (!window.confirm('Are you sure you want to delete this inventory record?')) return;
    }
    try {
      setActionLoading(true);
      setLoadingMessage('Deleting inventory record...');
      const result = await deleteInventory(id);
      if (result && result.success === false) { setDeleteErrorMessage(result.error || 'Failed to delete inventory'); return; }
      alert('✅ Inventory deleted successfully');
      await loadData(0, 50);
      if (filteredInventories.length % 10 === 1 && currentPage > 1) setCurrentPage(currentPage - 1);
    } catch (error) {
      console.error('❌ Delete error:', error);
      const errorMsg = error.message || 'Failed to delete inventory';
      if (errorMsg.includes('USED IN DELIVERIES') || errorMsg.includes('USED IN SALES') || errorMsg.includes('Cannot delete') || errorMsg.length > 200) {
        setDeleteErrorMessage(errorMsg);
      } else {
        alert('❌ ' + errorMsg);
      }
    } finally {
      setActionLoading(false);
      setLoadingMessage('');
    }
  };

  const handleInventoryTypeChange = (type) => {
    setFormData(prev => ({
      ...prev, inventoryType: type,
      fromWarehouseId: (type === 'STOCK_IN' || type === 'DAMAGE') ? '' : prev.fromWarehouseId,
      fromBranchId: (type === 'STOCK_IN' || type === 'DAMAGE') ? '' : prev.fromBranchId,
      items: []
    }));
    setWarehouseStocks({});
    setBranchStocks({});
  };

  const handleLocationChange = async (type, val) => {
    const [locationType, locationId] = val ? val.split('|') : [null, null];
    const warehouseId = locationType === 'warehouse' ? (locationId ? parseInt(locationId, 10) : null) : null;
    const branchId = locationType === 'branch' ? (locationId ? parseInt(locationId, 10) : null) : null;
    const newFormData = { ...formData, [`${type}WarehouseId`]: warehouseId, [`${type}BranchId`]: branchId };
    setFormData(newFormData);
    setWarehouseStocks({});
    setBranchStocks({});
    if (newFormData.items.length > 0 && (warehouseId || branchId)) {
      for (let i = 0; i < newFormData.items.length; i++) {
        const item = newFormData.items[i];
        if (item.productId) {
          setTimeout(() => { loadLocationStock(item.productId, item.variationId, i, warehouseId || branchId, warehouseId ? 'warehouse' : 'branch'); }, 100);
        }
      }
    }
  };

  const getItemStockInfo = (itemIndex, productId, variationId) => {
    const createStockKey = (locId) => variationId ? `${itemIndex}_${productId}_${variationId}_${locId}` : `${itemIndex}_${productId}_${locId}`;
    if (formData.fromWarehouseId) return warehouseStocks[createStockKey(formData.fromWarehouseId)];
    if (formData.fromBranchId) return branchStocks[createStockKey(formData.fromBranchId)];
    if (formData.toWarehouseId) return warehouseStocks[createStockKey(formData.toWarehouseId)];
    if (formData.toBranchId) return branchStocks[createStockKey(formData.toBranchId)];
    return null;
  };

  const clearAllFilters = () => {
    setTypeFilter('ALL'); setFromWarehouseFilter(''); setToWarehouseFilter('');
    setFromBranchFilter(''); setToBranchFilter(''); setStartDateFilter('');
    setEndDateFilter(''); setSearchTerm(''); setStatusFilter('ALL');
    setProductFilter({ productId: '', variationId: '', productName: '' });
  };

  // Derive the selected option ID for the dropdown from productFilter state
  const selectedProductFilterOptionId = productFilter.variationId
    ? productOptions.find(o => o.variationId === productFilter.variationId)?.id ?? ''
    : productFilter.productId
      ? productOptions.find(o => !o.variationId && o.parentProductId === productFilter.productId)?.id ?? ''
      : '';

  const handleProductFilterChange = (value) => {
    if (!value) {
      setProductFilter({ productId: '', variationId: '', productName: '' });
      return;
    }
    const option = productOptions.find(o => o.id === value);
    if (option) {
      setProductFilter({
        productId: option.parentProductId,
        variationId: option.variationId ?? '',
        productName: option.subLabel !== 'No variations'
          ? `${option.fullName} — ${option.subLabel}`
          : option.fullName,
      });
      setCurrentPage(1);
    }
  };

  return (
    <>
      <LoadingOverlay show={loading || actionLoading} message={loadingMessage || ''} />
      <DeleteErrorModal message={deleteErrorMessage} onClose={() => setDeleteErrorMessage(null)} />
      <Toast toasts={toasts} removeToast={removeToast} />

      <div className="min-h-screen bg-gray-50 p-6">
        <div className="p-6 max-w-full mx-auto px-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Inventory Records Management</h1>
            <p className="text-gray-600">Track and manage inventory movements</p>
          </div>

          <div className="flex justify-between items-center mb-6">
            <button onClick={() => handleOpenModal('create')} className="flex items-center gap-3 px-8 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm font-medium">
              <Plus size={20} />
              <span>New Inventory Record</span>
            </button>
          </div>

          <InventoryFilters
            searchTerm={searchTerm} setSearchTerm={setSearchTerm}
            statusFilter={statusFilter} setStatusFilter={setStatusFilter}
            typeFilter={typeFilter} setTypeFilter={setTypeFilter}
            fromWarehouseFilter={fromWarehouseFilter} setFromWarehouseFilter={setFromWarehouseFilter}
            toWarehouseFilter={toWarehouseFilter} setToWarehouseFilter={setToWarehouseFilter}
            fromBranchFilter={fromBranchFilter} setFromBranchFilter={setFromBranchFilter}
            toBranchFilter={toBranchFilter} setToBranchFilter={setToBranchFilter}
            startDateFilter={startDateFilter} setStartDateFilter={setStartDateFilter}
            endDateFilter={endDateFilter} setEndDateFilter={setEndDateFilter}
            warehouses={warehouses} branches={branches} onClearFilters={clearAllFilters}
          />

          {/* ── Product Search Filter ── */}
          <div className="bg-white rounded-xl shadow-sm p-4 mb-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-end">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Filter by Product / UPC / SKU
                </label>
                <VariationSearchableDropdown
                  options={productOptions}
                  value={selectedProductFilterOptionId}
                  onChange={handleProductFilterChange}
                  placeholder="Search by product name, UPC, or SKU..."
                  hideLocationHint={true}
                />
                {productFilter.productName && (
                  <p className="text-xs text-blue-600 mt-1">Filtering by: {productFilter.productName}</p>
                )}
              </div>
              {productFilter.productId && (
                <div>
                  <button
                    onClick={() => setProductFilter({ productId: '', variationId: '', productName: '' })}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition"
                  >
                    <X size={14} />
                    Clear Product Filter
                  </button>
                </div>
              )}
            </div>
          </div>

          <InventoryTable
            inventories={currentInventories}
            onView={(inventory) => handleOpenModal('view', inventory)}
            onEdit={(inventory) => handleOpenModal('edit', inventory)}
            onDelete={handleDelete}
            onConfirm={handleConfirmInventory}
            actionLoading={actionLoading}
            canModifyStatus={canModifyStatus}
            indexOfFirstItem={indexOfFirstItem}
            indexOfLastItem={indexOfLastItem}
          />

          {sortedInventories.length > 0 && (
            <Pagination
              currentPage={currentPage} totalPages={totalPages}
              onPageChange={setCurrentPage} onNextPage={nextPage} onPrevPage={prevPage}
              showingStart={indexOfFirstItem + 1} showingEnd={Math.min(indexOfLastItem, sortedInventories.length)}
              totalItems={sortedInventories.length}
            />
          )}

          {showModal && (modalMode === 'create' || modalMode === 'edit') && (
            <InventoryFormModal
              showModal={showModal} modalMode={modalMode} selectedInventory={selectedInventory}
              formData={formData} setFormData={setFormData} products={products}
              warehouses={warehouses} branches={branches} loadingStocks={loadingStocks}
              warehouseStocks={warehouseStocks} branchStocks={branchStocks}
              onClose={handleCloseModal} onSubmit={handleSubmit}
              onAddProduct={handleAddProductToTable} onRemoveItem={handleRemoveItem}
              onItemChange={handleItemChange} onInventoryTypeChange={handleInventoryTypeChange}
              onLocationChange={handleLocationChange} selectedProductForAdd={selectedProductForAdd}
              setSelectedProductForAdd={setSelectedProductForAdd} tempQuantity={tempQuantity}
              setTempQuantity={setTempQuantity} onConfirmInventory={handleConfirmInventory}
            />
          )}

          {showModal && modalMode === 'view' && selectedInventory && (
            <InventoryViewModal selectedInventory={selectedInventory} onClose={handleCloseModal} onConfirm={handleConfirmInventory} />
          )}
        </div>
      </div>
    </>
  );
};

export default InventoryRecordsManagement;