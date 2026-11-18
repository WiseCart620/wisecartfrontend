import React from 'react';
import { XCircle } from 'lucide-react';

const Stat = ({ label, value, danger }) => (
  <div className={`rounded-lg border px-3 py-2 ${danger ? 'border-red-200 bg-red-50' : 'border-gray-200 bg-white'}`}>
    <div className="text-[11px] uppercase tracking-wide text-gray-500">{label}</div>
    <div className={`text-lg font-semibold ${danger ? 'text-red-600' : 'text-gray-900'}`}>{value}</div>
  </div>
);

const InsufficientStockModal = ({ error, onClose }) => {
  const d = error || {};
  const noDelivery = Number(d.delivered || 0) <= 0;

  return (
    <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
        <div className="p-5 flex items-start gap-3 border-b border-gray-100">
          <div className="w-10 h-10 rounded-full bg-red-50 text-red-600 flex items-center justify-center flex-shrink-0">
            <XCircle size={20} />
          </div>
          <div className="flex-1">
            <h3 className="text-base font-semibold text-gray-900">
              {noDelivery ? 'No delivery recorded' : 'Not enough delivered stock'}
            </h3>
            <p className="text-sm text-gray-500 mt-0.5">
              {noDelivery
                ? 'This product has no delivery to the branch up to the end of the selected month.'
                : 'The quantity requested is more than what was delivered and not yet sold.'}
            </p>
          </div>
        </div>

        <div className="px-5 py-4 space-y-3">
          <div className="rounded-lg border border-gray-200 px-3 py-2.5">
            <div className="text-sm font-medium text-gray-800">{d.productName}</div>
            <div className="text-xs text-gray-500 mt-0.5">
              {d.branchName} &middot; {d.period}
            </div>
          </div>

          {!noDelivery && (
            <div className="grid grid-cols-2 gap-2">
              <Stat label="Delivered" value={d.delivered} />
              <Stat label="Already sold" value={d.sold} />
              <Stat label="Available" value={d.available} />
              <Stat label="Requested" value={d.requested} danger />
            </div>
          )}

          <p className="text-xs text-gray-500">
            Lower the quantity, pick another branch or period, or record the missing delivery first.
          </p>
        </div>

        <div className="px-5 py-4 border-t border-gray-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-900 text-white rounded text-sm font-medium hover:bg-gray-800 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default InsufficientStockModal;