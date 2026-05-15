import React, { useState, useMemo } from 'react';
import { Building2, Edit2, Trash2, Eye } from 'lucide-react';
import Pagination from '../common/Pagination';

const BranchTable = ({ branches, searchTerm, onView, onEdit, onDelete }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  const filteredBranches = useMemo(() => {
    return branches.filter(branch =>
      branch.branchCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      branch.branchName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      branch.city?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [branches, searchTerm]);

  // Pagination logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentBranches = filteredBranches.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredBranches.length / itemsPerPage);


  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Branch Code</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Branch Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Location</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Area/Region</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Company</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {currentBranches.length === 0 ? (
              <tr>
                <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                  {filteredBranches.length === 0 ? 'No branches found' : 'No branches on this page'}
                </td>
              </tr>
            ) : (
              currentBranches.map((branch) => (
                <tr key={branch.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <Building2 size={20} className="text-blue-600" />
                      </div>
                      <span className="font-medium text-gray-900">{branch.branchCode}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {branch.branchName}
                    <div className="text-xs text-gray-500">TIN: {branch.tin}</div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    <div>{branch.city}, {branch.province}</div>
                    <div className="text-xs text-gray-500">{branch.address}</div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {branch.area && <div>Area: {branch.area}</div>}
                    {branch.region && <div>Region: {branch.region}</div>}
                    {!branch.area && !branch.region && '-'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {branch.company ? (
                      <div>
                        <div className="font-medium">{branch.company.companyName}</div>
                        {branch.company.tin && (
                          <div className="text-xs text-gray-500">TIN: {branch.company.tin}</div>
                        )}
                        {(branch.company.terms || branch.companyTerms) && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 mt-1">
                            {branch.company.terms || branch.companyTerms}
                          </span>
                        )}
                      </div>
                    ) : '-'}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => onView(branch)}
                        className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition"
                        title="View details"
                      >
                        <Eye size={18} />
                      </button>
                      <button
                        onClick={() => onEdit(branch)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                        title="Edit branch"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button
                        onClick={() => onDelete(branch.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                        title="Delete branch"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {filteredBranches.length > 0 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          onNextPage={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
          onPrevPage={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
          showingStart={indexOfFirstItem + 1}
          showingEnd={Math.min(indexOfLastItem, filteredBranches.length)}
          totalItems={filteredBranches.length}
        />
      )}
    </div>
  );
};

export default BranchTable;