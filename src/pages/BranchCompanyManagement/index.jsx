import React, { useState, useEffect } from 'react';
import { Plus, Search, X } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import BranchTable from '../../components/tables/BranchTable';
import CompanyTable from '../../components/tables/CompanyTable';
import BranchViewModal from '../../components/modals/BranchViewModal';
import CompanyViewModal from '../../components/modals/CompanyViewModal';
import BranchCompanyModal from '../../components/modals/BranchCompanyModal';
import { LoadingOverlay } from '../../components/common/LoadingOverlay';
import { api } from '../../services/api';
import { useBranchesCompanies } from '../../hooks/useBranchCompany';
import { useAuth, can } from '../../context/AuthContext';

const BranchCompanyManagement = () => {
  const { user } = useAuth();
  const canCreate = can(user, 'branches', 'create');
  const canEdit = can(user, 'branches', 'edit');
  const canDelete = can(user, 'branches', 'delete');
  const [activeTab, setActiveTab] = useState('branches');
  const [showModal, setShowModal] = useState(false);
  const [showBranchViewModal, setShowBranchViewModal] = useState(false);
  const [showCompanyViewModal, setShowCompanyViewModal] = useState(false);
  const [viewingBranch, setViewingBranch] = useState(null);
  const [viewingCompany, setViewingCompany] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingData, setEditingData] = useState(null);
  const [modalMode, setModalMode] = useState('create');

  const {
    branches,
    companies,
    allCompanies,
    loading,
    loadingMessage,
    loadData,
    handleDelete,
    handleDeleteCompany
  } = useBranchesCompanies();

  useEffect(() => {
    loadData();
  }, []);

  const handleAddNew = () => {
    setEditingData(null);
    setModalMode('create');
    setShowModal(true);
  };

  const handleEditBranch = async (branch) => {
    try {
      let companyData = null;

      if (branch.company) {
        companyData = branch.company;
      } else {
        const response = await api.get(`/companies/by-branch-id/${branch.id}`);
        if (response.success) {
          companyData = response.data;
        }
      }

      setEditingData({ branch, company: companyData });
      setModalMode('view'); // Default to view mode for branch editing
      setShowModal(true);
    } catch (error) {
      toast.error('Failed to load branch details');
      console.error(error);
    }
  };

  const handleEditCompany = (company) => {
    setEditingData({
      branch: { id: 'company-only-edit' }, // Dummy branch for company-only edit
      company
    });
    setModalMode('edit-company-only');
    setShowModal(true);
  };

  const handleViewBranch = async (branch) => {
    try {
      let companyData = null;

      if (branch.company) {
        companyData = branch.company;
      } else {
        const response = await api.get(`/companies/by-branch-id/${branch.id}`);
        if (response.success) {
          companyData = response.data;
        }
      }

      setViewingBranch({
        ...branch,
        address: branch.address || branch.branchAddress,
        city: branch.city || branch.branchCity,
        province: branch.province || branch.branchProvince,
        company: companyData
      });
      setShowBranchViewModal(true);
    } catch (error) {
      toast.error('Failed to load branch details');
      console.error(error);
    }
  };

  const handleViewCompany = (company) => {
    if (company.branches && company.branches.length > 0) {
      const enrichedBranches = company.branches.map(branch => {
        const fullBranch = branches.find(b => b.id === branch.id);
        return fullBranch || branch;
      });

      const companyWithFullBranches = {
        ...company,
        branches: enrichedBranches
      };

      setViewingCompany(companyWithFullBranches);
    } else {
      setViewingCompany(company);
    }
    setShowCompanyViewModal(true);
  };

  const handleSaveSuccess = () => {
    setShowModal(false);
    setEditingData(null);
    loadData();
  };

  return (
    <div className="p-6 max-w-full mx-auto px-8">
      <Toaster position="top-right" />
      <LoadingOverlay show={loading} message={loadingMessage} />

      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Branch & Company Management</h1>
        <p className="text-gray-600 mt-1">Manage branches and their associated companies</p>
      </div>

      {/* Tabs */}
      <div className="mb-6 border-b border-gray-200">
        <nav className="flex gap-8">
          <button
            onClick={() => setActiveTab('branches')}
            className={`pb-4 px-1 border-b-2 font-medium text-sm transition ${activeTab === 'branches'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
          >
            Branches ({branches.length})
          </button>
          <button
            onClick={() => setActiveTab('companies')}
            className={`pb-4 px-1 border-b-2 font-medium text-sm transition ${activeTab === 'companies'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
          >
            Companies ({companies.length})
          </button>
        </nav>
      </div>

      {/* Actions Bar */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder={
              activeTab === 'branches'
                ? "Search by code, name, or city..."
                : "Search by company name, TIN, or branch..."
            }
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        {canCreate && (
          <button
            onClick={handleAddNew}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            <Plus size={20} />
            Add Branch & Company
          </button>
        )}
      </div>

      {/* Content */}
      {activeTab === 'branches' ? (
        <BranchTable
          branches={branches}
          searchTerm={searchTerm}
          onView={handleViewBranch}
          onEdit={handleEditBranch}
          onDelete={handleDelete}
          canEdit={canEdit}
          canDelete={canDelete}
        />
      ) : (
        <CompanyTable
          companies={companies}
          searchTerm={searchTerm}
          onView={handleViewCompany}
          onEdit={handleEditCompany}
          onDelete={handleDeleteCompany}
          canEdit={canEdit}
          canDelete={canDelete}
        />
      )}

      {/* Modals */}
      {showBranchViewModal && viewingBranch && (
        <BranchViewModal
          branch={viewingBranch}
          onClose={() => {
            setShowBranchViewModal(false);
            setViewingBranch(null);
          }}
          onEdit={() => {
            setShowBranchViewModal(false);
            handleEditBranch(viewingBranch);
          }}
        />
      )}

      {showCompanyViewModal && viewingCompany && (
        <CompanyViewModal
          company={viewingCompany}
          branches={branches}
          onClose={() => {
            setShowCompanyViewModal(false);
            setViewingCompany(null);
          }}
        />
      )}

      {showModal && (
        <BranchCompanyModal
          onClose={() => {
            setShowModal(false);
            setEditingData(null);
          }}
          onSave={handleSaveSuccess}
          companies={allCompanies}
          branches={branches}
          editingData={editingData}
        />
      )}
    </div>
  );
};

export default BranchCompanyManagement;