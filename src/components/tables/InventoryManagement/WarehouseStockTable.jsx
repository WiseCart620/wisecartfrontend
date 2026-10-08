import React, { useState, useEffect, useRef } from 'react';
import {
  Building, CheckCircle, Truck, Eye, Package, Barcode, Boxes, PackageCheck, CalendarClock, MousePointerClick,
  ArrowDownCircle, ArrowUpCircle, ArrowLeftRight,
  AlertTriangle, RotateCcw, SlidersHorizontal, X, Loader2, XCircle,
} from 'lucide-react';
import Pagination from '../../common/Pagination';
import HeaderIcon from '../../common/HeaderIcon';
import { parseDate } from '../../../utils/dateUtils';
import ManualAdjustmentModal from '../../modals/ManualAdjustmentModal';


const MOVEMENT_COLS = [
  { key: 'stockIn', label: 'Stock In', icon: <ArrowDownCircle size={13} />, getValue: (mv) => mv?.stockIn ?? 0 },
  { key: 'transferIn', label: 'Trf In', icon: <ArrowLeftRight size={13} />, getValue: (mv) => mv?.transferIn ?? 0 },
  { key: 'returns', label: 'Return', icon: <RotateCcw size={13} />, getValue: (mv) => mv?.returns ?? 0 },
  { key: 'transferOut', label: 'Trf Out', icon: <ArrowUpCircle size={13} />, getValue: (mv) => mv?.transferOut ?? 0 },
  { key: 'damage', label: 'Damage', icon: <AlertTriangle size={13} />, getValue: (mv) => mv?.damage ?? 0 },
  { key: 'cancelled', label: 'Cancelled', icon: <XCircle size={13} />, getValue: (mv) => mv?.cancelled ?? 0 },
  {
    key: 'manualAdjustment',
    label: 'Adj.',
    icon: <SlidersHorizontal size={13} />,
    getValue: (mv) => mv?.manualAdjustment ?? 0,
    renderCell: (mv) => {
      const net = mv?.manualAdjustment ?? 0;
      if (net === 0) return <span className="text-sm text-black">—</span>;
      return (
        <span className="text-sm text-black">
          {net > 0 ? '+' : ''}{net.toLocaleString()}
        </span>
      );
    },
  },
];

// Every column that can be toggled from the Movements panel
const ALL_TOGGLE_KEYS = ['sku', ...MOVEMENT_COLS.map((c) => c.key), 'lastUpdated'];

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

  const Row = ({ colKey, icon, label }) => (
    <label className="flex items-center gap-2 cursor-pointer select-none">
      <input
        type="checkbox"
        checked={!!cols[colKey]}
        onChange={() => onChange(colKey)}
        className="w-3.5 h-3.5 accent-black"
      />
      <span className="flex items-center gap-1.5 text-sm text-black">
        {icon} {label}
      </span>
    </label>
  );

  return (
    <div
      ref={ref}
      className="absolute right-0 top-full mt-1 z-30 bg-white border border-gray-200
                 rounded-xl shadow-xl p-4 w-56"
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold text-black uppercase tracking-wide">
          Optional Columns
        </span>
        <button onClick={onClose} className="text-black">
          <X size={14} />
        </button>
      </div>
      <div className="space-y-2">
        <Row colKey="sku" label="SKU/UPC" />
        {MOVEMENT_COLS.map((col) => (
          <Row key={col.key} colKey={col.key} icon={col.icon} label={col.label} />
        ))}
        <Row colKey="lastUpdated" label="Last Updated" />
      </div>
      <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100">
        <button
          onClick={() => ALL_TOGGLE_KEYS.forEach((k) => !cols[k] && onChange(k))}
          className="flex-1 text-xs py-1 rounded border border-gray-200 text-black hover:bg-white"
        >
          Show all
        </button>
        <button
          onClick={() => ALL_TOGGLE_KEYS.forEach((k) => cols[k] && onChange(k))}
          className="flex-1 text-xs py-1 rounded border border-gray-200 text-black hover:bg-white"
        >
          Hide all
        </button>
      </div>
    </div>
  );
};

