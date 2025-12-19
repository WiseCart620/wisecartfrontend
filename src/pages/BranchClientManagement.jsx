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
                  className={`w-full px-4 py-2 text-left hover:bg-blue-50 transition text-sm ${
                    value === option[valueKey] ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-900'
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

const BranchClientManagement = () => {
  const [branches, setBranches] = useState([]);
  const [clients, setClients] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingBranch, setEditingBranch] = useState(null);
  const [activeTab, setActiveTab] = useState('branches');
  const [clientMode, setClientMode] = useState('new');
  const [allClients, setAllClients] = useState([]);
  const [showClientViewModal, setShowClientViewModal] = useState(false);
  const [viewingClient, setViewingClient] = useState(null);
  const [clientBranchSearch, setClientBranchSearch] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');   
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [editingClient, setEditingClient] = useState(null);
  const [showClientEditModal, setShowClientEditModal] = useState(false);
  const [showBranchViewModal, setShowBranchViewModal] = useState(false);
  const [viewingBranch, setViewingBranch] = useState(null);

  const [formData, setFormData] = useState({
    // Branch fields
    branchCode: '',
    branchName: '',
    branchAddress: '',
    branchCity: '',
    branchProvince: '',
    area: '',
    region: '',
    // Client fields
    clientName: '',
    tin: '',
    clientAddress: '',
    clientCity: '',
    clientProvince: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
  setActionLoading(true);
  setLoadingMessage('Loading data...');
  
  try {
    const [branchesResult, clientsResult] = await Promise.all([
      api.get('/branches'),
      api.get('/clients'),
    ]);
    
    if (branchesResult.success) {
      setBranches(branchesResult.data);
    } else {
      setBranches([]);
    }
    
    if (clientsResult.success) {
      setClients(clientsResult.data);
      setAllClients(clientsResult.data);
    } else {
      setClients([]);
      setAllClients([]);
    }
  } catch (error) {
    toast.error('Failed to load data');
    console.error(error);
  } finally {
    setActionLoading(false);
  }
};


const handleClientModeChange = (mode) => {
  setClientMode(mode);
  if (mode === 'existing') {
    setFormData(prev => ({
      ...prev,
      clientName: '',
      tin: '',
      clientAddress: '',
      clientCity: '',
      clientProvince: '',
    }));
  } else if (mode === 'new') {
    setFormData(prev => ({
      ...prev,
      existingClientId: '',
    }));
  }
};


const handleViewClient = (client) => {
  if (client.branches && client.branches.length > 0) {
    const enrichedBranches = client.branches.map(branch => {
      const fullBranch = branches.find(b => b.id === branch.id);
      return fullBranch || branch;
    });
    
    const clientWithFullBranches = {
      ...client,
      branches: enrichedBranches
    };
    
    setViewingClient(clientWithFullBranches);
    setShowClientViewModal(true);
  } else {
    setViewingClient(client);
    setShowClientViewModal(true);
  }
};


const handleEditClient = (client) => {
  setActionLoading(true);
  setLoadingMessage('Loading client details...');
    try {
    setShowClientViewModal(false);
    setEditingClient(client);
  
  if (client.branches && client.branches.length > 0) {
    const firstBranch = client.branches[0];
    setEditingBranch(firstBranch);
    
    setFormData({
      branchCode: firstBranch.branchCode || '',
      branchName: firstBranch.branchName || '',
      branchAddress: firstBranch.address || '',
      branchCity: firstBranch.city || '',
      branchProvince: firstBranch.province || '',
      area: firstBranch.area || '',
      region: firstBranch.region || '',
      clientName: client.clientName || '',
      tin: client.tin || '',
      clientAddress: client.address || '',
      clientCity: client.city || '',
      clientProvince: client.province || '',
      existingClientId: client.id || '',
    });
    
    setClientMode('edit-client-only');
  } else {
    setEditingBranch({ 
      id: 'client-only-edit',
      branchCode: 'CLIENT-ONLY',
      branchName: 'Client Only'
    });
    
    setFormData({
      branchCode: '',
      branchName: '',
      branchAddress: '',
      branchCity: '',
      branchProvince: '',
      area: '',
      region: '',
      clientName: client.clientName || '',
      tin: client.tin || '',
      clientAddress: client.address || '',
      clientCity: client.city || '',
      clientProvince: client.province || '',
      existingClientId: client.id || '',
    });
    setClientMode('edit-client-only');
  }
  setShowModal(true);
} catch (error) {
    toast.error('Failed to load client details');
    console.error(error);
  } finally {
    setActionLoading(false);
  }
};


const handleViewBranch = async (branch) => {
  setActionLoading(true);
  setLoadingMessage('Loading branch details...');
  try {
    let clientData = null;
    
    if (branch.client) {
      clientData = branch.client;
    } else {
      const response = await api.get(`/clients/by-branch-id/${branch.id}`);
      if (response.success) {
        clientData = response.data;
      }
    }
    
    setViewingBranch({
      ...branch,
      address: branch.address || branch.branchAddress,
      city: branch.city || branch.branchCity,
      province: branch.province || branch.branchProvince,
      client: clientData
    });
    setShowBranchViewModal(true);
  } catch (error) {
    toast.error('Failed to load branch details');
    console.error(error);
  } finally {
    setActionLoading(false);
  }
};


const handleExistingClientChange = (clientId) => {
  setFormData(prev => ({ ...prev, existingClientId: clientId }));
  
  if (clientId) {
    const selectedClient = allClients.find(c => c.id === clientId);
    if (selectedClient) {
      setFormData(prev => ({
        ...prev,
        clientName: selectedClient.clientName,
        tin: selectedClient.tin,
        clientAddress: selectedClient.address || '',
        clientCity: selectedClient.city || '',
        clientProvince: selectedClient.province || '',
      }));
    }
  }
};


const availableClients = Array.isArray(allClients) ? allClients.map(c => {
  const branchCount = c.branches ? c.branches.length : 0;
  return {
    id: c.id,
    displayName: `${c.clientName} (TIN: ${c.tin}) - ${branchCount} branch(es)`,
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
  setLoadingMessage(clientMode === 'edit-client-only' 
    ? 'Updating client...' 
    : editingBranch 
      ? 'Updating...' 
      : 'Creating...');
  
  if (clientMode === 'edit-client-only') {
    if (!formData.clientName || !formData.tin || !formData.clientAddress || 
        !formData.clientCity || !formData.clientProvince) {
      toast.error('Please fill in all client fields');
      return;
    }
    
    try {
      setLoadingMessage('Updating client...');
      const result = await api.put(`/clients/${formData.existingClientId}`, {
        clientName: formData.clientName,
        tin: formData.tin,
        address: formData.clientAddress,
        city: formData.clientCity,
        province: formData.clientProvince,
      });
      
      if (result.success) {
        toast.success('Client updated successfully');
        setShowModal(false);
        resetForm();
        await loadData();
      }
    } catch (error) {
      toast.error(error.message || 'Failed to update client');
    } finally {
      setActionLoading(false);
    }
    return;
  }
  

  const missingFields = [];
  if (!formData.branchCode?.trim()) missingFields.push('Branch Code');
  if (!formData.branchName?.trim()) missingFields.push('Branch Name');
  if (!formData.branchAddress?.trim()) missingFields.push('Branch Address');
  if (!formData.branchCity?.trim()) missingFields.push('City');
  if (!formData.branchProvince?.trim()) missingFields.push('Province');
  if (!formData.area?.trim()) missingFields.push('Area');
  if (!formData.region?.trim()) missingFields.push('Region');
  
  if (missingFields.length > 0) {
    toast.error(`Please fill in: ${missingFields.join(', ')}`);
    console.error('Missing fields:', missingFields);
    return;
  }

  if (clientMode === 'new') {
    const missingClientFields = [];
    if (!formData.clientName?.trim()) missingClientFields.push('Client Name');
    if (!formData.tin?.trim()) missingClientFields.push('TIN');
    if (!formData.clientAddress?.trim()) missingClientFields.push('Client Address');
    if (!formData.clientCity?.trim()) missingClientFields.push('Client City');
    if (!formData.clientProvince?.trim()) missingClientFields.push('Client Province');
    
    if (missingClientFields.length > 0) {
      toast.error(`Please fill in: ${missingClientFields.join(', ')}`);
      console.error('Missing client fields:', missingClientFields);
      return;
    }
  } else if (clientMode === 'existing') {
    if (!formData.existingClientId) {
      toast.error('Please select an existing client');
      return;
    }
  }

  try {
    setLoadingMessage(editingBranch ? 'Updating...' : 'Creating...');
    const payload = {
      branchCode: formData.branchCode.trim(),
      branchName: formData.branchName.trim(),
      address: formData.branchAddress.trim(),
      city: formData.branchCity.trim(),
      province: formData.branchProvince.trim(),
      area: formData.area.trim(),
      region: formData.region.trim(),
    };
    

    let result;

    if (editingBranch && editingBranch.id !== 'client-only-edit') {
      if (clientMode === 'view') {
        result = await api.put(`/branches/${editingBranch.id}`, payload);
      } else if (clientMode === 'edit') {
        payload.useExistingClient = false;
        payload.clientName = formData.clientName.trim();
        payload.tin = formData.tin.trim();
        payload.clientAddress = formData.clientAddress.trim();
        payload.clientCity = formData.clientCity.trim();
        payload.clientProvince = formData.clientProvince.trim();
        result = await api.put(`/branches/${editingBranch.id}/with-client`, payload);
      }
    } else {
      // Creating new branch
      if (clientMode === 'existing') {
        payload.useExistingClient = true;
        payload.existingClientId = formData.existingClientId;
      } else {
        payload.useExistingClient = false;
        payload.clientName = formData.clientName.trim();
        payload.tin = formData.tin.trim();
        payload.clientAddress = formData.clientAddress.trim();
        payload.clientCity = formData.clientCity.trim();
        payload.clientProvince = formData.clientProvince.trim();
      }
      
      
      result = await api.post('/branches/with-client', payload);
    }

    if (result.success) {
      toast.success(
        editingBranch 
          ? (clientMode === 'edit' ? 'Branch and Client updated' : 'Branch updated')
          : 'Branch and Client created'
      );
      setShowModal(false);
      resetForm();
      await loadData();
    }
  } catch (error) {
    console.error('=== SUBMISSION ERROR ===', error);
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

    let clientData = null;
    
    if (branch.client) {
      clientData = branch.client;
    } else {
      const response = await api.get(`/clients/by-branch-id/${branch.id}`);
      if (response.success) {
        clientData = response.data;
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
      clientName: clientData?.clientName || '',
      tin: clientData?.tin || '',
      clientAddress: clientData?.address || '',
      clientCity: clientData?.city || '',
      clientProvince: clientData?.province || '',
      existingClientId: clientData?.id || '',
    });
    

    if (activeTab === 'branches') {
      setClientMode('view');
    } else {
      setClientMode('edit');
    }
    
    setEditingClient(clientData);
    setShowModal(true);
  } catch (error) {
    toast.error('Failed to load branch and client data');
    console.error(error);
  } finally {
    setActionLoading(false);
  }
};



const handleEditClientFromView = (client, branch) => {
  setActionLoading(true);
  setLoadingMessage('Loading details...');
  try {
    setEditingBranch(branch);
    setEditingClient(client);
  
  setFormData({
    branchCode: branch.branchCode || '',
    branchName: branch.branchName || '',
    branchAddress: branch.address || '',
    branchCity: branch.city || '',
    branchProvince: branch.province || '',
    area: branch.area || '',
    region: branch.region || '',
    clientName: client.clientName || '',
    tin: client.tin || '',
    clientAddress: client.address || '',
    clientCity: client.city || '',
    clientProvince: client.province || '',
    existingClientId: client.id || '',
  });
  
  setClientMode('edit');
  setShowClientViewModal(false);
  setShowModal(true);
} catch (error) {
    toast.error('Failed to load details');
    console.error(error);
  } finally {
    setActionLoading(false);
  }
};

  const handleDelete = async (id) => {
  if (!window.confirm('Are you sure you want to delete this branch and its associated client?')) return;
  
  setActionLoading(true);
  setLoadingMessage('Deleting branch...');
  
  try {
    const result = await api.delete(`/branches/${id}`);
    
    if (result.success) {
      toast.success('Branch and Client deleted successfully');
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



const handleDeleteClient = async (clientId) => {
  const client = clients.find(c => c.id === clientId);
  const branchCount = client?.branches?.length || 0;
  
  if (branchCount > 0) {
    toast.error(`Cannot delete client: This client has ${branchCount} associated branch(es). Please delete or reassign the branches first.`, {
      duration: 5000
    });
    return;
  }
  
  if (!window.confirm('Are you sure you want to delete this client?')) return;
  
  setActionLoading(true);
  setLoadingMessage('Deleting client...');
  
  try {
    const result = await api.delete(`/clients/${clientId}`);
    
    if (result.success) {
      toast.success('Client deleted successfully');
      await loadData();
      if (currentItems.length === 1 && currentPage > 1) {
        setCurrentPage(currentPage - 1);
      }
    } else {
      toast.error(result.message || 'Cannot delete client');
    }
  } catch (error) {
    console.error('Delete error:', error);
    if (error.message.includes('associated branch')) {
      toast.error(error.message, { duration: 5000 });
    } else {
      toast.error(error.message || 'Failed to delete client');
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
    existingClientId: '',
    clientName: '',
    tin: '',
    clientAddress: '',
    clientCity: '',
    clientProvince: '',
  });
  setEditingBranch(null);
  setEditingClient(null);
  setClientMode('new');
};



  const filteredBranches = branches.filter(branch =>
    branch.branchCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    branch.branchName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    branch.city?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredClients = clients.filter(client =>
    client.clientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.tin?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.branch?.branchName?.toLowerCase().includes(searchTerm.toLowerCase())
  );


  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  
  const currentBranches = filteredBranches.slice(indexOfFirstItem, indexOfLastItem);
  const currentClients = filteredClients.slice(indexOfFirstItem, indexOfLastItem);
  
  const totalPagesBranches = Math.ceil(filteredBranches.length / itemsPerPage);
  const totalPagesClients = Math.ceil(filteredClients.length / itemsPerPage);
  
  const totalPages = activeTab === 'branches' ? totalPagesBranches : totalPagesClients;
  const currentItems = activeTab === 'branches' ? currentBranches : currentClients;
  const totalItems = activeTab === 'branches' ? filteredBranches.length : filteredClients.length;

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
        <h1 className="text-3xl font-bold text-gray-900">Branch & Client Management</h1>
        <p className="text-gray-600 mt-1">Manage branches and their associated clients</p>
      </div>

      <div className="mb-6 border-b border-gray-200">
        <nav className="flex gap-8">
          <button
            onClick={() => setActiveTab('branches')}
            className={`pb-4 px-1 border-b-2 font-medium text-sm transition ${
              activeTab === 'branches'
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
            onClick={() => setActiveTab('clients')}
            className={`pb-4 px-1 border-b-2 font-medium text-sm transition ${
              activeTab === 'clients'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <Users size={18} />
              Clients ({clients.length})
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
            placeholder={activeTab === 'branches' ? "Search by code, name, or city..." : "Search by client name, TIN, or branch..."}
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
          Add Branch & Client
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Client</th>
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
                          {branch.client ? (
                            <div>
                              <div className="font-medium">{branch.client.clientName}</div>
                              <div className="text-xs text-gray-500">TIN: {branch.client.tin}</div>
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
                  className={`p-2 rounded-lg border ${
                    currentPage === 1 
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
                      className={`min-w-[40px] px-3 py-2 text-sm rounded-lg border ${
                        currentPage === number
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
                  className={`p-2 rounded-lg border ${
                    currentPage === totalPagesBranches
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
        // Clients Table
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Client Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">TIN</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Location</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Branch</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {currentClients.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-8 text-center text-gray-500">
                      {filteredClients.length === 0 ? 'No clients found' : 'No clients on this page'}
                    </td>
                  </tr>
                ) : (
                  currentClients.map((client) => (
                    <tr key={client.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-green-100 rounded-lg">
                            <Users size={20} className="text-green-600" />
                          </div>
                          <span className="font-medium text-gray-900">{client.clientName}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">{client.tin}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        <div>{client.city}, {client.province}</div>
                        <div className="text-xs text-gray-500">{client.address}</div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                          {client.branches && client.branches.length > 0 ? (
                            <div>
                              <div className="font-medium">{client.branches.length} Branch(es)</div>
                              <div className="text-xs text-gray-500">
                                {client.branches.slice(0, 2).map(b => b.branchName).join(', ')}
                                {client.branches.length > 2 && '...'}
                              </div>
                            </div>
                          ) : (
                            <span className="text-gray-400 italic">No branches</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleViewClient(client)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                            title="View client details"
                          >
                            <Eye size={18} />
                          </button>
                          <button
                            onClick={() => handleEditClient(client)}
                            className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition"
                            title="Edit client"
                          >
                            <Edit2 size={18} />
                          </button>
                          <button
                            onClick={() => handleDeleteClient(client.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                            title="Delete client"
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

          {/* Pagination for Clients */}
          {filteredClients.length > 0 && (
            <div className="px-6 py-4 border-t border-gray-200 bg-white flex flex-col sm:flex-row items-center justify-between gap-4">
              {/* Results count */}
              <div className="text-sm text-gray-700">
                Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, filteredClients.length)} of {filteredClients.length} results
              </div>

              {/* Pagination controls */}
              <div className="flex items-center gap-2">
                {/* Previous button */}
                <button
                  onClick={prevPage}
                  disabled={currentPage === 1}
                  className={`p-2 rounded-lg border ${
                    currentPage === 1 
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
                      className={`min-w-[40px] px-3 py-2 text-sm rounded-lg border ${
                        currentPage === number
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
                  disabled={currentPage === totalPagesClients}
                  className={`p-2 rounded-lg border ${
                    currentPage === totalPagesClients
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
          </div>
        </div>

        {/* Client Information */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Users size={20} />
            Client Information
          </h3>
          {viewingBranch.client ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-blue-50 p-4 rounded-lg border border-blue-200">
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Client Name</label>
                <p className="text-gray-900 font-medium">{viewingBranch.client.clientName || 'N/A'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">TIN</label>
                <p className="text-gray-900">{viewingBranch.client.tin || 'N/A'}</p>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-500 mb-1">Address</label>
                <p className="text-gray-900">{viewingBranch.client.address || 'No address provided'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">City</label>
                <p className="text-gray-900">{viewingBranch.client.city || 'N/A'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Province</label>
                <p className="text-gray-900">{viewingBranch.client.province || 'N/A'}</p>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
              No client associated with this branch
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

      {showClientViewModal && viewingClient && (
  <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4">
    <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
      <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">
          Client Details
        </h2>
        <button
          onClick={() => {
            setShowClientViewModal(false);
            setViewingClient(null);
            setClientBranchSearch('');
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
            Client Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">Client Name</label>
              <p className="text-gray-900 font-medium">{viewingClient.clientName}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">TIN</label>
              <p className="text-gray-900">{viewingClient.tin}</p>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-500 mb-1">Address</label>
              <p className="text-gray-900">{viewingClient.address}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">City</label>
              <p className="text-gray-900">{viewingClient.city}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">Province</label>
              <p className="text-gray-900">{viewingClient.province}</p>
            </div>
          </div>
        </div>

        {/* Branches List */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Building2 size={20} />
              Branches ({viewingClient.branches?.length || 0})
            </h3>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                placeholder="Search branches..."
                value={clientBranchSearch}
                onChange={(e) => setClientBranchSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              />
            </div>
          </div>

          {viewingClient.branches && viewingClient.branches.length > 0 ? (
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
                  {viewingClient.branches
                    .filter(branch => 
                      branch.branchCode?.toLowerCase().includes(clientBranchSearch.toLowerCase()) ||
                      branch.branchName?.toLowerCase().includes(clientBranchSearch.toLowerCase())
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
              No branches found for this client
            </div>
          )}
        </div>
      </div>


      <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4">
        <button
          onClick={() => {
            setShowClientViewModal(false);
            setViewingClient(null);
            setClientBranchSearch('');
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
          {clientMode === 'edit-client-only' ? 'Edit Client' : editingBranch ? 'Edit Branch & Client' : 'Add New Branch & Client'}
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
        {/* Branch Information - Only show when NOT editing client-only */}
        {clientMode !== 'edit-client-only' && (
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
                  required={clientMode !== 'edit-client-only'}
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
                  required={clientMode !== 'edit-client-only'}
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
                  required={clientMode !== 'edit-client-only'}
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
                  required={clientMode !== 'edit-client-only'}
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
                  required={clientMode !== 'edit-client-only'}
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
                  required={clientMode !== 'edit-client-only'}
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
                  required={clientMode !== 'edit-client-only'}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter region"
                />
              </div>
            </div>
          </div>
        )}

        {/* Client Information */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Users size={20} />
            Client Information
            {clientMode === 'view' && (
              <span className="text-sm font-normal text-blue-600">(Read-Only)</span>
            )}
          </h3>
          
          {/* Show radio buttons only when creating new branch (not editing) */}
          {!editingBranch && clientMode !== 'edit-client-only' && (
            <div className="mb-4 flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="clientMode"
                  value="new"
                  checked={clientMode === 'new'}
                  onChange={() => handleClientModeChange('new')}
                  className="w-4 h-4 text-blue-600"
                />
                <span className="text-sm font-medium text-gray-700">Create New Client</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="clientMode"
                  value="existing"
                  checked={clientMode === 'existing'}
                  onChange={() => handleClientModeChange('existing')}
                  className="w-4 h-4 text-blue-600"
                />
                <span className="text-sm font-medium text-gray-700">Use Existing Client</span>
              </label>
            </div>
          )}

          {/* Info messages */}
          {clientMode === 'view' && editingBranch && editingClient && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                ℹ️ Editing branch only. Client information is displayed below (read-only). 
                To edit client details, go to the Clients tab.
              </p>
            </div>
          )}

          {clientMode === 'edit-client-only' && editingClient && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-800">
                ✏️ You are editing client <strong>{editingClient.clientName}</strong>.
                Only client information can be updated.
              </p>
            </div>
          )}

          {/* Existing Client Dropdown */}
          {clientMode === 'existing' && !editingBranch && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Select Existing Client <span className="text-red-500">*</span>
              </label>
              <SearchableDropdown
                options={availableClients}
                value={formData.existingClientId}
                onChange={handleExistingClientChange}
                placeholder="Select a client"
                displayKey="displayName"
                valueKey="id"
                required={clientMode === 'existing'}
              />
            </div>
          )}

          {/* Show client fields when needed */}
          {(clientMode === 'new' || clientMode === 'edit' || clientMode === 'edit-client-only' || 
            (clientMode === 'existing' && formData.existingClientId) || 
            (clientMode === 'view' && formData.clientName)) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Client Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="clientName"
                  value={formData.clientName}
                  onChange={handleInputChange}
                  required={clientMode !== 'view'}
                  disabled={clientMode === 'view'}
                  className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    clientMode === 'view' ? 'bg-gray-100 cursor-not-allowed' : ''
                  }`}
                  placeholder="Enter client name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  TIN <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="tin"
                  value={formData.tin}
                  onChange={handleInputChange}
                  required={clientMode !== 'view'}
                  disabled={clientMode === 'view'}
                  className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    clientMode === 'view' ? 'bg-gray-100 cursor-not-allowed' : ''
                  }`}
                  placeholder="Enter Tax Identification Number"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="clientAddress"
                  value={formData.clientAddress}
                  onChange={handleInputChange}
                  required={clientMode !== 'view'}
                  disabled={clientMode === 'view'}
                  className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    clientMode === 'view' ? 'bg-gray-100 cursor-not-allowed' : ''
                  }`}
                  placeholder="Enter client address"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  City <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="clientCity"
                  value={formData.clientCity}
                  onChange={handleInputChange}
                  required={clientMode !== 'view'}
                  disabled={clientMode === 'view'}
                  className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    clientMode === 'view' ? 'bg-gray-100 cursor-not-allowed' : ''
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
                  name="clientProvince"
                  value={formData.clientProvince}
                  onChange={handleInputChange}
                  required={clientMode !== 'view'}
                  disabled={clientMode === 'view'}
                  className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    clientMode === 'view' ? 'bg-gray-100 cursor-not-allowed' : ''
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
            {clientMode === 'edit-client-only' 
              ? 'Update Client' 
              : editingBranch 
                ? (clientMode === 'edit' ? 'Update Branch & Client' : 'Update Branch')
                : 'Create Branch & Client'}
          </button>
        </div>
      </form>
    </div>
  </div>
)}
    </div>
  );
};

export default BranchClientManagement;