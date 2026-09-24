import React from 'react';
import { X } from 'lucide-react';

export const inputCls = 'w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none';

export const money = (v) => v == null ? '—' :
  new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(v);

export const today = () => new Date().toISOString().slice(0, 10);

export const Field = ({ label, required, children, className = '' }) => (
  <div className={className}>
    <label className="block text-xs font-medium text-gray-700 mb-1">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    {children}
  </div>
);

export const Modal = ({ title, subtitle, onClose, children, maxW = 'max-w-2xl' }) => (
  <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4">
    <div className={`bg-white rounded-xl shadow-xl ${maxW} w-full max-h-[90vh] overflow-y-auto`}>
      <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">{title}</h2>
          {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
        </div>
        <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg"><X size={20} /></button>
      </div>
      <div className="p-6">{children}</div>
    </div>
  </div>
);

export const STATUS_STYLE = {
  ACTIVE: 'bg-green-100 text-green-800',
  PAID: 'bg-blue-100 text-blue-800',
  CANCELLED: 'bg-gray-100 text-gray-600',
};