// ── Main component ────────────────────────────────────────────────────────────
const SKELETON_ROWS = 5;

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
  movementMap = {},
  movLoading = false,
  grandTotals,
  totalElements = 0,
}) => {
  const [loadingId, setLoadingId] = useState(null);
  const totals = grandTotals || { quantity: 0, delivered: 0, pendingDelivery: 0, available: 0 };
  const [adjustmentStock, setAdjustmentStock] = useState(null);
  const [showAdjustmentModal, setShowAdjustmentModal] = useState(false);

  const [visibleCols, setVisibleCols] = useState({
    sku: true,
    stockIn: false,
    transferIn: false,
    transferOut: false,
    cancelled: false,
    returns: false,
    damage: false,
    manualAdjustment: false,
    lastUpdated: false,
  });
  const [showColPanel, setShowColPanel] = useState(false);

  const toggleCol = (key) =>
    setVisibleCols((prev) => ({ ...prev, [key]: !prev[key] }));

  const activeCols = MOVEMENT_COLS.filter((c) => visibleCols[c.key]);
  const visibleCount = ALL_TOGGLE_KEYS.filter((k) => visibleCols[k]).length;
  const anyMovVisible = visibleCount > 0;

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

  const totalColSpan =
    7 + activeCols.length + (visibleCols.sku ? 1 : 0) + (visibleCols.lastUpdated ? 1 : 0);

  return (
    <div className="bg-white rounded-xl shadow overflow-hidden inv-table-panel">
      {/* Header */}
      <div className="px-4 py-2 border-b border-gray-200 bg-white flex items-center justify-between">
        <h2 className="text-base text-gray-900 flex items-center gap-2">
          <Building size={20} />
          Warehouse Stock Levels
          {movLoading && (
            <span className="ml-2 text-xs text-gray-400 font-normal flex items-center gap-1">
              <span className="w-3 h-3 border-2 border-orange-300 border-t-orange-600 rounded-full animate-spin inline-block" />
              Loading movements…
            </span>
          )}
        </h2>

        <div className="relative">
          <button
            onClick={() => setShowColPanel((v) => !v)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded border transition
              ${showColPanel || anyMovVisible
                ? 'bg-gray-100 border-gray-400 text-black'
                : 'bg-white border-gray-300 text-black hover:bg-white'
              }`}
          >
            <SlidersHorizontal size={13} />
            Movements
            {anyMovVisible && (
              <span className="ml-1 bg-black text-white text-[10px] rounded-full px-1.5 py-0.5 font-bold">
                {visibleCount}
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

      <div className="border-t border-gray-100 overflow-auto max-h-[65vh] table-fit">
        <table className="w-full text-sm text-black" style={{ fontSize: '11px', tableLayout: 'fixed' }}>
          <thead className="bg-white sticky top-0 z-10">
            <tr>
              <th className="px-2 py-2 th-left col-name"><HeaderIcon Icon={Building} label="Warehouse" align="left" /></th>
              <th className="px-2 py-2 th-left col-prod"><HeaderIcon Icon={Package} label="Product" align="left" /></th>
              {visibleCols.sku && (
                <th className="px-2 py-2 th-left col-sku"><HeaderIcon Icon={Barcode} label="SKU/UPC" align="left" /></th>
              )}
              {activeCols.map((col) => (
                <th key={col.key} className="px-2 py-2 text-center th-num"><HeaderIcon icon={col.icon} label={col.label} /></th>
              ))}
              <th className="px-2 py-2 text-center th-num"><HeaderIcon Icon={Boxes} label="Stock" /></th>
              <th className="px-2 py-2 text-center th-num"><HeaderIcon Icon={CheckCircle} label="Delivered" /></th>
              <th className="px-2 py-2 text-center th-num"><HeaderIcon Icon={Truck} label="Pending Delivery" /></th>
              <th className="px-2 py-2 text-center th-num"><HeaderIcon Icon={PackageCheck} label="Available" /></th>
              {visibleCols.lastUpdated && (
                <th className="px-2 py-2 th-left col-date"><HeaderIcon Icon={CalendarClock} label="Last Updated" align="left" /></th>
              )}
              <th className="px-2 py-2 text-center col-act"><HeaderIcon Icon={MousePointerClick} label="Actions" /></th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-200">
            {isLoading ? (
              [...Array(SKELETON_ROWS)].map((_, i) => (
                <tr key={i} className="animate-pulse">
                  <td className="px-2 py-2"><div className="h-4 bg-gray-100 rounded w-20" /><div className="h-3 bg-gray-100 rounded w-10 mt-1" /></td>
                  <td className="px-2 py-2"><div className="h-4 bg-gray-100 rounded w-28" /></td>
                  {visibleCols.sku && (
                    <td className="px-2 py-2"><div className="h-4 bg-gray-100 rounded w-20" /></td>
                  )}
                  {activeCols.map((col) => (
                    <td key={col.key} className="px-2 py-2"><div className="h-5 bg-gray-100 rounded-full w-10 mx-auto" /></td>
                  ))}
                  <td className="px-2 py-2"><div className="h-5 bg-gray-100 rounded-full w-10 mx-auto" /></td>
                  <td className="px-2 py-2"><div className="h-5 bg-gray-100 rounded-full w-10 mx-auto" /></td>
                  <td className="px-2 py-2"><div className="h-5 bg-gray-100 rounded-full w-10 mx-auto" /></td>
                  <td className="px-2 py-2"><div className="h-5 bg-gray-100 rounded-full w-10 mx-auto" /></td>
                  {visibleCols.lastUpdated && (
                    <td className="px-2 py-2"><div className="h-4 bg-gray-100 rounded w-16" /></td>
                  )}
                  <td className="px-2 py-2"><div className="h-4 bg-gray-100 rounded w-10 mx-auto" /></td>
                </tr>
              ))
            ) : currentWarehouseStocks.length === 0 ? (
              <tr>
                <td colSpan={totalColSpan} className="px-6 py-8 text-center text-black">
                  No warehouse stock records found
                </td>
              </tr>
            ) : (
              currentWarehouseStocks.map((stock) => {
                const mv = getMovements(stock);
                const isThisLoading = loadingId === stock.id;
                return (
                  <tr key={stock.id} className="hover:bg-white transition-colors text-black">
                    {/* Warehouse */}
                    <td className="px-2 py-2">
                      <div className="txt-block">
                        <div className="font-normal text-black truncate" title={stock.warehouseName}>
                          {stock.warehouseName}
                        </div>
                        <div className="font-normal text-black truncate">{stock.warehouseCode}</div>
                      </div>
                    </td>

                    {/* Product */}
                    <td className="px-2 py-2">
                      <div className="txt-block">
                        <div className="font-normal text-black truncate" title={stock.productName || stock.fullProductName}>
                          {stock.productName || stock.fullProductName}
                        </div>
                        {(stock.variationName || stock.combinationDisplay) && (
                          <div className="table-sub text-gray-500 truncate" title={stock.combinationDisplay || stock.variationName}>
                            {stock.combinationDisplay || stock.variationName}
                          </div>
                        )}
                      </div>
                    </td>

                    {/* SKU/UPC (optional) */}
                    {visibleCols.sku && (
                      <td className="px-2 py-2">
                        <div className="txt-block">
                          <div className="font-normal text-black truncate">
                            {stock.variationSku || stock.productSku || stock.sku || 'N/A'}
                          </div>
                          {(stock.variationUpc || stock.productUpc || stock.upc) &&
                            (stock.variationUpc || stock.productUpc || stock.upc) !== 'N/A' && (
                              <div className="font-normal text-black truncate">
                                {stock.variationUpc || stock.productUpc || stock.upc}
                              </div>
                            )}
                        </div>
                      </td>
                    )}

                    {/* Movement columns (optional) */}
                    {activeCols.map((col) => (
                      <td key={col.key} className="px-2 py-2 text-center td-num">
                        {movLoading ? (
                          <span className="inline-flex items-center justify-center w-6 h-5">
                            <span className="w-3 h-3 border border-gray-400 border-t-transparent rounded-full animate-spin" />
                          </span>
                        ) : mv === null ? (
                          <span className="text-black text-xs">—</span>
                        ) : col.renderCell ? col.renderCell(mv) : (
                          <span className="text-sm text-black">
                            {col.getValue(mv).toLocaleString()}
                          </span>
                        )}
                      </td>
                    ))}

                    {/* Stock */}
                    <td className="px-2 py-2 text-center text-sm font-semibold text-black td-num">
                      {(stock.quantity || 0).toLocaleString()}
                    </td>

                    {/* Delivered */}
                    <td className="px-2 py-2 text-center text-sm text-black td-num">
                      {(stock.deliveredQuantity || 0).toLocaleString()}
                    </td>

                    {/* Pending */}
                    <td className="px-2 py-2 text-center text-sm text-black td-num">
                      {(stock.pendingDeliveries || 0).toLocaleString()}
                    </td>

                    {/* Available */}
                    <td className="px-2 py-2 text-center text-sm text-black td-num">
                      {Math.max(0, (stock.quantity || 0) - (stock.reservedQuantity || 0)).toLocaleString()}
                    </td>

                    {/* Last Updated (optional) */}
                    {visibleCols.lastUpdated && (
                      <td className="px-2 py-2 text-xs text-black whitespace-nowrap">
                        {(() => {
                          const date = parseDate(stock.lastUpdated);
                          if (!date) return 'N/A';
                          return (
                            <>
                              {date.toLocaleDateString()}<br />
                              <span>{date.toLocaleTimeString()}</span>
                            </>
                          );
                        })()}
                      </td>
                    )}

                    {/* Actions */}
                    <td className="px-2 py-2 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => handleView(stock)}
                          disabled={isThisLoading}
                          title="View Transactions"
                          className={`p-1.5 rounded transition text-black ${isThisLoading ? 'cursor-wait opacity-50' : 'hover:bg-gray-100'}`}
                        >
                          {isThisLoading ? <Loader2 size={14} className="animate-spin" /> : <Eye size={14} />}
                        </button>
                        {isAdmin && (
                          <button
                            onClick={() => { setAdjustmentStock(stock); setShowAdjustmentModal(true); }}
                            title="Manual Adjustment"
                            className="p-1.5 rounded text-black hover:bg-gray-100 transition"
                          >
                            <SlidersHorizontal size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>

          {!isLoading && totalElements > 0 && (
            <tfoot className="[&_td]:sticky [&_td]:bottom-0 [&_td]:z-10 [&_td]:bg-white [&_td]:shadow-[0_-2px_0_#e5e7eb]">
              <tr>
                <td className="px-2 py-2 text-xs font-semibold text-black" colSpan={2 + (visibleCols.sku ? 1 : 0)}>
                  Grand Total ({totalElements.toLocaleString('en-US')} rows)
                </td>
                {activeCols.length > 0 && <td className="px-2 py-2" colSpan={activeCols.length}></td>}
                <td className="px-2 py-2 text-center text-sm font-semibold text-black">
                  {(totals.quantity ?? 0).toLocaleString('en-US')}
                </td>
                <td className="px-2 py-2 text-center text-sm font-semibold text-black">
                  {(totals.delivered ?? 0).toLocaleString('en-US')}
                </td>
                <td className="px-2 py-2 text-center text-sm font-semibold text-black">
                  {(totals.pendingDelivery ?? 0).toLocaleString('en-US')}
                </td>
                <td className="px-2 py-2 text-center text-sm font-semibold text-black">
                  {(totals.available || Math.max(0, (totals.quantity ?? 0) - (totals.pendingDelivery ?? 0))).toLocaleString('en-US')}
                </td>
                <td className="px-2 py-2" colSpan={1 + (visibleCols.lastUpdated ? 1 : 0)}></td>
              </tr>
            </tfoot>
          )}

        </table>
      </div>


      {totalElements > 0 && (
        <Pagination
          currentPage={stockCurrentPage}
          totalPages={warehouseStockTotalPages}
          onPageChange={setStockCurrentPage}
          onNextPage={() => setStockCurrentPage((prev) => Math.min(prev + 1, warehouseStockTotalPages))}
          onPrevPage={() => setStockCurrentPage((prev) => Math.max(prev - 1, 1))}
          showingStart={stockIndexOfFirstItem + 1}
          showingEnd={Math.min(stockIndexOfLastItem, totalElements)}
          totalItems={totalElements}
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