import React, { useState, useEffect } from 'react';
import { X, Building2, Users, ChevronDown } from 'lucide-react';
import SearchableDropdown from '../common/SearchableDropdown';
import { api } from '../../services/api';
import toast from 'react-hot-toast';

const BranchCompanyModal = ({ onClose, onSave, companies, branches, editingData = null }) => {
  const [companyMode, setCompanyMode] = useState(editingData ? 'view' : 'new');
  const [loading, setLoading] = useState(false);
  const [availableCompanies, setAvailableCompanies] = useState([]);

  const [formData, setFormData] = useState({
    branchCode: '',
    branchName: '',
    branchAddress: '',
    branchCity: '',
    branchProvince: '',
    area: '',
    tin: '',
    companyName: '',
    companyTin: '',
    companyAddress: '',
    companyCity: '',
    companyProvince: '',
    existingCompanyId: '',
    companyTerms: '30 days',
  });

  // Format TIN: 000-000-000-00000
  const formatTIN = (value) => {
    const numbers = value.replace(/\D/g, '');

    if (numbers.length <= 3) return numbers;
    if (numbers.length <= 6) return `${numbers.slice(0, 3)}-${numbers.slice(3)}`;
    if (numbers.length <= 9) return `${numbers.slice(0, 3)}-${numbers.slice(3, 6)}-${numbers.slice(6)}`;
    if (numbers.length <= 14) return `${numbers.slice(0, 3)}-${numbers.slice(3, 6)}-${numbers.slice(6, 9)}-${numbers.slice(9, 14)}`;

    return `${numbers.slice(0, 3)}-${numbers.slice(3, 6)}-${numbers.slice(6, 9)}-${numbers.slice(9, 14)}`;
  };

  useEffect(() => {
    // Format companies for dropdown
    const formattedCompanies = companies.map(c => {
      const branchCount = c.branches ? c.branches.length : 0;
      return {
        id: c.id,
        name: `${c.companyName} (TIN: ${c.tin || 'N/A'}) - ${branchCount} branch(es)`,
        branchCount: branchCount
      };
    });
    setAvailableCompanies(formattedCompanies);

    if (editingData) {
      const { branch, company } = editingData;

      // Detect if this is company-only edit mode
      if (branch.id === 'company-only-edit') {
        setCompanyMode('edit-company-only');
      }

      setFormData({
        branchCode: branch.branchCode || '',
        branchName: branch.branchName || '',
        branchAddress: branch.address || branch.branchAddress || '',
        branchCity: branch.city || branch.branchCity || '',
        branchProvince: branch.province || branch.branchProvince || '',
        area: branch.area || '',
        tin: branch.tin || '',
        companyName: company?.companyName || '',
        companyTin: company?.tin || '',
        companyAddress: company?.address || '',
        companyCity: company?.city || '',
        companyProvince: company?.province || '',
        companyTerms: company?.terms || '30 days',
        existingCompanyId: company?.id || '',
        transferToCompanyId: '',
      });
    }
  }, [companies, editingData]);

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
        companyTerms: '',
      }));
    } else if (mode === 'new') {
      setFormData(prev => ({
        ...prev,
        existingCompanyId: '',
      }));
    }
  };

  const handleExistingCompanyChange = (companyId) => {
    setFormData(prev => ({ ...prev, existingCompanyId: companyId }));

    if (companyId) {
      const selectedCompany = companies.find(c => c.id === companyId);
      if (selectedCompany) {
        setFormData(prev => ({
          ...prev,
          companyName: selectedCompany.companyName,
          companyTin: selectedCompany.tin || '',
          companyAddress: selectedCompany.address || '',
          companyCity: selectedCompany.city || '',
          companyProvince: selectedCompany.province || '',
          companyTerms: selectedCompany.terms || '',
        }));
      }
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    // Auto-capitalize branch name
    if (name === 'branchName') {
      setFormData(prev => ({ ...prev, [name]: value.toUpperCase() }));
      return;
    }

    // Format TIN fields
    if (name === 'tin' || name === 'companyTin') {
      setFormData(prev => ({ ...prev, [name]: formatTIN(value) }));
      return;
    }

    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const validateForm = () => {
    if (companyMode === 'edit-company-only') {
      const missingFields = [];
      if (!formData.companyName?.trim()) missingFields.push('Company Name');
      if (!formData.companyAddress?.trim()) missingFields.push('Company Address');
      if (!formData.companyCity?.trim()) missingFields.push('Company City');
      if (!formData.companyProvince?.trim()) missingFields.push('Company Province');

      if (missingFields.length > 0) {
        toast.error(`Please fill in: ${missingFields.join(', ')}`);
        return false;
      }

      if (!formData.existingCompanyId) {
        toast.error('Company ID is missing. Please try again.');
        return false;
      }

      return true;
    }

    // Validate branch fields
    const missingBranchFields = [];
    if (!formData.branchCode?.trim()) missingBranchFields.push('Branch Code');
    if (!formData.branchName?.trim()) missingBranchFields.push('Branch Name');
    if (!formData.tin?.trim()) missingBranchFields.push('TIN');
    if (!formData.branchAddress?.trim()) missingBranchFields.push('Branch Address');
    if (!formData.branchCity?.trim()) missingBranchFields.push('City');
    if (!formData.branchProvince?.trim()) missingBranchFields.push('Province');
    if (!formData.area?.trim()) missingBranchFields.push('Area');

    if (missingBranchFields.length > 0) {
      toast.error(`Please fill in: ${missingBranchFields.join(', ')}`);
      return false;
    }

    // Validate company fields based on mode
    if (companyMode === 'new') {
      const missingCompanyFields = [];
      if (!formData.companyName?.trim()) missingCompanyFields.push('Company Name');
      if (!formData.companyAddress?.trim()) missingCompanyFields.push('Company Address');
      if (!formData.companyCity?.trim()) missingCompanyFields.push('Company City');
      if (!formData.companyProvince?.trim()) missingCompanyFields.push('Company Province');

      if (missingCompanyFields.length > 0) {
        toast.error(`Please fill in: ${missingCompanyFields.join(', ')}`);
        return false;
      }
    } else if (companyMode === 'existing') {
      if (!formData.existingCompanyId) {
        toast.error('Please select an existing company');
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      if (companyMode === 'edit-company-only') {
        const companyPayload = {
          companyName: formData.companyName.trim(),
          tin: formData.companyTin?.trim() || null,
          address: formData.companyAddress.trim(),
          city: formData.companyCity.trim(),
          province: formData.companyProvince.trim(),
          terms: formData.companyTerms?.trim() || null
        };

        const result = await api.put(`/companies/${formData.existingCompanyId}`, companyPayload);

        if (result.success) {
          toast.success('Company updated successfully');
          onSave();
        } else {
          toast.error(result.error || 'Failed to update company');
        }
      } else {
        const payload = {
          branchCode: formData.branchCode.trim(),
          branchName: formData.branchName.trim(),
          tin: formData.tin.trim(),
          address: formData.branchAddress.trim(),
          city: formData.branchCity.trim(),
          province: formData.branchProvince.trim(),
          area: formData.area.trim(),
        };

        let result;
        if (editingData && editingData.branch.id !== 'company-only-edit') {
          if (companyMode === 'transfer') {
            if (!formData.transferToCompanyId) {
              toast.error('Please select a company to transfer to');
              setLoading(false);
              return;
            }
            result = await api.put(`/branches/${editingData.branch.id}`, payload);
            if (result.success) {
              result = await api.patch(`/branches/${editingData.branch.id}/transfer-company?companyId=${formData.transferToCompanyId}`);
            }
          } else if (companyMode === 'view') {
            result = await api.put(`/branches/${editingData.branch.id}`, payload);
          } else if (companyMode === 'edit') {
            payload.useExistingCompany = false;
            payload.companyName = formData.companyName.trim();
            payload.companyTin = formData.companyTin?.trim() || null;
            payload.companyAddress = formData.companyAddress.trim();
            payload.companyCity = formData.companyCity.trim();
            payload.companyProvince = formData.companyProvince.trim();
            payload.companyTerms = formData.companyTerms?.trim() || null;
            result = await api.put(`/branches/${editingData.branch.id}/with-company`, payload);
          }
        } else {
          // Create new branch
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
            payload.companyTerms = formData.companyTerms?.trim() || null;
          }

          result = await api.post('/branches/with-company', payload);
        }

        if (result.success) {
          toast.success(
            editingData
              ? (companyMode === 'edit' ? 'Branch and Company updated' : 'Branch updated')
              : 'Branch and Company created'
          );
          onSave();
        } else {
          toast.error(result.error || 'Failed to save');
        }
      }
    } catch (error) {
      console.error('Submission error:', error);
      toast.error(error.message || 'Failed to save');
    } finally {
      setLoading(false);
    }
  };

  const modalTitle = editingData
    ? (companyMode === 'edit-company-only' ? 'Edit Company' : 'Edit Branch & Company')
    : 'Add New Branch & Company';

  return (
    <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">
            {modalTitle}
          </h2>
          <button
            onClick={onClose}
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
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent uppercase"
                    placeholder="ENTER BRANCH NAME"
                  />
                  <p className="text-xs text-gray-500 mt-1">Branch name will be auto-capitalized</p>
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
                    Branch TIN <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="tin"
                    value={formData.tin}
                    onChange={handleInputChange}
                    required={companyMode !== 'edit-company-only'}
                    maxLength={17}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="000-000-000-00000"
                  />
                  <p className="text-xs text-gray-500 mt-1">Format: 000-000-000-00000</p>
                </div>
              </div>
            </div>
          )}

          {/* Company Information */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Users size={20} />
              Company Information
              {companyMode === 'view' && (
                <span className="text-sm font-normal text-blue-600">(Read-Only)</span>
              )}
            </h3>

            {/* Show radio buttons only when creating new branch (not editing) */}
            {!editingData && companyMode !== 'edit-company-only' && (
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

            {/* Show transfer option when editing a branch */}
            {editingData && editingData.branch.id !== 'company-only-edit' && (
              <div className="mb-4 flex gap-4 flex-wrap">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="editCompanyMode"
                    checked={companyMode === 'view'}
                    onChange={() => handleCompanyModeChange('view')}
                    className="w-4 h-4 text-blue-600"
                  />
                  <span className="text-sm font-medium text-gray-700">Keep Current Company</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="editCompanyMode"
                    checked={companyMode === 'transfer'}
                    onChange={() => handleCompanyModeChange('transfer')}
                    className="w-4 h-4 text-blue-600"
                  />
                  <span className="text-sm font-medium text-gray-700">Transfer to Different Company</span>
                </label>
              </div>
            )}

            {companyMode === 'transfer' && editingData && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Select New Company <span className="text-red-500">*</span>
                </label>
                <SearchableDropdown
                  options={availableCompanies.filter(c => c.id !== formData.existingCompanyId)}
                  value={formData.transferToCompanyId || ''}
                  onChange={(value) => setFormData(prev => ({ ...prev, transferToCompanyId: value }))}
                  placeholder="Select company to transfer to"
                  displayKey="name"
                  valueKey="id"
                />
              </div>
            )}

            {companyMode === 'view' && editingData && (
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  ℹ️ Editing branch only. Company information is displayed below (read-only).
                  To edit company details, go to the Companies tab.
                </p>
              </div>
            )}

            {companyMode === 'edit-company-only' && editingData && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-green-800">
                  ✏️ You are editing company <strong>{editingData.company?.companyName}</strong>.
                  Only company information can be updated.
                </p>
              </div>
            )}


            {companyMode === 'existing' && !editingData && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Select Existing Company <span className="text-red-500">*</span>
                </label>
                <SearchableDropdown
                  options={availableCompanies}
                  value={formData.existingCompanyId}
                  onChange={handleExistingCompanyChange}
                  placeholder="Select a company"
                  displayKey="name"
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
                      disabled={companyMode === 'view' || (companyMode === 'existing' && formData.existingCompanyId)}
                      className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${companyMode === 'view' || (companyMode === 'existing' && formData.existingCompanyId) ? 'bg-gray-100 cursor-not-allowed' : ''
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
                      disabled={companyMode === 'view' || (companyMode === 'existing' && formData.existingCompanyId)}
                      maxLength={17}
                      className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${companyMode === 'view' || (companyMode === 'existing' && formData.existingCompanyId) ? 'bg-gray-100 cursor-not-allowed' : ''
                        }`}
                      placeholder="000-000-000-00000"
                    />
                    <p className="text-xs text-gray-500 mt-1">Format: 000-000-000-00000</p>
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
                      disabled={companyMode === 'view' || (companyMode === 'existing' && formData.existingCompanyId)}
                      className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${companyMode === 'view' || (companyMode === 'existing' && formData.existingCompanyId) ? 'bg-gray-100 cursor-not-allowed' : ''
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
                      disabled={companyMode === 'view' || (companyMode === 'existing' && formData.existingCompanyId)}
                      className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${companyMode === 'view' || (companyMode === 'existing' && formData.existingCompanyId) ? 'bg-gray-100 cursor-not-allowed' : ''
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
                      disabled={companyMode === 'view' || (companyMode === 'existing' && formData.existingCompanyId)}
                      className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${companyMode === 'view' || (companyMode === 'existing' && formData.existingCompanyId) ? 'bg-gray-100 cursor-not-allowed' : ''
                        }`}
                      placeholder="Enter province"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Terms (Optional)
                    </label>
                    <input
                      type="text"
                      name="companyTerms"
                      value={formData.companyTerms}
                      onChange={handleInputChange}
                      disabled={companyMode === 'view' || (companyMode === 'existing' && formData.existingCompanyId)}
                      className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${companyMode === 'view' || (companyMode === 'existing' && formData.existingCompanyId) ? 'bg-gray-100 cursor-not-allowed' : ''
                        }`}
                      placeholder="e.g. NET 30, COD"
                    />
                  </div>
                </div>
              )}
          </div>

          {/* Submit Buttons */}
          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Saving...' : companyMode === 'edit-company-only'
                ? 'Update Company'
                : companyMode === 'transfer'
                  ? 'Transfer & Update Branch'
                  : editingData
                    ? (companyMode === 'edit' ? 'Update Branch & Company' : 'Update Branch')
                    : 'Create Branch & Company'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BranchCompanyModal;