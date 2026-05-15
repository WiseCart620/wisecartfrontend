import React, { useState } from 'react';
import { X, Users, Building2, Search } from 'lucide-react';

const CompanyViewModal = ({ company, branches, onClose }) => {
  const [companyBranchSearch, setCompanyBranchSearch] = useState('');

  if (!company) return null;

  const filteredBranches = company.branches?.filter(branch =>
    branch.branchCode?.toLowerCase().includes(companyBranchSearch.toLowerCase()) ||
    branch.branchName?.toLowerCase().includes(companyBranchSearch.toLowerCase())
  ) || [];

  const getBranchAddress = (branch) => {
    const addressParts = [
      branch.address || branch.branchAddress,
      branch.city,
      branch.province,
      branch.area,
    ].filter(part => part && part.toString().trim() !== '');

    if (addressParts.length > 0) {
      return addressParts.join(', ');
    } else {
      return 'No address provided';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">
            Company Details
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Company Information */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Users size={20} />
              Company Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Company Name</label>
                <p className="text-gray-900 font-medium">{company.companyName}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">TIN</label>
                <p className="text-gray-900">{company.tin}</p>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-500 mb-1">Address</label>
                <p className="text-gray-900">{company.address}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">City</label>
                <p className="text-gray-900">{company.city}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Province</label>
                <p className="text-gray-900">{company.province}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Terms</label>
                <p className="text-gray-900">
                  {company.terms ? (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {company.terms}
                    </span>
                  ) : 'N/A'}
                </p>
              </div>
            </div>
          </div>

          {/* Branches List */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Building2 size={20} />
                Branches ({company.branches?.length || 0})
              </h3>
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                <input
                  type="text"
                  placeholder="Search branches..."
                  value={companyBranchSearch}
                  onChange={(e) => setCompanyBranchSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                />
              </div>
            </div>

            {filteredBranches.length > 0 ? (
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Branch Code</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Branch Name</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Address</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredBranches.map((branch) => (
                      <tr key={branch.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="p-1.5 bg-blue-100 rounded">
                              <Building2 size={14} className="text-blue-600" />
                            </div>
                            <span className="font-medium text-gray-900 text-sm">{branch.branchCode}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">{branch.branchName}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          <div className="max-w-md">
                            {getBranchAddress(branch)}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
                {company.branches?.length > 0 ? 'No branches match your search' : 'No branches found for this company'}
              </div>
            )}
          </div>
        </div>

        <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default CompanyViewModal;