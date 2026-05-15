import React from 'react';
import { X, Building2, Users, Edit2 } from 'lucide-react';

const BranchViewModal = ({ branch, onClose, onEdit }) => {
  if (!branch) return null;

  return (
    <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">
            Branch Details
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Branch Information */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Building2 size={20} />
              Branch Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Branch Code</label>
                <p className="text-gray-900 font-medium">{branch.branchCode}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Branch Name</label>
                <p className="text-gray-900 font-medium">{branch.branchName}</p>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-500 mb-1">Address</label>
                <p className="text-gray-900">{branch.address || 'No address provided'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">City</label>
                <p className="text-gray-900">{branch.city || 'N/A'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Province</label>
                <p className="text-gray-900">{branch.province || 'N/A'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Area</label>
                <p className="text-gray-900">{branch.area || 'N/A'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Branch TIN</label>
                <p className="text-gray-900">{branch.tin || 'N/A'}</p>
              </div>
            </div>
          </div>

          {/* Company Information */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Users size={20} />
              Company Information
            </h3>
            {branch.company ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-blue-50 p-4 rounded-lg border border-blue-200">
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Company Name</label>
                  <p className="text-gray-900 font-medium">{branch.company.companyName || 'N/A'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">TIN</label>
                  <p className="text-gray-900">{branch.company.tin || 'N/A'}</p>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-500 mb-1">Address</label>
                  <p className="text-gray-900">{branch.company.address || 'No address provided'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">City</label>
                  <p className="text-gray-900">{branch.company.city || 'N/A'}</p>
                </div>
<div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Province</label>
                  <p className="text-gray-900">{branch.company.province || 'N/A'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Terms</label>
                  <p className="text-gray-900">
                    {(branch.company?.terms || branch.companyTerms) ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {branch.company?.terms || branch.companyTerms}
                      </span>
                    ) : 'N/A'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
                No company associated with this branch
              </div>
            )}
          </div>
        </div>

        <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 flex gap-3">
          <button
            onClick={onEdit}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center justify-center gap-2"
          >
            <Edit2 size={16} />
            Edit Branch
          </button>
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default BranchViewModal;