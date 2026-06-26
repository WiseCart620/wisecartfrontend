import React, { useState } from 'react';
import { X, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import { api } from '../../services/api';
import toast from 'react-hot-toast';

const ManualAdjustmentModal = ({ isOpen, onClose, stock, onSuccess, currentUser }) => {
  const [newQuantity, setNewQuantity] = useState('');
  const [remarks, setRemarks] = useState('');
  const [loading, setLoading] = useState(false);
  const [discrepancyError, setDiscrepancyError] = useState(null);
  const [confirmed, setConfirmed] = useState(false);

  if (!isOpen || !stock) return null;

  // Current values
  const totalStock     = stock.quantity || 0;
  const reserved       = stock.reservedQuantity || 0;
  const availableStock = totalStock - reserved;   // what's actually free

  const parsedNew  = parseInt(newQuantity);
  const difference = !isNaN(parsedNew) ? parsedNew - totalStock : null;

  // After adjustment, what would available be?
  const newAvailable = !isNaN(parsedNew) ? parsedNew - reserved : null;

  // Discrepancy check: new available must be >= 0
  // (can't have less stock than already reserved/pending)
  const wouldCauseDiscrepancy = newAvailable !== null && newAvailable < 0;

  const handleQuantityChange = (val) => {
    setNewQuantity(val);
    setDiscrepancyError(null);
    setConfirmed(false);
  };

  const validate = () => {
    if (isNaN(parsedNew) || newQuantity === '') {
      toast.error('Enter a valid quantity');
      return false;
    }
    if (parsedNew < 0) {
      toast.error('Quantity cannot be negative');
      return false;
    }
    if (!remarks.trim()) {
      toast.error('Enter a reason for this adjustment');
      return false;
    }
    if (parsedNew === totalStock) {
      toast.error('New quantity is the same as current stock');
      return false;
    }

    if (wouldCauseDiscrepancy) {
      setDiscrepancyError({
        newTotal:     parsedNew,
        reserved,
        newAvailable,
        shortfall:    Math.abs(newAvailable),
      });
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    setLoading(true);
    try {
      const res = await api.post(
        `/inventories/manual-adjustment?userRole=ADMIN`,
        {
          warehouseId:  stock.warehouseId,
          productId:    stock.productId,
          variationId:  stock.variationId || null,
          newQuantity:  parsedNew,
          remarks:      remarks.trim(),
          adjustedBy:   currentUser || 'Admin',
        }
      );

      if (res.success) {
        toast.success(`Stock adjusted: ${totalStock.toLocaleString()} → ${parsedNew.toLocaleString()}`);
        onSuccess && onSuccess();
        handleClose();
      } else {
        toast.error(res.error || 'Adjustment failed');
      }
    } catch (err) {
      toast.error(err.message || 'Failed to apply adjustment');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setNewQuantity('');
    setRemarks('');
    setDiscrepancyError(null);
    setConfirmed(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-base font-bold text-gray-900">Manual Stock Adjustment</h2>
            <p className="text-xs text-red-600 font-medium mt-0.5">⚠ Admin only</p>
          </div>
          <button onClick={handleClose} className="text-gray-400 hover:text-gray-600">
            <X size={18} />
          </button>
        </div>

        {/* Product info */}
        <div className="px-5 py-3 bg-gray-50 border-b border-gray-100">
          <div className="text-sm font-semibold text-gray-900 truncate">
            {stock.fullProductName || stock.productName}
          </div>
          {stock.combinationDisplay && (
            <div className="text-xs text-gray-500 mt-0.5">{stock.combinationDisplay}</div>
          )}
          <div className="text-xs text-gray-400 mt-0.5">
            {stock.warehouseName} · {stock.variationSku || stock.productSku || 'N/A'}
          </div>
        </div>

        {/* Stock summary */}
        <div className="px-5 py-3 grid grid-cols-3 gap-2 border-b border-gray-100">
          <div className="text-center p-2 bg-gray-50 rounded-lg">
            <div className="text-xs text-gray-500 mb-1">Total Stock</div>
            <div className="text-base font-bold text-gray-900">{totalStock.toLocaleString()}</div>
          </div>
          <div className="text-center p-2 bg-orange-50 rounded-lg">
            <div className="text-xs text-orange-600 mb-1">Pending (reserved)</div>
            <div className="text-base font-bold text-orange-700">{reserved.toLocaleString()}</div>
          </div>
          <div className="text-center p-2 bg-blue-50 rounded-lg">
            <div className="text-xs text-blue-600 mb-1">Available</div>
            <div className="text-base font-bold text-blue-700">{availableStock.toLocaleString()}</div>
          </div>
        </div>

        <div className="px-5 py-4 space-y-4">

          {/* New quantity input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              New Total Stock <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min="0"
              value={newQuantity}
              onChange={e => handleQuantityChange(e.target.value)}
              placeholder={`Current: ${totalStock}`}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Live calculation preview */}
          {newQuantity !== '' && !isNaN(parsedNew) && (
            <div className={`rounded-lg p-3 text-xs space-y-1.5 border ${
              wouldCauseDiscrepancy
                ? 'bg-red-50 border-red-200'
                : 'bg-green-50 border-green-200'
            }`}>
              <div className="font-semibold text-gray-700 mb-2">After adjustment:</div>
              <div className="flex justify-between">
                <span className="text-gray-600">New total stock</span>
                <span className="font-semibold text-gray-900">{parsedNew.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Still reserved (pending deliveries)</span>
                <span className="font-semibold text-orange-700">− {reserved.toLocaleString()}</span>
              </div>
              <div className={`flex justify-between border-t pt-1.5 mt-1 ${
                wouldCauseDiscrepancy ? 'border-red-200' : 'border-green-200'
              }`}>
                <span className="font-semibold text-gray-700">New available stock</span>
                <span className={`font-bold text-base ${
                  wouldCauseDiscrepancy ? 'text-red-700' : 'text-green-700'
                }`}>
                  {(newAvailable ?? 0).toLocaleString()}
                </span>
              </div>
              <div className={`flex justify-between text-xs ${
                difference > 0 ? 'text-green-700' : 'text-red-700'
              }`}>
                <span>Change to total stock</span>
                <span className="font-medium">
                  {difference > 0 ? `+${difference.toLocaleString()}` : difference?.toLocaleString()}
                </span>
              </div>
            </div>
          )}

          {/* Discrepancy error */}
          {discrepancyError && (
            <div className="bg-red-50 border border-red-300 rounded-lg p-3 text-xs space-y-2">
              <div className="flex items-start gap-2">
                <AlertTriangle size={15} className="text-red-600 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="font-bold text-red-800 text-sm mb-1">Cannot apply — stock discrepancy</div>
                  <p className="text-red-700">
                    Setting total stock to <strong>{discrepancyError.newTotal.toLocaleString()}</strong> would
                    leave <strong className="text-red-800">{discrepancyError.newAvailable.toLocaleString()}</strong> available,
                    but <strong>{discrepancyError.reserved.toLocaleString()}</strong> units are already reserved
                    for pending deliveries.
                  </p>
                  <p className="text-red-700 mt-1">
                    You are short by <strong className="text-red-900">{discrepancyError.shortfall.toLocaleString()} units</strong>.
                    To proceed, either:
                  </p>
                  <ul className="list-disc ml-4 mt-1 space-y-0.5 text-red-700">
                    <li>Set new total to at least <strong>{reserved.toLocaleString()}</strong> (covers all pending)</li>
                    <li>Cancel or reduce some pending deliveries first</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Remarks */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Reason / Remarks <span className="text-red-500">*</span>
            </label>
            <textarea
              value={remarks}
              onChange={e => setRemarks(e.target.value)}
              placeholder="e.g. Physical count correction, system discrepancy fix..."
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          {/* Audit warning */}
          <div className="flex items-start gap-2 p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
            <Info size={13} className="mt-0.5 flex-shrink-0" />
            <span>This directly updates warehouse stock and creates an audit record in transaction history.</span>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-2 px-5 py-4 border-t border-gray-100">
          <button
            onClick={handleClose}
            disabled={loading}
            className="flex-1 px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 transition disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || newQuantity === '' || !remarks.trim() || wouldCauseDiscrepancy}
            className="flex-1 px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50 font-medium"
          >
            {loading ? 'Applying...' : 'Apply Adjustment'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ManualAdjustmentModal;