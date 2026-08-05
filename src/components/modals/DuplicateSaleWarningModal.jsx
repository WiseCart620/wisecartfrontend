import React from 'react';
import { AlertTriangle } from 'lucide-react';

const fmt = (n) => Number(n || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const statusBadge = (status) => {
  if (status === 'INVOICED') return 'bg-green-100 text-green-700';
  if (status === 'CONFIRMED') return 'bg-blue-100 text-blue-700';
  return 'bg-yellow-100 text-yellow-700';
};

const DuplicateSaleWarningModal = ({ matches, onCancel, onSubmitAnyway }) => {
  return (
    <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
        <div className="p-5 flex items-start gap-3 border-b border-gray-100">
          <div className="w-10 h-10 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center flex-shrink-0">
            <AlertTriangle size={20} />
          </div>
          <div className="flex-1">
            <h3 className="text-base font-semibold text-gray-900">This sale may already be encoded</h3>
            <p className="text-sm text-gray-500 mt-0.5">
              A sale with the same branch, period, and products already exists.
            </p>
          </div>
        </div>

        <div className="px-5 py-4 max-h-56 overflow-y-auto space-y-2">
          {matches.map((m) => (
            <div key={m.saleId} className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5">
              <div>
                <div className="text-sm font-medium text-gray-800">SALE-{m.saleId}</div>
                <div className="text-xs text-gray-500 mt-0.5">
                  {m.itemCount} item{m.itemCount > 1 ? 's' : ''} · {m.createdBy || 'Unknown'}
                </div>
              </div>
              <div className="text-right">
                <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold ${statusBadge(m.status)}`}>
                  {m.status}
                </span>
                <div className="text-xs font-semibold text-gray-700 mt-1">₱{fmt(m.totalAmount)}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="px-5 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-white transition"
          >
            Cancel
          </button>
          <button
            onClick={onSubmitAnyway}
            className="px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700 transition shadow-sm"
          >
            Submit anyway
          </button>
        </div>
      </div>
    </div>
  );
};

export default DuplicateSaleWarningModal;