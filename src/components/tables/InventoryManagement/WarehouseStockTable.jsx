import React, { useState, useEffect, useRef } from 'react';
import {
  Building, CheckCircle, Truck, Eye,
  ArrowDownCircle, ArrowUpCircle, ArrowLeftRight,
  AlertTriangle, RotateCcw, SlidersHorizontal, X, Loader2, XCircle,
} from 'lucide-react';
import Pagination from '../../common/Pagination';
import { parseDate } from '../../../utils/dateUtils';
import { api } from '../../../services/api';
import ManualAdjustmentModal from '../../modals/ManualAdjustmentModal';


// ── Column definitions ────────────────────────────────────────────────────────
const MOVEMENT_COLS = [
  {
    key: 'stockIn',
    label: 'Total Stock In',
    icon: <ArrowDownCircle size={13} className="text-blue-600" />,
    bg: 'bg-blue-50/50',
    badge: 'bg-blue-100 text-blue-800',
    badgeIcon: <ArrowDownCircle size={11} />,
    getValue: (mv) => mv?.stockIn ?? 0,
  },
  {
    key: 'transferIn',
    label: 'Transfer In',
    icon: <ArrowLeftRight size={13} className="text-purple-600" />,
    bg: 'bg-purple-50/50',
    badge: 'bg-purple-100 text-purple-800',
    badgeIcon: <ArrowLeftRight size={11} />,
    getValue: (mv) => mv?.transferIn ?? 0,
  },
  {
    key: 'transferOut',
    label: 'Transfer Out',
    icon: <ArrowUpCircle size={13} className="text-indigo-600" />,
    bg: 'bg-indigo-50/50',
    badge: 'bg-indigo-100 text-indigo-800',
    badgeIcon: <ArrowUpCircle size={11} />,
    getValue: (mv) => mv?.transferOut ?? 0,
  },
  {
    key: 'returns',
    label: 'Return',
    icon: <RotateCcw size={13} className="text-green-600" />,
    bg: 'bg-green-50/50',
    badge: 'bg-green-100 text-green-800',
    badgeIcon: <RotateCcw size={11} />,
    getValue: (mv) => mv?.returns ?? 0,
  },
  {
    key: 'damage',
    label: 'Damage',
    icon: <AlertTriangle size={13} className="text-red-500" />,
    bg: 'bg-red-50/50',
    badge: 'bg-red-100 text-red-800',
    badgeIcon: <AlertTriangle size={11} />,
    getValue: (mv) => mv?.damage ?? 0,
  },
  {
    key: 'cancelled',
    label: 'Cancelled Del.',
    icon: <XCircle size={13} className="text-rose-600" />,
    bg: 'bg-rose-50/50',
    badge: 'bg-rose-100 text-rose-800',
    badgeIcon: <XCircle size={11} />,
    getValue: (mv) => mv?.cancelled ?? 0,
  },
  {
    key: 'manualAdjustment',
    label: 'Adj.',
    icon: <SlidersHorizontal size={13} className="text-violet-600" />,
    bg: 'bg-violet-50/50',
    badge: 'bg-violet-100 text-violet-800',
    badgeIcon: <SlidersHorizontal size={11} />,
    getValue: (mv) => mv?.manualAdjustment ?? 0,
    renderCell: (mv) => {
      const net = mv?.manualAdjustment ?? 0;
      if (net === 0) return <span className="text-gray-300 text-xs">—</span>;
      const isAdd = net > 0;
      return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${isAdd ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
          }`}>
          {isAdd ? '+' : ''}{net.toLocaleString()}
        </span>
      );
    },
  },
];

// ── Reusable toggle panel ─────────────────────────────────────────────────────
const ColumnTogglePanel = ({ visible, cols, onChange, onClose }) => {
  const ref = useRef(null);

  useEffect(() => {
    if (!visible) return;
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [visible, onClose]);

  if (!visible) return null;

  return (
    <div
      ref={ref}
      className="absolute right-0 top-full mt-1 z-30 bg-white border border-gray-200
                 rounded-xl shadow-xl p-4 w-52"
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
          Movement Columns
        </span>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
          <X size={14} />
        </button>
      </div>
      <div className="space-y-2">
        {MOVEMENT_COLS.map((col) => (
          <label key={col.key} className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={cols[col.key]}
              onChange={() => onChange(col.key)}
              className="w-3.5 h-3.5 accent-blue-600"
            />
            <span className="flex items-center gap-1.5 text-sm text-gray-700">
              {col.icon} {col.label}
            </span>
          </label>
        ))}
      </div>
      <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100">
        <button
          onClick={() => MOVEMENT_COLS.forEach((c) => !cols[c.key] && onChange(c.key))}
          className="flex-1 text-xs py-1 rounded-lg border border-gray-200 hover:bg-gray-50"
        >
          Show all
        </button>
        <button
          onClick={() => MOVEMENT_COLS.forEach((c) => cols[c.key] && onChange(c.key))}
          className="flex-1 text-xs py-1 rounded-lg border border-gray-200 hover:bg-gray-50"
        >
          Hide all
        </button>
      </div>
    </div>
  );
};

// ── Main component ────────────────────────────────────────────────────────────
const WarehouseStockTable = ({
  currentWarehouseStocks,
  filteredWarehouseStocks,
  stockIndexOfFirstItem,
  stockIndexOfLastItem,
  handleViewStockTransactions,
  stockCurrentPage,
  warehouseStockTotalPages,
  setStockCurrentPage,
  isLoading,
  isAdmin,
  currentUser,
  onStockUpdated,
}) => {
  const [movementMap, setMovementMap] = useState({});
  const [movLoading, setMovLoading] = useState(false);
  const [loadingId, setLoadingId] = useState(null);
  const [adjustmentStock, setAdjustmentStock] = useState(null);
  const [showAdjustmentModal, setShowAdjustmentModal] = useState(false);

  const [visibleCols, setVisibleCols] = useState({
    stockIn: true,
    transferIn: true,
    transferOut: true,
    cancelled: true,
    returns: true,
    damage: true,
    manualAdjustment: true,
  });
  const [showColPanel, setShowColPanel] = useState(false);

  const toggleCol = (key) =>
    setVisibleCols((prev) => ({ ...prev, [key]: !prev[key] }));

  const activeCols = MOVEMENT_COLS.filter((c) => visibleCols[c.key]);
  const anyMovVisible = activeCols.length > 0;

  const warehouseIdKey = [
    ...new Set(
      filteredWarehouseStocks
        .map((s) => s.warehouseId)
        .filter((id) => id != null)
        .map(String)
    ),
  ].sort().join(',');

  useEffect(() => {
    if (!warehouseIdKey) {
      setMovementMap({});
      return;
    }

    const warehouseIds = warehouseIdKey.split(',');
    if (!warehouseIds.length) return;

    let cancelled = false;
    setMovLoading(true);

    const fetchAll = async () => {
      try {
        const results = await Promise.all(
          warehouseIds.map((wid) =>
            api
              .get(`/inventories/report/movements?warehouseId=${wid}`)
              .then((res) => ({ wid, rows: Array.isArray(res.data) ? res.data : [] }))
              .catch(() => ({ wid, rows: [] }))
          )
        );

        if (cancelled) return;

        const map = {};
        results.forEach(({ wid, rows }) => {
          rows.forEach((row) => {
            const pid = String(row.productId ?? '');
            const vid = String(row.variationId ?? '');
            const k = `${wid}|${pid}|${vid}`;
            map[k] = {
              stockIn: Number(row.stockIn) || 0,
              transferIn: Number(row.transferIn) || 0,
              transferOut: Number(row.transferOut) || 0,
              cancelled: Number(row.cancelled) || 0,
              returns: Number(row.returns) || 0,
              damage: Number(row.damage) || 0,
              manualAdjustment: row.manualAdjustment != null ? Number(row.manualAdjustment) : 0,
            };
          });
        });

        setMovementMap(map);
      } finally {
        if (!cancelled) setMovLoading(false);
      }
    };

    fetchAll();
    return () => { cancelled = true; };
  }, [warehouseIdKey]);

  const getMovements = (stock) => {
    const wid = String(stock.warehouseId ?? '');
    const pid = String(stock.productId ?? '');
    const vid = stock.variationId != null ? String(stock.variationId) : '';
    const k = `${wid}|${pid}|${vid}`;
    return movementMap[k] || null;
  };

  const handleView = async (stock) => {
    setLoadingId(stock.id);
    try {
      await handleViewStockTransactions(stock, 'warehouse');
    } finally {
      setLoadingId(null);
    }
  };

  const totalColSpan = 7 + activeCols.length + 2;

  return (
    <div className="bg-white rounded-xl shadow overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Building size={20} />
          Warehouse Stock Levels
          {movLoading && (
            <span className="ml-2 text-xs text-gray-400 font-normal flex items-center gap-1">
              <span className="w-3 h-3 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin inline-block" />
              Loading movements…
            </span>
          )}
        </h2>

        <div className="relative">
          <button
            onClick={() => setShowColPanel((v) => !v)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition
              ${showColPanel || anyMovVisible
                ? 'bg-blue-50 border-blue-300 text-blue-700'
                : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
              }`}
          >
            <SlidersHorizontal size={13} />
            Movements
            {anyMovVisible && (
              <span className="ml-1 bg-blue-600 text-white text-[10px] rounded-full px-1.5 py-0.5 font-bold">
                {activeCols.length}
              </span>
            )}
          </button>

          <ColumnTogglePanel
            visible={showColPanel}
            cols={visibleCols}
            onChange={toggleCol}
            onClose={() => setShowColPanel(false)}
          />
        </div>
      </div>

      <div className="overflow-x-auto border-t border-gray-100">
        <table className="w-full text-sm" style={{ minWidth: '860px', fontSize: '11px' }}>
          <thead className="bg-gray-50">
            <tr>
              <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap" style={{ minWidth: '100px' }}>Warehouse</th>
              <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap" style={{ minWidth: '130px' }}>Product</th>
              <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap" style={{ minWidth: '100px' }}>SKU/UPC</th>
              <th className="px-2 py-2 text-center text-xs font-medium text-gray-500 uppercase whitespace-nowrap" style={{ minWidth: '75px' }}>Total Stock</th>
              <th className="px-2 py-2 text-center text-xs font-medium text-gray-500 uppercase whitespace-nowrap" style={{ minWidth: '75px' }}>
                <div className="flex items-center justify-center gap-1">
                  <CheckCircle size={13} className="text-teal-500" /> Delivered
                </div>
              </th>
              <th className="px-2 py-2 text-center text-xs font-medium text-gray-500 uppercase whitespace-nowrap" style={{ minWidth: '70px' }}>
                <div className="flex items-center justify-center gap-1">
                  <Truck size={13} className="text-orange-500" /> Pending
                </div>
              </th>
              <th className="px-2 py-2 text-center text-xs font-medium text-gray-500 uppercase whitespace-nowrap" style={{ minWidth: '75px' }}>Available</th>

              {activeCols.map((col) => (
                <th
                  key={col.key}
                  className="px-2 py-2 text-center text-xs font-medium text-gray-500 uppercase whitespace-nowrap"
                  style={{ minWidth: '75px' }}
                >
                  <div className="flex items-center justify-center gap-1">
                    {col.icon} {col.label}
                  </div>
                </th>
              ))}

              <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap" style={{ minWidth: '85px' }}>Last Updated</th>
              <th className="px-2 py-2 text-center text-xs font-medium text-gray-500 uppercase whitespace-nowrap" style={{ minWidth: isAdmin ? '110px' : '60px' }}>Actions</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-200">
            {isLoading ? (
              <tr>
                <td colSpan={totalColSpan} className="px-6 py-16 text-center">
                  <div className="flex flex-col items-center gap-3 text-gray-400">
                    <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-500 rounded-full animate-spin" />
                    <span className="text-sm">Loading warehouse stocks…</span>
                  </div>
                </td>
              </tr>
            ) : currentWarehouseStocks.length === 0 ? (
              <tr>
                <td colSpan={totalColSpan} className="px-6 py-8 text-center text-gray-500">
                  No warehouse stock records found
                </td>
              </tr>
            ) : (
              currentWarehouseStocks.map((stock) => {
                const mv = getMovements(stock);
                const isThisLoading = loadingId === stock.id;
                return (
                  <tr key={stock.id} className="hover:bg-gray-50 transition-colors">
                    {/* Warehouse */}
                    <td className="px-2 py-2">
                      <div style={{ maxWidth: '110px' }}>
                        <div className="font-medium text-gray-900 text-xs truncate" title={stock.warehouseName}>
                          {stock.warehouseName}
                        </div>
                        <div className="text-xs text-gray-400 truncate">{stock.warehouseCode}</div>
                      </div>
                    </td>

                    {/* Product */}
                    <td className="px-2 py-2">
                      <div style={{ maxWidth: '140px' }}>
                        <div className="font-medium text-gray-900 text-xs leading-snug line-clamp-2">
                          {stock.fullProductName || stock.productName}
                        </div>
                        {stock.combinationDisplay && (
                          <div className="text-xs text-gray-500 mt-0.5">{stock.combinationDisplay}</div>
                        )}
                      </div>
                    </td>

                    {/* SKU/UPC */}
                    <td className="px-2 py-2">
                      <div className="space-y-0.5" style={{ maxWidth: '110px' }}>
                        <div className="text-xs font-medium truncate">
                          {stock.variationSku || stock.productSku || stock.sku || 'N/A'}
                        </div>
                        {(stock.variationUpc || stock.productUpc || stock.upc) &&
                          (stock.variationUpc || stock.productUpc || stock.upc) !== 'N/A' && (
                            <div className="text-xs text-gray-400 truncate">
                              {stock.variationUpc || stock.productUpc || stock.upc}
                            </div>
                          )}
                        {stock.variationName && (
                          <div className="text-xs text-blue-600 font-medium truncate mt-0.5">
                            {stock.variationName}
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Total Stock */}
                    <td className="px-2 py-2 text-center">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${stock.quantity > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {(stock.quantity || 0).toLocaleString()}
                      </span>
                    </td>

                    {/* Delivered */}
                    <td className="px-2 py-2 text-center">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-teal-100 text-teal-800">
                        {(stock.deliveredQuantity || 0).toLocaleString()}
                      </span>
                    </td>

                    {/* Pending */}
                    <td className="px-2 py-2 text-center">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                        {(stock.pendingDeliveries || 0).toLocaleString()}
                      </span>
                    </td>

                    {/* Available */}
                    <td className="px-2 py-2 text-center">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {Math.max(0, (stock.quantity || 0) - (stock.reservedQuantity || 0)).toLocaleString()}
                      </span>
                    </td>

                    {activeCols.map((col) => (
                      <td key={col.key} className="px-3 py-3 text-center">
                        {movLoading ? (
                          <span className="inline-flex items-center justify-center w-6 h-5">
                            <span className="w-3 h-3 border border-gray-400 border-t-transparent rounded-full animate-spin" />
                          </span>
                        ) : mv === null ? (
                          <span className="text-gray-300 text-xs">—</span>
                        ) : col.renderCell ? col.renderCell(mv) : (
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${col.badge}`}>
                            {col.getValue(mv).toLocaleString()}
                          </span>
                        )}
                      </td>
                    ))}

                    {/* Last Updated */}
                    <td className="px-2 py-2 text-xs text-gray-500 whitespace-nowrap">
                      {(() => {
                        const date = parseDate(stock.lastUpdated);
                        if (!date) return 'N/A';
                        return (
                          <>
                            {date.toLocaleDateString()}<br />
                            <span className="text-gray-400">{date.toLocaleTimeString()}</span>
                          </>
                        );
                      })()}
                    </td>

                    {/* Actions */}
                    <td className="px-2 py-2 text-center">
                      <div className="flex items-center justify-center gap-1 flex-nowrap">
                        <button
                          onClick={() => handleView(stock)}
                          disabled={isThisLoading}
                          className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded transition whitespace-nowrap
                      ${isThisLoading ? 'text-blue-400 cursor-wait' : 'text-blue-600 hover:bg-blue-50'}`}
                        >
                          {isThisLoading ? <Loader2 size={13} className="animate-spin" /> : <Eye size={13} />}
                          {isThisLoading ? 'Loading...' : 'View'}
                        </button>

                        {isAdmin && (
                          <button
                            onClick={() => {
                              setAdjustmentStock(stock);
                              setShowAdjustmentModal(true);
                            }}
                            className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded text-red-600 hover:bg-red-50 transition whitespace-nowrap"
                            title="Manual Adjustment (Admin)"
                          >
                            <SlidersHorizontal size={13} />
                            Adjust
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {filteredWarehouseStocks.length > 0 && (
        <Pagination
          currentPage={stockCurrentPage}
          totalPages={warehouseStockTotalPages}
          onPageChange={setStockCurrentPage}
          onNextPage={() => setStockCurrentPage((prev) => Math.min(prev + 1, warehouseStockTotalPages))}
          onPrevPage={() => setStockCurrentPage((prev) => Math.max(prev - 1, 1))}
          showingStart={stockIndexOfFirstItem + 1}
          showingEnd={Math.min(stockIndexOfLastItem, filteredWarehouseStocks.length)}
          totalItems={filteredWarehouseStocks.length}
        />
      )}
      <ManualAdjustmentModal
        isOpen={showAdjustmentModal}
        onClose={() => {
          setShowAdjustmentModal(false);
          setAdjustmentStock(null);
        }}
        stock={adjustmentStock}
        currentUser={currentUser}
        onSuccess={() => {
          onStockUpdated && onStockUpdated();
        }}
      />
    </div>
  );
};

export default WarehouseStockTable;