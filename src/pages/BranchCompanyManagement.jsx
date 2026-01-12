import React, { useState, useEffect, useRef } from 'react';
import { Plus, Edit2, Trash2, Search, X, Building2, Users, ChevronDown, ChevronLeft, ChevronRight, Eye } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import { LoadingOverlay } from './LoadingOverlay';


import { api } from '../services/api';

const SearchableDropdown = ({ options, value, onChange, placeholder, displayKey, valueKey, required = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredOptions = options.filter(option =>
    option[displayKey]?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedOption = options.find(opt => opt[valueKey] === value);

  return (
    <div ref={dropdownRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition text-left flex items-center justify-between bg-white"
      >
        <span className={selectedOption ? 'text-gray-900' : 'text-gray-500'}>
          {selectedOption ? selectedOption[displayKey] : placeholder}
        </span>
        <ChevronDown size={20} className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-2 bg-white border border-gray-300 rounded-lg shadow-lg max-h-80 overflow-hidden">
          <div className="p-3 border-b border-gray-200">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                autoFocus
              />
            </div>
          </div>
          <div className="overflow-y-auto max-h-60">
            {!required && (
              <button
                type="button"
                onClick={() => {
                  onChange('');
                  setIsOpen(false);
                  setSearchTerm('');
                }}
                className="w-full px-4 py-2 text-left hover:bg-gray-50 transition text-gray-500 italic text-sm"
              >
                -- None --
              </button>
            )}
            {filteredOptions.length === 0 ? (
              <div className="px-4 py-6 text-center text-gray-500 text-sm">
                No results found
              </div>
            ) : (
              filteredOptions.map((option) => (
                <button
                  key={option[valueKey]}
                  type="button"
                  onClick={() => {
                    onChange(option[valueKey]);
                    setIsOpen(false);
                    setSearchTerm('');
                  }}
                  className={`w-full px-4 py-2 text-left hover:bg-blue-50 transition text-sm ${value === option[valueKey] ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-900'
                    }`}
                >
                  {option[displayKey]}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const BranchCompanyManagement = () => {
  const [branches, setBranches] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingBranch, setEditingBranch] = useState(null);
  const [activeTab, setActiveTab] = useState('branches');
  const [companyMode, setCompanyMode] = useState('new');
  const [allCompanies, setAllCompanies] = useState([]);
  const [showCompanyViewModal, setShowCompanyViewModal] = useState(false);
  const [viewingCompany, setViewingCompany] = useState(null);
  const [companyBranchSearch, setCompanyBranchSearch] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [editingCompany, setEditingCompany] = useState(null);
  const [showCompanyEditModal, setShowCompanyEditModal] = useState(false);
  const [showBranchViewModal, setShowBranchViewModal] = useState(false);
  const [viewingBranch, setViewingBranch] = useState(null);

  const [formData, setFormData] = useState({
    branchCode: '',
    branchName: '',
    branchAddress: '',
    branchCity: '',
    branchProvince: '',
    area: '',
    region: '',
    tin: '',
    companyName: '',
    companyTin: '',
    companyAddress: '',
    companyCity: '',
    companyProvince: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setActionLoading(true);
    setLoadingMessage('Loading data...');

    try {
      const [branchesResult, companiesResult] = await Promise.all([
        api.get('/branches'),
        api.get('/companies'),
      ]);

      if (branchesResult.success) {
        setBranches(branchesResult.data);
      } else {
        setBranches([]);
      }

      if (companiesResult.success) {
        setCompanies(companiesResult.data);
        setAllCompanies(companiesResult.data);
      } else {
        setCompanies([]);
        setAllCompanies([]);
      }
    } catch (error) {
      toast.error('Failed to load data');
      console.error(error);
    } finally {
      setActionLoading(false);
    }
  };


  const handleCompanyModeChange = (mode) => {
    setCompanyMode(mode);
    if (mode === 'existing') {
      setFormData(prev => ({
        ...prev,
        companyName: '',
        companyTin: '',
        companyAddress: '',
        companyCity: '',
        companyProvince: '',
      }));
    } else if (mode === 'new') {
      setFormData(prev => ({
        ...prev,
        existingCompanyId: '',
      }));
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
      setShowCompanyViewModal(true);
    } else {
      setViewingCompany(company);
      setShowCompanyViewModal(true);
    }
  };


  const handleEditCompany = (company) => {
    setActionLoading(true);
    setLoadingMessage('Loading company details...');
    try {
      setShowCompanyViewModal(false);
      setEditingCompany(company);

      if (company.branches && company.branches.length > 0) {
        const firstBranch = company.branches[0];
        setEditingBranch(firstBranch);

        setFormData({
          branchCode: firstBranch.branchCode || '',
          branchName: firstBranch.branchName || '',
          branchAddress: firstBranch.address || '',
          branchCity: firstBranch.city || '',
          branchProvince: firstBranch.province || '',
          area: firstBranch.area || '',
          region: firstBranch.region || '',
          tin: firstBranch.tin || '',
          companyName: company.companyName || '',
          companyTin: company.tin || '',
          companyAddress: company.address || '',
          companyCity: company.city || '',
          companyProvince: company.province || '',
          existingCompanyId: company.id || '',
        });

        setCompanyMode('edit-company-only');
      } else {
        setEditingBranch({
          id: 'company-only-edit',
          branchCode: 'COMPANY-ONLY',
          branchName: 'COMPANY Only'
        });

        setFormData({
          branchCode: '',
          branchName: '',
          branchAddress: '',
          branchCity: '',
          branchProvince: '',
          area: '',
          region: '',
          tin: '',
          companyName: company.companyName || '',
          companyAddress: company.address || '',
          companyCity: company.city || '',
          companyProvince: company.province || '',
          existingCompanyId: company.id || '',
        });
        setCompanyMode('edit-company-only');
      }
      setShowModal(true);
    } catch (error) {
      toast.error('Failed to load company details');
      console.error(error);
    } finally {
      setActionLoading(false);
    }
  };


  const handleViewBranch = async (branch) => {
    setActionLoading(true);
    setLoadingMessage('Loading branch details...');
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
    } finally {
      setActionLoading(false);
    }
  };


  const handleExistingCompanyChange = (companyId) => {
    setFormData(prev => ({ ...prev, existingCompanyId: companyId }));

    if (companyId) {
      const selectedCompany = allCompanies.find(c => c.id === companyId);
      if (selectedCompany) {
        setFormData(prev => ({
          ...prev,
          companyName: selectedCompany.companyName,
          companyTin: selectedCompany.tin || '',
          companyAddress: selectedCompany.address || '',
          companyCity: selectedCompany.city || '',
          companyProvince: selectedCompany.province || '',
        }));
      }
    }
  };


  const availableCompanies = Array.isArray(allCompanies) ? allCompanies.map(c => {
    const branchCount = c.branches ? c.branches.length : 0;
    return {
      id: c.id,
      displayName: `${c.companyName} (TIN: ${c.tin}) - ${branchCount} branch(es)`,
      branchCount: branchCount
    };
  }) : [];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };




  const handleSubmit = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    setLoadingMessage(companyMode === 'edit-company-only'
      ? 'Updating company...'
      : editingBranch
        ? 'Updating...'
        : 'Creating...');


    if (companyMode === 'edit-company-only') {
      const missingFields = [];
      if (!formData.companyName?.trim()) missingFields.push('Company Name');
      if (!formData.companyAddress?.trim()) missingFields.push('Company Address');
      if (!formData.companyCity?.trim()) missingFields.push('Company City');
      if (!formData.companyProvince?.trim()) missingFields.push('Company Province');

      if (missingFields.length > 0) {
        toast.error(`Please fill in: ${missingFields.join(', ')}`);
        setActionLoading(false);
        return;
      }

      if (!formData.existingCompanyId) {
        toast.error('Company ID is missing. Please try again.');
        setActionLoading(false);
        return;
      }

      try {
        setLoadingMessage('Updating company...');

        const companyPayload = {
          companyName: formData.companyName.trim(),
          tin: formData.companyTin?.trim() || null,
          address: formData.companyAddress.trim(),
          city: formData.companyCity.trim(),
          province: formData.companyProvince.trim()
        };

        console.log('Updating company ID:', formData.existingCompanyId);
        console.log('Company payload:', companyPayload);

        const result = await api.put(`/companies/${formData.existingCompanyId}`, companyPayload);

        if (result.success) {
          toast.success('Company updated successfully');
          setShowModal(false);
          resetForm();
          await loadData();
        } else {
          toast.error(result.error || 'Failed to update company');
        }
      } catch (error) {
        console.error('Company update error:', error);
        toast.error(error.message || 'Failed to update company');
      } finally {
        setActionLoading(false);
      }
      return;
    }



    const missingBranchFields = [];
    if (!formData.branchCode?.trim()) missingBranchFields.push('Branch Code');
    if (!formData.branchName?.trim()) missingBranchFields.push('Branch Name');
    if (!formData.tin?.trim()) missingBranchFields.push('TIN');
    if (!formData.branchAddress?.trim()) missingBranchFields.push('Branch Address');
    if (!formData.branchCity?.trim()) missingBranchFields.push('City');
    if (!formData.branchProvince?.trim()) missingBranchFields.push('Province');
    if (!formData.area?.trim()) missingBranchFields.push('Area');
    if (!formData.region?.trim()) missingBranchFields.push('Region');

    if (missingBranchFields.length > 0) {
      toast.error(`Please fill in: ${missingBranchFields.join(', ')}`);
      setActionLoading(false);
      return;
    }

    if (companyMode === 'new') {
      const missingCompanyFields = [];
      if (!formData.companyName?.trim()) missingCompanyFields.push('Company Name');
      if (!formData.companyAddress?.trim()) missingCompanyFields.push('Company Address');
      if (!formData.companyCity?.trim()) missingCompanyFields.push('Company City');
      if (!formData.companyProvince?.trim()) missingCompanyFields.push('Company Province');

      if (missingCompanyFields.length > 0) {
        toast.error(`Please fill in: ${missingCompanyFields.join(', ')}`);
        setActionLoading(false);
        return;
      }
    } else if (companyMode === 'existing') {
      if (!formData.existingCompanyId) {
        toast.error('Please select an existing company');
        setActionLoading(false);
        return;
      }
    }

    try {
      setLoadingMessage(editingBranch ? 'Updating...' : 'Creating...');

      // Base branch payload
      const payload = {
        branchCode: formData.branchCode.trim(),
        branchName: formData.branchName.trim(),
        tin: formData.tin.trim(),
        address: formData.branchAddress.trim(),
        city: formData.branchCity.trim(),
        province: formData.branchProvince.trim(),
        area: formData.area.trim(),
        region: formData.region.trim(),
      };

      let result;


      if (editingBranch && editingBranch.id !== 'company-only-edit') {
        if (companyMode === 'view') {
          console.log('📤 Updating branch only. Payload:', payload);
          console.log('📤 Branch TIN:', payload.tin);
          result = await api.put(`/branches/${editingBranch.id}`, payload);
        } else if (companyMode === 'edit') {
          payload.useExistingCompany = false;
          payload.companyName = formData.companyName.trim();
          payload.companyTin = formData.companyTin?.trim() || null;
          payload.companyAddress = formData.companyAddress.trim();
          payload.companyCity = formData.companyCity.trim();
          payload.companyProvince = formData.companyProvince.trim();
          result = await api.put(`/branches/${editingBranch.id}/with-company`, payload);
        }
      }

      else {
        if (companyMode === 'existing') {
          payload.useExistingCompany = true;
          payload.existingCompanyId = formData.existingCompanyId;
        } else {
          payload.useExistingCompany = false;
          payload.companyName = formData.companyName.trim();
          payload.companyTin = formData.companyTin?.trim() || null;
          payload.companyAddress = formData.companyAddress.trim();
          payload.companyCity = formData.companyCity.trim();
          payload.companyProvince = formData.companyProvince.trim();
        }

        result = await api.post('/branches/with-company', payload);
      }

      if (result.success) {
        toast.success(
          editingBranch
            ? (companyMode === 'edit' ? 'Branch and Company updated' : 'Branch updated')
            : 'Branch and Company created'
        );
        setShowModal(false);
        resetForm();
        await loadData();
      } else {
        toast.error(result.error || 'Failed to save');
      }
    } catch (error) {
      console.error('Submission error:', error);
      toast.error(error.message || 'Failed to save');
    } finally {
      setActionLoading(false);
    }
  };




  const handleEdit = async (branch) => {
    setEditingBranch(branch);
    setActionLoading(true);
    setLoadingMessage('Loading branch details...');

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

      setFormData({
        branchCode: branch.branchCode || '',
        branchName: branch.branchName || '',
        branchAddress: branch.address || branch.branchAddress || '',
        branchCity: branch.city || branch.branchCity || '',
        branchProvince: branch.province || branch.branchProvince || '',
        area: branch.area || '',
        region: branch.region || '',
        tin: branch.tin || '',
        companyName: companyData?.companyName || '',
        companyTin: companyData?.tin || '',
        companyAddress: companyData?.address || '',
        companyCity: companyData?.city || '',
        companyProvince: companyData?.province || '',
        existingCompanyId: companyData?.id || '',
      });


      if (activeTab === 'branches') {
        setCompanyMode('view');
      } else {
        setCompanyMode('edit');
      }

      setEditingCompany(companyData);
      setShowModal(true);
    } catch (error) {
      toast.error('Failed to load branch and company data');
      console.error(error);
    } finally {
      setActionLoading(false);
    }
  };



  const handleEditCompanyFromView = (company, branch) => {
    setActionLoading(true);
    setLoadingMessage('Loading details...');
    try {
      setEditingBranch(branch);
      setEditingCompany(company);

      setFormData({
        branchCode: branch.branchCode || '',
        branchName: branch.branchName || '',
        branchAddress: branch.address || '',
        branchCity: branch.city || '',
        branchProvince: branch.province || '',
        area: branch.area || '',
        region: branch.region || '',
        tin: branch.tin || '',
        companyName: company.companyName || '',
        companyTin: company.tin || '',
        companyAddress: company.address || '',
        companyCity: company.city || '',
        companyProvince: company.province || '',
        existingCompanyId: company.id || '',
      });

      setCompanyMode('edit');
      setShowCompanyViewModal(false);
      setShowModal(true);
    } catch (error) {
      toast.error('Failed to load details');
      console.error(error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this branch and its associated company?')) return;

    setActionLoading(true);
    setLoadingMessage('Deleting branch...');

    try {
      const result = await api.delete(`/branches/${id}`);

      if (result.success) {
        toast.success('Branch and Company deleted successfully');
        await loadData();
        if (currentItems.length === 1 && currentPage > 1) {
          setCurrentPage(currentPage - 1);
        }
      } else {
        toast.error(result.message || 'Cannot delete branch. It may have associated sales records.');
      }
    } catch (error) {
      console.error('Delete error:', error);

      if (error.message.includes('has associated sales')) {
        toast.error('Cannot delete branch: It has associated sales records');
      } else if (error.message.includes('constraint')) {
        toast.error('Cannot delete branch: It has associated data (sales, deliveries, etc.)');
      } else {
        toast.error(error.message || 'Failed to delete branch');
      }
    } finally {
      setActionLoading(false);
    }
  };



  const handleDeleteCompany = async (companyId) => {
    const company = companies.find(c => c.id === companyId);
    const branchCount = company?.branches?.length || 0;

    if (branchCount > 0) {
      toast.error(`Cannot delete company: This company has ${branchCount} associated branch(es). Please delete or reassign the branches first.`, {
        duration: 5000
      });
      return;
    }

    if (!window.confirm('Are you sure you want to delete this company?')) return;

    setActionLoading(true);
    setLoadingMessage('Deleting company...');

    try {
      const result = await api.delete(`/companies/${companyId}`);

      if (result.success) {
        toast.success('Company deleted successfully');
        await loadData();
        if (currentItems.length === 1 && currentPage > 1) {
          setCurrentPage(currentPage - 1);
        }
      } else {
        toast.error(result.message || 'Cannot delete company');
      }
    } catch (error) {
      console.error('Delete error:', error);
      if (error.message.includes('associated branch')) {
        toast.error(error.message, { duration: 5000 });
      } else {
        toast.error(error.message || 'Failed to delete company');
      }
    } finally {
      setActionLoading(false);
    }
  };




  const resetForm = () => {
    setFormData({
      branchCode: '',
      branchName: '',
      branchAddress: '',
      branchCity: '',
      branchProvince: '',
      area: '',
      region: '',
      tin: '',
      existingCompanyId: '',
      companyName: '',
      companyTin: '',
      companyAddress: '',
      companyCity: '',
      companyProvince: '',
    });
    setEditingBranch(null);
    setEditingCompany(null);
    setCompanyMode('new');
  };



  const filteredBranches = branches.filter(branch =>
    branch.branchCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    branch.branchName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    branch.city?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredCompanies = companies.filter(company =>
    company.companyName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    company.tin?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    company.branch?.branchName?.toLowerCase().includes(searchTerm.toLowerCase())
  );


  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;

  const currentBranches = filteredBranches.slice(indexOfFirstItem, indexOfLastItem);
  const currentCompanies = filteredCompanies.slice(indexOfFirstItem, indexOfLastItem);

  const totalPagesBranches = Math.ceil(filteredBranches.length / itemsPerPage);
  const totalPagesCompanies = Math.ceil(filteredCompanies.length / itemsPerPage);

  const totalPages = activeTab === 'branches' ? totalPagesBranches : totalPagesCompanies;
  const currentItems = activeTab === 'branches' ? currentBranches : currentCompanies;
  const totalItems = activeTab === 'branches' ? filteredBranches.length : filteredCompanies.length;
  const paginate = (pageNumber) => setCurrentPage(pageNumber);
  const nextPage = () => setCurrentPage(prev => Math.min(prev + 1, totalPages));
  const prevPage = () => setCurrentPage(prev => Math.max(prev - 1, 1));

  const getPageNumbers = () => {
    const pageNumbers = [];
    const maxVisiblePages = 5;

    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pageNumbers.push(i);
      }
    } else {
      const startPage = Math.max(1, currentPage - 2);
      const endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

      for (let i = startPage; i <= endPage; i++) {
        pageNumbers.push(i);
      }
    }

    return pageNumbers;
  };
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab]);



  return (
    <div className="p-6 max-w-7xl mx-auto">
      <Toaster position="top-right" />
      <LoadingOverlay show={actionLoading} message={loadingMessage} />

      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Branch & Company Management</h1>
        <p className="text-gray-600 mt-1">Manage branches and their associated companies</p>
      </div>

      <div className="mb-6 border-b border-gray-200">
        <nav className="flex gap-8">
          <button
            onClick={() => setActiveTab('branches')}
            className={`pb-4 px-1 border-b-2 font-medium text-sm transition ${activeTab === 'branches'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
          >
            <div className="flex items-center gap-2">
              <Building2 size={18} />
              Branches ({branches.length})
            </div>
          </button>
          <button
            onClick={() => setActiveTab('companies')}
            className={`pb-4 px-1 border-b-2 font-medium text-sm transition ${activeTab === 'companies'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
          >
            <div className="flex items-center gap-2">
              <Users size={18} />
              Companies ({companies.length})
            </div>
          </button>
        </nav>
      </div>

      {/* Actions Bar */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder={activeTab === 'branches' ? "Search by code, name, or city..." : "Search by company name, TIN, or branch..."}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          <Plus size={20} />
          Add Branch & Company
        </button>
      </div>

      {/* Content based on active tab */}
      {activeTab === 'branches' ? (
        // Branches Table
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
                      <td className="px-6 py-4 text-sm text-gray-900">{branch.branchName}</td>
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
                            <div className="text-xs text-gray-500">Branch TIN: {branch.tin}</div>
                            {branch.company.tin && (
                              <div className="text-xs text-gray-500">Company TIN: {branch.company.tin}</div>
                            )}
                          </div>
                        ) : '-'}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleViewBranch(branch)}
                            className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition"
                            title="View details"
                          >
                            <Eye size={18} />
                          </button>
                          <button
                            onClick={() => handleEdit(branch)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                            title="Edit branch"
                          >
                            <Edit2 size={18} />
                          </button>
                          <button
                            onClick={() => handleDelete(branch.id)}
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
            <div className="px-6 py-4 border-t border-gray-200 bg-white flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-sm text-gray-700">
                Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, filteredBranches.length)} of {filteredBranches.length} results
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={prevPage}
                  disabled={currentPage === 1}
                  className={`p-2 rounded-lg border ${currentPage === 1
                    ? 'text-gray-400 cursor-not-allowed border-gray-200'
                    : 'text-gray-700 hover:bg-gray-50 border-gray-300'
                    }`}
                >
                  <ChevronLeft size={16} />
                </button>
                <div className="flex items-center gap-1">
                  {getPageNumbers().map((number) => (
                    <button
                      key={number}
                      onClick={() => paginate(number)}
                      className={`min-w-[40px] px-3 py-2 text-sm rounded-lg border ${currentPage === number
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'text-gray-700 hover:bg-gray-50 border-gray-300'
                        }`}
                    >
                      {number}
                    </button>
                  ))}
                </div>

                {/* Next button */}
                <button
                  onClick={nextPage}
                  disabled={currentPage === totalPagesBranches}
                  className={`p-2 rounded-lg border ${currentPage === totalPagesBranches
                    ? 'text-gray-400 cursor-not-allowed border-gray-200'
                    : 'text-gray-700 hover:bg-gray-50 border-gray-300'
                    }`}
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Company Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">TIN</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Location</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Branch</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {currentCompanies.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-8 text-center text-gray-500">
                      {filteredCompanies.length === 0 ? 'No Companies found' : 'No companies on this page'}
                    </td>
                  </tr>
                ) : (
                  currentCompanies.map((company) => (
                    <tr key={company.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-green-100 rounded-lg">
                            <Users size={20} className="text-green-600" />
                          </div>
                          <span className="font-medium text-gray-900">{company.companyName}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">{company.tin}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        <div>{company.city}, {company.province}</div>
                        <div className="text-xs text-gray-500">{company.address}</div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {company.branches && company.branches.length > 0 ? (
                          <div>
                            <div className="font-medium">{company.branches.length} Branch(es)</div>
                            <div className="text-xs text-gray-500">
                              {company.branches.slice(0, 2).map(b => b.branchName).join(', ')}
                              {company.branches.length > 2 && '...'}
                            </div>
                          </div>
                        ) : (
                          <span className="text-gray-400 italic">No branches</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleViewCompany(company)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                            title="View company details"
                          >
                            <Eye size={18} />
                          </button>
                          <button
                            onClick={() => handleEditCompany(company)}
                            className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition"
                            title="Edit company"
                          >
                            <Edit2 size={18} />
                          </button>
                          <button
                            onClick={() => handleDeleteCompany(company.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                            title="Delete company"
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


          {filteredCompanies.length > 0 && (
            <div className="px-6 py-4 border-t border-gray-200 bg-white flex flex-col sm:flex-row items-center justify-between gap-4">
              {/* Results count */}
              <div className="text-sm text-gray-700">
                Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, filteredCompanies.length)} of {filteredCompanies.length} results
              </div>

              {/* Pagination controls */}
              <div className="flex items-center gap-2">
                {/* Previous button */}
                <button
                  onClick={prevPage}
                  disabled={currentPage === 1}
                  className={`p-2 rounded-lg border ${currentPage === 1
                    ? 'text-gray-400 cursor-not-allowed border-gray-200'
                    : 'text-gray-700 hover:bg-gray-50 border-gray-300'
                    }`}
                >
                  <ChevronLeft size={16} />
                </button>

                {/* Page numbers */}
                <div className="flex items-center gap-1">
                  {getPageNumbers().map((number) => (
                    <button
                      key={number}
                      onClick={() => paginate(number)}
                      className={`min-w-[40px] px-3 py-2 text-sm rounded-lg border ${currentPage === number
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'text-gray-700 hover:bg-gray-50 border-gray-300'
                        }`}
                    >
                      {number}
                    </button>
                  ))}
                </div>

                {/* Next button */}
                <button
                  onClick={nextPage}
                  disabled={currentPage === totalPagesCompanies}
                  className={`p-2 rounded-lg border ${currentPage === totalPagesCompanies
                    ? 'text-gray-400 cursor-not-allowed border-gray-200'
                    : 'text-gray-700 hover:bg-gray-50 border-gray-300'
                    }`}
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Branch View Modal */}
      {showBranchViewModal && viewingBranch && (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">
                Branch Details
              </h2>
              <button
                onClick={() => {
                  setShowBranchViewModal(false);
                  setViewingBranch(null);
                }}
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
                    <p className="text-gray-900 font-medium">{viewingBranch.branchCode}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">Branch Name</label>
                    <p className="text-gray-900 font-medium">{viewingBranch.branchName}</p>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-500 mb-1">Address</label>
                    <p className="text-gray-900">{viewingBranch.address || 'No address provided'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">City</label>
                    <p className="text-gray-900">{viewingBranch.city || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">Province</label>
                    <p className="text-gray-900">{viewingBranch.province || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">Area</label>
                    <p className="text-gray-900">{viewingBranch.area || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">Region</label>
                    <p className="text-gray-900">{viewingBranch.region || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">Branch TIN</label>
                    <p className="text-gray-900">{viewingBranch.tin || 'N/A'}</p>
                  </div>
                </div>
              </div>

              {/* Company Information */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Users size={20} />
                  Company Information
                </h3>
                {viewingBranch.company ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-blue-50 p-4 rounded-lg border border-blue-200">
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-1">Company Name</label>
                      <p className="text-gray-900 font-medium">{viewingBranch.company.companyName || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-1">TIN</label>
                      <p className="text-gray-900">{viewingBranch.company.tin || 'N/A'}</p>
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-500 mb-1">Address</label>
                      <p className="text-gray-900">{viewingBranch.company.address || 'No address provided'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-1">City</label>
                      <p className="text-gray-900">{viewingBranch.company.city || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-1">Province</label>
                      <p className="text-gray-900">{viewingBranch.company.province || 'N/A'}</p>
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
                onClick={() => {
                  setShowBranchViewModal(false);
                  handleEdit(viewingBranch);
                }}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center justify-center gap-2"
              >
                <Edit2 size={16} />
                Edit Branch
              </button>
              <button
                onClick={() => {
                  setShowBranchViewModal(false);
                  setViewingBranch(null);
                }}
                className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {showCompanyViewModal && viewingCompany && (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">
                Company Details
              </h2>
              <button
                onClick={() => {
                  setShowCompanyViewModal(false);
                  setViewingCompany(null);
                  setCompanyBranchSearch('');
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Users size={20} />
                  Company Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">Company Name</label>
                    <p className="text-gray-900 font-medium">{viewingCompany.companyName}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">TIN</label>
                    <p className="text-gray-900">{viewingCompany.tin}</p>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-500 mb-1">Address</label>
                    <p className="text-gray-900">{viewingCompany.address}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">City</label>
                    <p className="text-gray-900">{viewingCompany.city}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">Province</label>
                    <p className="text-gray-900">{viewingCompany.province}</p>
                  </div>
                </div>
              </div>

              {/* Branches List */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <Building2 size={20} />
                    Branches ({viewingCompany.branches?.length || 0})
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

                {viewingCompany.branches && viewingCompany.branches.length > 0 ? (
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
                        {viewingCompany.branches
                          .filter(branch =>
                            branch.branchCode?.toLowerCase().includes(companyBranchSearch.toLowerCase()) ||
                            branch.branchName?.toLowerCase().includes(companyBranchSearch.toLowerCase())
                          )
                          .map((branch) => (
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
                                  {(() => {
                                    const addressParts = [
                                      branch.address || branch.branchAddress,
                                      branch.city,
                                      branch.province,
                                      branch.area,
                                      branch.region
                                    ].filter(part => part && part.toString().trim() !== '');

                                    if (addressParts.length > 0) {
                                      return <div>{addressParts.join(', ')}</div>;
                                    } else {
                                      return <div className="text-gray-400 italic">No address provided</div>;
                                    }
                                  })()}
                                </div>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
                    No branches found for this company
                  </div>
                )}
              </div>
            </div>


            <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4">
              <button
                onClick={() => {
                  setShowCompanyViewModal(false);
                  setViewingCompany(null);
                  setCompanyBranchSearch('');
                }}
                className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">
                {companyMode === 'edit-company-only' ? 'Edit Company' : editingBranch ? 'Edit Branch & Company' : 'Add New Branch & Company'}
              </h2>
              <button
                onClick={() => {
                  setShowModal(false);
                  resetForm();
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Branch Information - Only show when NOT editing company-only */}
              {companyMode !== 'edit-company-only' && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Building2 size={20} />
                    Branch Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Branch Code <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="branchCode"
                        value={formData.branchCode}
                        onChange={handleInputChange}
                        required={companyMode !== 'edit-company-only'}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Enter branch code"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Branch Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="branchName"
                        value={formData.branchName}
                        onChange={handleInputChange}
                        required={companyMode !== 'edit-company-only'}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Enter branch name"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Address <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="branchAddress"
                        value={formData.branchAddress}
                        onChange={handleInputChange}
                        required={companyMode !== 'edit-company-only'}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Enter street address"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        City <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="branchCity"
                        value={formData.branchCity}
                        onChange={handleInputChange}
                        required={companyMode !== 'edit-company-only'}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Enter city"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Province <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="branchProvince"
                        value={formData.branchProvince}
                        onChange={handleInputChange}
                        required={companyMode !== 'edit-company-only'}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Enter province"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Area <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="area"
                        value={formData.area}
                        onChange={handleInputChange}
                        required={companyMode !== 'edit-company-only'}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Enter area"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Region <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="region"
                        value={formData.region}
                        onChange={handleInputChange}
                        required={companyMode !== 'edit-company-only'}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Enter region"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Branch TIN <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="tin"
                        value={formData.tin}
                        onChange={handleInputChange}
                        required={companyMode !== 'edit-company-only'}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Enter Branch TIN"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* company Information */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Users size={20} />
                  Company Information
                  {companyMode === 'view' && (
                    <span className="text-sm font-normal text-blue-600">(Read-Only)</span>
                  )}
                </h3>

                {/* Show radio buttons only when creating new branch (not editing) */}
                {!editingBranch && companyMode !== 'edit-company-only' && (
                  <div className="mb-4 flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="companyMode"
                        value="new"
                        checked={companyMode === 'new'}
                        onChange={() => handleCompanyModeChange('new')}
                        className="w-4 h-4 text-blue-600"
                      />
                      <span className="text-sm font-medium text-gray-700">Create New Company</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="companyMode"
                        value="existing"
                        checked={companyMode === 'existing'}
                        onChange={() => handleCompanyModeChange('existing')}
                        className="w-4 h-4 text-blue-600"
                      />
                      <span className="text-sm font-medium text-gray-700">Use Existing Company</span>
                    </label>
                  </div>
                )}

                {/* Info messages */}
                {companyMode === 'view' && editingBranch && editingCompany && (
                  <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-800">
                      ℹ️ Editing branch only. Company information is displayed below (read-only).
                      To edit company details, go to the Companies tab.
                    </p>
                  </div>
                )}

                {companyMode === 'edit-company-only' && editingCompany && (
                  <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-sm text-green-800">
                      ✏️ You are editing company <strong>{editingCompany.companyName}</strong>.
                      Only company information can be updated.
                    </p>
                  </div>
                )}

                {/* Existing company Dropdown */}
                {companyMode === 'existing' && !editingBranch && (
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Select Existing Company <span className="text-red-500">*</span>
                    </label>
                    <SearchableDropdown
                      options={availableCompanies}
                      value={formData.existingCompanyId}
                      onChange={handleExistingCompanyChange}
                      placeholder="Select a company"
                      displayKey="displayName"
                      valueKey="id"
                      required={companyMode === 'existing'}
                    />
                  </div>
                )}

                {/* Show company fields when needed */}
                {(companyMode === 'new' || companyMode === 'edit' || companyMode === 'edit-company-only' ||
                  (companyMode === 'existing' && formData.existingCompanyId) ||
                  (companyMode === 'view' && formData.companyName)) && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Company Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          name="companyName"
                          value={formData.companyName}
                          onChange={handleInputChange}
                          required={companyMode !== 'view'}
                          disabled={companyMode === 'view'}
                          className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${companyMode === 'view' ? 'bg-gray-100 cursor-not-allowed' : ''
                            }`}
                          placeholder="Enter company name"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Company TIN (Optional)
                        </label>
                        <input
                          type="text"
                          name="companyTin"
                          value={formData.companyTin}
                          onChange={handleInputChange}
                          disabled={companyMode === 'view'}
                          className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${companyMode === 'view' ? 'bg-gray-100 cursor-not-allowed' : ''
                            }`}
                          placeholder="Enter company TIN (optional)"
                        />
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Address <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          name="companyAddress"
                          value={formData.companyAddress}
                          onChange={handleInputChange}
                          required={companyMode !== 'view'}
                          disabled={companyMode === 'view'}
                          className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${companyMode === 'view' ? 'bg-gray-100 cursor-not-allowed' : ''
                            }`}
                          placeholder="Enter company address"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          City <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          name="companyCity"
                          value={formData.companyCity}
                          onChange={handleInputChange}
                          required={companyMode !== 'view'}
                          disabled={companyMode === 'view'}
                          className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${companyMode === 'view' ? 'bg-gray-100 cursor-not-allowed' : ''
                            }`}
                          placeholder="Enter city"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Province <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          name="companyProvince"
                          value={formData.companyProvince}
                          onChange={handleInputChange}
                          required={companyMode !== 'view'}
                          disabled={companyMode === 'view'}
                          className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${companyMode === 'view' ? 'bg-gray-100 cursor-not-allowed' : ''
                            }`}
                          placeholder="Enter province"
                        />
                      </div>
                    </div>
                  )}
              </div>

              {/* Submit Buttons */}
              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                  {companyMode === 'edit-company-only'
                    ? 'Update Company'
                    : editingBranch
                      ? (companyMode === 'edit' ? 'Update Branch & Company' : 'Update Branch')
                      : 'Create Branch & Company'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default BranchCompanyManagement;