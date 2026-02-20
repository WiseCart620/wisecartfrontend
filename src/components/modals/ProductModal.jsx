import React, { useState } from 'react';
import {
    X, Package, Globe, Box, Tag, AlertCircle,
    Edit2, Plus, Trash2, DollarSign, Copy, Search
} from 'lucide-react';
import SearchableDropdown from '../common/SearchableDropdown';
import CategoryInput from '../forms/CategoryInput';
import MultiCompanyPriceSelector from '../common/MultiCompanyPriceSelector';
import { getFileUrl } from '../../utils/fileUtils';

const ProductModal = ({
    editingProduct,
    formData,
    setFormData,
    variationTypes,
    setVariationTypes,
    variationCombinations,
    setVariationCombinations,
    variationInputRefs,
    uploadingImage,
    uploadingVariationImage,
    handleImageUpload,
    companies,
    suppliers,
    existingCategories,
    productCategories,
    selectedSupplier,
    setSelectedSupplier,
    handleInputChange,
    handleSupplierToggle,
    onClose,
    onSubmit
}) => {
    const updateVariationCombination = (index, field, value) => {
        const newCombinations = [...variationCombinations];
        newCombinations[index][field] = value;
        setVariationCombinations(newCombinations);
    };

    const [supplierSearch, setSupplierSearch] = useState('');
    const [supplierDropdownOpen, setSupplierDropdownOpen] = useState(false);

    const filteredSuppliers = suppliers.filter(s =>
        s.name.toLowerCase().includes(supplierSearch.toLowerCase())
    );

    const updateVariationCompanyPrice = (comboIndex, companyId, price) => {
        const newCombinations = [...variationCombinations];
        newCombinations[comboIndex].companyPrices[companyId] = price;
        setVariationCombinations(newCombinations);
    };


    const formatPriceDisplay = (val) => {
        if (val === '' || val === undefined || val === null) return '';
        const str = String(val);
        if (str.endsWith('.')) return str;
        const num = parseFloat(str);
        if (isNaN(num)) return str;
        return num.toFixed(2);
    };

    const applyPriceToAllCompanies = (comboIndex, price) => {
        const newCombinations = [...variationCombinations];
        companies.forEach((company) => {
            newCombinations[comboIndex].companyPrices[company.id] = price;
        });
        setVariationCombinations(newCombinations);
    };

    const updateVariationCompanySku = (comboIndex, companyId, sku) => {
        const newCombinations = [...variationCombinations];
        if (!newCombinations[comboIndex].companySkus) {
            newCombinations[comboIndex].companySkus = {};
        }
        newCombinations[comboIndex].companySkus[companyId] = sku;
        setVariationCombinations(newCombinations);
    };

    return (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-7xl w-full max-h-[90vh] overflow-y-auto">
                <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
                    <h2 className="text-xl font-bold text-gray-900">
                        {editingProduct ? 'Edit Product' : 'Add New Product'}
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-lg transition"
                    >
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={onSubmit} className="p-6 space-y-6">
                    {/* Basic Information */}
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                            <Package size={20} />
                            Basic Information
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Product Name <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    name="productName"
                                    value={formData.productName}
                                    onChange={handleInputChange}
                                    required
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    placeholder="Enter product name"
                                />
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Product Image
                                </label>

                                {/* Upload Area */}
                                {!formData.imageUrl ? (
                                    <div className="relative">
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={async (e) => {
                                                const file = e.target.files[0];
                                                if (file) {
                                                    const imageUrl = await handleImageUpload(file);
                                                    if (imageUrl) {
                                                        console.log('Setting imageUrl to:', imageUrl);
                                                        setFormData(prev => ({ ...prev, imageUrl }));
                                                    }
                                                }
                                                e.target.value = '';
                                            }}
                                            className="hidden"
                                            id="product-image-upload"
                                            disabled={uploadingImage}
                                        />
                                        <label
                                            htmlFor="product-image-upload"
                                            className={`flex flex-col items-center justify-center w-full h-40 border-2 border-dashed rounded-lg cursor-pointer transition ${uploadingImage
                                                ? 'border-blue-400 bg-blue-50'
                                                : 'border-gray-300 hover:border-blue-500 bg-gray-50 hover:bg-gray-100'
                                                }`}
                                        >
                                            {uploadingImage ? (
                                                <div className="flex flex-col items-center">
                                                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mb-2"></div>
                                                    <p className="text-sm text-blue-600 font-medium">Uploading...</p>
                                                </div>
                                            ) : (
                                                <>
                                                    <Package size={40} className="text-gray-400 mb-2" />
                                                    <p className="text-sm text-gray-600 font-medium">Click to upload product image</p>
                                                    <p className="text-xs text-gray-500 mt-1">PNG, JPG up to 5MB</p>
                                                </>
                                            )}
                                        </label>
                                    </div>
                                ) : (
                                    <div className="relative inline-block">
                                        <img
                                            src={getFileUrl(formData.imageUrl)}
                                            alt="Product"
                                            className="h-40 w-40 object-cover rounded-lg border-2 border-gray-200"
                                            onError={(e) => {
                                                console.error('Image load error:', formData.imageUrl);
                                                console.error('Full URL:', getFileUrl(formData.imageUrl));
                                            }}
                                            onLoad={() => {
                                                console.log('Image loaded successfully:', formData.imageUrl);
                                            }}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setFormData(prev => ({ ...prev, imageUrl: '' }))}
                                            className="absolute -top-2 -right-2 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 transition shadow-lg"
                                        >
                                            <X size={16} />
                                        </button>
                                        <div className="mt-2">
                                            <label
                                                htmlFor="product-image-change"
                                                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer transition"
                                            >
                                                <Edit2 size={12} />
                                                Change Image
                                            </label>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Category
                                </label>
                                <CategoryInput
                                    value={formData.category}
                                    onChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
                                    categories={productCategories}
                                    existingCategories={existingCategories}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Brand</label>
                                <input
                                    type="text"
                                    name="brand"
                                    value={formData.brand}
                                    onChange={handleInputChange}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    placeholder="Enter brand"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Supplier & Origin */}
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                            <Globe size={20} />
                            Supplier & Origin
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Suppliers</label>

                                {/* Dropdown trigger button */}
                                <div className="relative">
                                    <button
                                        type="button"
                                        onClick={() => setSupplierDropdownOpen(prev => !prev)}
                                        className="w-full flex items-center justify-between px-4 py-2 border border-gray-300 rounded-lg bg-white hover:border-blue-500 focus:ring-2 focus:ring-blue-500 transition text-sm"
                                    >
                                        <span className={formData.supplierIds?.length > 0 ? 'text-gray-900' : 'text-gray-400'}>
                                            {formData.supplierIds?.length > 0
                                                ? `${[...new Set(formData.supplierIds)].length} supplier(s) selected` // Show unique count
                                                : 'Select suppliers...'}
                                        </span>
                                        <svg className={`w-4 h-4 text-gray-500 transition-transform ${supplierDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </button>

                                    {/* Dropdown panel */}
                                    {supplierDropdownOpen && (
                                        <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg">
                                            {/* Search inside dropdown */}
                                            <div className="p-2 border-b border-gray-100">
                                                <div className="relative">
                                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                                                    <input
                                                        type="text"
                                                        placeholder="Search suppliers..."
                                                        value={supplierSearch}
                                                        onChange={(e) => setSupplierSearch(e.target.value)}
                                                        className="w-full pl-8 pr-4 py-1.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                                        autoFocus
                                                    />
                                                </div>
                                            </div>

                                            {/* Supplier list */}
                                            <div className="max-h-52 overflow-y-auto">
                                                {filteredSuppliers.map(supplier => {
                                                    const isSelected = formData.supplierIds?.includes(supplier.id);
                                                    return (
                                                        <div
                                                            key={`supplier-${supplier.id}`}
                                                            onClick={(e) => {
                                                                e.stopPropagation(); // Prevent event bubbling
                                                                e.preventDefault(); // Prevent any default behavior
                                                                handleSupplierToggle(supplier.id);
                                                            }}
                                                            onMouseDown={(e) => e.preventDefault()} // Prevent focus issues
                                                            className={`flex items-center justify-between px-4 py-2.5 cursor-pointer hover:bg-blue-50 transition ${isSelected ? 'bg-blue-50' : ''}`}
                                                        >
                                                            <div>
                                                                <p className="text-sm font-medium text-gray-800">{supplier.name}</p>
                                                                {supplier.country && (
                                                                    <p className="text-xs text-gray-500">{supplier.country}</p>
                                                                )}
                                                            </div>
                                                            {isSelected && (
                                                                <span className="text-blue-600">✓</span>
                                                            )}
                                                        </div>
                                                    );
                                                })}

                                            </div>

                                            {/* Close button */}
                                            <div className="p-2 border-t border-gray-100">
                                                <button
                                                    type="button"
                                                    onClick={() => setSupplierDropdownOpen(false)}
                                                    className="w-full py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded transition"
                                                >
                                                    Done
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {formData.supplierIds?.length > 0 && (
                                    <div className="mt-2">
                                        <div className="flex items-center gap-3 px-3 py-1.5 mb-1">
                                            <div className="flex-1 min-w-0">
                                                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Supplier</span>
                                            </div>
                                            <div className="flex items-center gap-1.5 flex-shrink-0">
                                                <Globe size={13} className="text-gray-400" />
                                                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide w-40">Country of Origin</span>
                                            </div>
                                            <div className="w-8 flex-shrink-0"></div> {/* Spacer for remove button */}
                                        </div>

                                        <div className="space-y-2">
                                            {/* Use Set to ensure unique IDs when rendering */}
                                            {[...new Set(formData.supplierIds)].map(id => {
                                                const supplier = suppliers.find(s => s.id === id);
                                                if (!supplier) return null;

                                                return (
                                                    <div key={`selected-${id}`} className="flex items-center gap-3 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg group hover:bg-blue-100 transition">
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-sm font-medium text-gray-800">{supplier.name}</p>
                                                        </div>
                                                        <div className="flex items-center gap-1.5 flex-shrink-0">
                                                            <Globe size={13} className="text-gray-400" />
                                                            <div className="w-40 px-3 py-1.5 text-sm bg-white border border-gray-200 rounded-md text-gray-700">
                                                                {formData.supplierCountries?.[id] || supplier?.country || 'Not specified'}
                                                            </div>
                                                        </div>

                                                        {/* Remove button */}
                                                        <button
                                                            type="button"
                                                            onClick={() => handleSupplierToggle(id)}
                                                            className="w-8 h-8 flex items-center justify-center text-red-500 hover:text-red-700 hover:bg-red-100 rounded-full transition opacity-0 group-hover:opacity-100 focus:opacity-100"
                                                            title="Remove supplier"
                                                        >
                                                            <X size={16} />
                                                        </button>
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        {formData.supplierIds.length > 1 && (
                                            <div className="mt-3 flex justify-end">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        if (window.confirm('Remove all suppliers?')) {
                                                            formData.supplierIds.forEach(id => handleSupplierToggle(id));
                                                        }
                                                    }}
                                                    className="text-xs text-red-600 hover:text-red-700 font-medium flex items-center gap-1"
                                                >
                                                    <Trash2 size={12} />
                                                    Remove All
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Shelf Life</label>
                                <input
                                    type="text"
                                    name="shelfLife"
                                    value={formData.shelfLife}
                                    onChange={handleInputChange}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    placeholder="Example: 12 months, 2 years"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Creation Date</label>
                                <input
                                    type="text"
                                    value={editingProduct?.createdAt ? new Date(editingProduct.createdAt).toLocaleDateString() : 'Auto-generated on save'}
                                    disabled
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 cursor-not-allowed text-gray-600"
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    {editingProduct?.createdAt ? 'Product created on this date' : 'Will be set automatically when product is created'}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Physical Details */}
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                            <Box size={20} />
                            Physical Details
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {variationCombinations.length === 0 && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        SKU <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        name="sku"
                                        value={formData.sku}
                                        onChange={handleInputChange}
                                        required={variationCombinations.length === 0}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        placeholder="Enter SKU"
                                    />
                                </div>
                            )}

                            {variationCombinations.length === 0 && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        UPC <span className="text-red-500">*</span>
                                        <span className="text-xs text-gray-500 ml-2">(13 digits)</span>
                                    </label>
                                    <input
                                        type="text"
                                        name="upc"
                                        value={formData.upc}
                                        onChange={handleInputChange}
                                        required={variationCombinations.length === 0}
                                        maxLength={13}
                                        pattern="\d{13}"
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        placeholder="Enter 13-digit UPC"
                                    />
                                    {formData.upc && formData.upc.length !== 13 && (
                                        <p className="text-xs text-red-600 mt-1">
                                            UPC must be exactly 13 digits ({formData.upc.length}/13)
                                        </p>
                                    )}
                                </div>
                            )}

                            {variationCombinations.length === 0 && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Weight (kg) <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="number"
                                        name="weight"
                                        value={formData.weight}
                                        onChange={handleInputChange}
                                        required={variationCombinations.length === 0}
                                        step="0.01"
                                        min="0"
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        placeholder="0.00"
                                    />
                                </div>
                            )}

                            {variationCombinations.length === 0 && (
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Dimensions (L×W×H cm) <span className="text-red-500">*</span>
                                    </label>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="number"
                                            name="length"
                                            value={formData.length}
                                            onChange={handleInputChange}
                                            placeholder="Length"
                                            step="0.01"
                                            min="0"
                                            required={variationCombinations.length === 0}
                                            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        />
                                        <X size={16} className="text-gray-400" />
                                        <input
                                            type="number"
                                            name="width"
                                            value={formData.width}
                                            onChange={handleInputChange}
                                            placeholder="Width"
                                            step="0.01"
                                            min="0"
                                            required={variationCombinations.length === 0}
                                            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        />
                                        <X size={16} className="text-gray-400" />
                                        <input
                                            type="number"
                                            name="height"
                                            value={formData.height}
                                            onChange={handleInputChange}
                                            placeholder="Height"
                                            step="0.01"
                                            min="0"
                                            required={variationCombinations.length === 0}
                                            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        />
                                    </div>
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Materials</label>
                                <input
                                    type="text"
                                    name="materials"
                                    value={formData.materials}
                                    onChange={handleInputChange}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    placeholder="Enter materials"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Unit of Measure (UOM)
                                </label>
                                <input
                                    type="text"
                                    name="uom"
                                    value={formData.uom}
                                    onChange={handleInputChange}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    placeholder="e.g., pcs, box, kg, liter"
                                />
                            </div>

                            {variationCombinations.length === 0 && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Unit Cost (₱)
                                    </label>
                                    <input
                                        type="number"
                                        value={formData.unitCost || ''}
                                        disabled
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 cursor-not-allowed text-gray-900"
                                        placeholder="Set via Purchase Orders"
                                    />
                                    <p className="text-xs text-gray-500 mt-1">
                                        {formData.unitCost
                                            ? `Current unit cost: ₱${parseFloat(formData.unitCost).toFixed(2)}`
                                            : 'Set unit price in Purchase Orders to update this value'}
                                    </p>
                                </div>
                            )}
                        </div>

                        {variationCombinations.length > 0 && (
                            <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                                <div className="flex items-center gap-2 text-amber-700">
                                    <AlertCircle size={18} />
                                    <div>
                                        <p className="text-sm font-medium">SKU, UPC, Weight, Dimensions & Unit Cost Disabled</p>
                                        <p className="text-xs mt-1">
                                            This product has variations. Please set these values for each variation in the table below.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Company Selling Price */}
                    {variationCombinations.length === 0 && (
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                <DollarSign size={20} />
                                Company Selling Price
                                <span className="text-xs font-normal text-gray-500 ml-2">
                                    (For products without variations)
                                </span>
                            </h3>
                            <MultiCompanyPriceSelector
                                companies={companies}
                                selectedPrices={formData.companyBasePrices}
                                onChange={(prices, assignRemaining, remainingPrice) => {
                                    setFormData(prev => ({
                                        ...prev,
                                        companyBasePrices: prices,
                                        assignToRemainingBase: assignRemaining,
                                        remainingBasePriceValue: remainingPrice
                                    }));
                                }}
                                assignToRemaining={formData.assignToRemainingBase || false}
                                remainingPrice={formData.remainingBasePriceValue || ''}
                            />
                            <p className="text-xs text-amber-600 mt-3 flex items-center gap-1">
                                <AlertCircle size={14} />
                                Note: Company base prices are only available for products without variations.
                                If you add variations below, variation-specific pricing will be used instead.
                            </p>
                        </div>
                    )}

                    {/* Show disabled message when variations exist */}
                    {variationCombinations.length > 0 && (
                        <div className="p-4 bg-gray-100 border border-gray-300 rounded-lg">
                            <div className="flex items-center gap-2 text-gray-600">
                                <AlertCircle size={18} />
                                <div>
                                    <p className="text-sm font-medium">Company Selling Price Disabled</p>
                                    <p className="text-xs mt-1">
                                        This product has variations. Please set company prices for each variation in the table below.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Product Variations */}
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                                <Tag size={20} />
                                Product Variations
                            </h3>
                        </div>

                        <div className="space-y-4">
                            {variationCombinations.length > 0 && (
                                <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                                    <div className="flex items-center gap-2 text-blue-700">
                                        <AlertCircle size={18} />
                                        <div>
                                            <p className="text-sm font-medium">Variations Active</p>
                                            <p className="text-xs mt-1">
                                                Company base prices and base product fields (SKU, UPC, Weight, Dimensions) are disabled.
                                                Set these values for each variation in the table below.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {variationTypes.map((varType, typeIndex) => (
                                <div key={typeIndex} className="p-5 bg-gray-50 rounded-xl border border-gray-200">
                                    {/* Variation Type Header */}
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-3">
                                            <select
                                                value={varType.type}
                                                onChange={(e) => {
                                                    const newTypes = [...variationTypes];
                                                    newTypes[typeIndex].type = e.target.value;
                                                    newTypes[typeIndex].customType = '';
                                                    setVariationTypes(newTypes);
                                                }}
                                                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-medium"
                                            >
                                                {['SIZE', 'COLOR', 'PACK', 'FLAVOR', 'MATERIAL', 'STYLE', 'VOLUME', 'OTHER'].map(type => (
                                                    <option key={type} value={type}>
                                                        {type.charAt(0) + type.slice(1).toLowerCase()}
                                                    </option>
                                                ))}
                                            </select>

                                            {varType.type === 'OTHER' && (
                                                <input
                                                    type="text"
                                                    placeholder="Custom type name (e.g., Pattern, Scent)"
                                                    value={varType.customType || ''}
                                                    onChange={(e) => {
                                                        const newTypes = [...variationTypes];
                                                        newTypes[typeIndex].customType = e.target.value;
                                                        setVariationTypes(newTypes);
                                                    }}
                                                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                                />
                                            )}
                                        </div>

                                        <button
                                            type="button"
                                            onClick={() => {
                                                setVariationTypes(variationTypes.filter((_, i) => i !== typeIndex));
                                            }}
                                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>

                                    {/* Add Value Input */}
                                    <div className="mb-4">
                                        {varType.type === 'SIZE' ? (
                                            <div className="flex gap-2">
                                                <select
                                                    onChange={(e) => {
                                                        if (e.target.value && e.target.value !== 'CUSTOM') {
                                                            const newTypes = [...variationTypes];
                                                            if (!newTypes[typeIndex].values.includes(e.target.value)) {
                                                                newTypes[typeIndex].values.push(e.target.value);
                                                                setVariationTypes(newTypes);
                                                            }
                                                            e.target.value = '';
                                                        }
                                                    }}
                                                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                                >
                                                    <option value="">Quick add size...</option>
                                                    {['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL', 'SMALL', 'MEDIUM', 'LARGE'].map(s => (
                                                        <option key={s} value={s}>{s}</option>
                                                    ))}
                                                </select>
                                                <input
                                                    ref={(el) => variationInputRefs.current[`size-input-${typeIndex}`] = el}
                                                    type="text"
                                                    placeholder="Or type custom size"
                                                    onKeyPress={(e) => {
                                                        if (e.key === 'Enter') {
                                                            e.preventDefault();
                                                            const value = e.target.value.trim();
                                                            if (value && !variationTypes[typeIndex].values.includes(value)) {
                                                                const newTypes = [...variationTypes];
                                                                newTypes[typeIndex].values.push(value);
                                                                setVariationTypes(newTypes);
                                                                e.target.value = '';
                                                            }
                                                        }
                                                    }}
                                                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                                />
                                            </div>
                                        ) : varType.type === 'COLOR' ? (
                                            <div className="flex gap-2">
                                                <select
                                                    onChange={(e) => {
                                                        if (e.target.value) {
                                                            const newTypes = [...variationTypes];
                                                            if (!newTypes[typeIndex].values.includes(e.target.value)) {
                                                                newTypes[typeIndex].values.push(e.target.value);
                                                                setVariationTypes(newTypes);
                                                            }
                                                            e.target.value = '';
                                                        }
                                                    }}
                                                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                                >
                                                    <option value="">Quick add color...</option>
                                                    {['RED', 'BLUE', 'GREEN', 'YELLOW', 'BLACK', 'WHITE', 'GRAY', 'BROWN', 'ORANGE', 'PURPLE', 'PINK', 'BEIGE', 'NAVY'].map(c => (
                                                        <option key={c} value={c}>{c}</option>
                                                    ))}
                                                </select>
                                                <input
                                                    ref={(el) => variationInputRefs.current[`color-input-${typeIndex}`] = el}
                                                    type="text"
                                                    placeholder="Or type custom color"
                                                    onKeyPress={(e) => {
                                                        if (e.key === 'Enter') {
                                                            e.preventDefault();
                                                            const value = e.target.value.trim();
                                                            if (value && !variationTypes[typeIndex].values.includes(value)) {
                                                                const newTypes = [...variationTypes];
                                                                newTypes[typeIndex].values.push(value);
                                                                setVariationTypes(newTypes);
                                                                e.target.value = '';
                                                            }
                                                        }
                                                    }}
                                                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                                />
                                            </div>
                                        ) : (
                                            <div className="flex gap-2">
                                                <input
                                                    ref={(el) => variationInputRefs.current[`input-${typeIndex}`] = el}
                                                    type="text"
                                                    placeholder={`Add ${varType.type === 'OTHER' ? (varType.customType || 'variation') : varType.type.toLowerCase()} value`}
                                                    onKeyPress={(e) => {
                                                        if (e.key === 'Enter') {
                                                            e.preventDefault();
                                                            const value = e.target.value.trim();
                                                            if (value && !variationTypes[typeIndex].values.includes(value)) {
                                                                const newTypes = [...variationTypes];
                                                                newTypes[typeIndex].values.push(value);
                                                                setVariationTypes(newTypes);
                                                                e.target.value = '';
                                                            }
                                                        }
                                                    }}
                                                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const input = variationInputRefs.current[`input-${typeIndex}`];
                                                        if (input && input.value) {
                                                            const value = input.value.trim();
                                                            if (value && !variationTypes[typeIndex].values.includes(value)) {
                                                                const newTypes = [...variationTypes];
                                                                newTypes[typeIndex].values.push(value);
                                                                setVariationTypes(newTypes);
                                                                input.value = '';
                                                            }
                                                        }
                                                    }}
                                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                                                >
                                                    <Plus size={18} />
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    {/* Values List */}
                                    {varType.values.length > 0 && (
                                        <div className="space-y-2">
                                            <p className="text-sm font-medium text-gray-700">
                                                {varType.values.length} value{varType.values.length > 1 ? 's' : ''}:
                                            </p>
                                            <div className="flex flex-wrap gap-2">
                                                {varType.values.map((value, valueIndex) => (
                                                    <div
                                                        key={valueIndex}
                                                        className="flex items-center gap-2 px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg text-sm"
                                                    >
                                                        <span>{value}</span>
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                const newTypes = [...variationTypes];
                                                                newTypes[typeIndex].values = newTypes[typeIndex].values.filter((_, i) => i !== valueIndex);
                                                                setVariationTypes(newTypes);
                                                            }}
                                                            className="hover:bg-blue-200 rounded p-0.5 transition"
                                                        >
                                                            <X size={14} />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}

                            <button
                                type="button"
                                onClick={() => {
                                    setVariationTypes([...variationTypes, { type: 'SIZE', values: [], customType: '' }]);
                                }}
                                className="w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-blue-500 hover:text-blue-600 transition flex items-center justify-center gap-2"
                            >
                                <Plus size={18} />
                                {variationTypes.length === 0 ? 'Add Variation Type' : 'Add Another Variation Type'}
                            </button>

                            {/* Variation Combinations Table */}
                            {variationCombinations.length > 0 && (
                                <div className="mt-6 border border-gray-300 rounded-lg overflow-hidden">
                                    <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-3">
                                        <h4 className="text-white font-semibold flex items-center gap-2">
                                            <Package size={18} />
                                            Variation Combinations ({variationCombinations.length})
                                        </h4>
                                    </div>

                                    <div style={{
                                        overflowX: 'auto',
                                        overflowY: 'auto',
                                        position: 'relative',
                                        maxHeight: '650px'
                                    }}>
                                        <table className="w-full" style={{ minWidth: '1400px' }}>
                                            <thead className="bg-gray-50 border-b border-gray-200" style={{ position: 'sticky', top: 0, zIndex: 1 }}>
                                                <tr>
                                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase w-28" style={{ position: 'sticky', left: 0, zIndex: 2, backgroundColor: '#f9fafb', width: '112px', minWidth: '112px', maxWidth: '112px' }}>Image</th>
                                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase w-48" style={{ position: 'sticky', left: '112px', zIndex: 2, backgroundColor: '#f9fafb', boxShadow: '2px 0 4px rgba(0,0,0,0.08)' }}>Variation</th>
                                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase w-40">SKU</th>
                                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase w-40">UPC</th>
                                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase w-32">Weight (kg)</th>
                                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase w-64">Dimensions (L×W×H cm)</th>
                                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase w-32">Unit Cost (₱)</th>
                                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase" style={{ minWidth: '360px' }}>Company Prices <span className="text-red-500">*</span></th>
                                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase" style={{ minWidth: '360px' }}>Company SKU <span className="text-red-500">*</span></th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-200">
                                                {variationCombinations.map((combo, comboIndex) => (
                                                    <tr key={comboIndex}>
                                                        {/* Image Upload */}
                                                        <td className="px-4 py-3 w-28" style={{ position: 'sticky', left: 0, zIndex: 1, backgroundColor: 'white', width: '112px', minWidth: '112px', maxWidth: '112px' }}>
                                                            {!combo.imageUrl ? (
                                                                <div className="relative">
                                                                    <input
                                                                        type="file"
                                                                        accept="image/*"
                                                                        onChange={async (e) => {
                                                                            const file = e.target.files[0];
                                                                            if (file) {
                                                                                const imageUrl = await handleImageUpload(file, true, comboIndex);
                                                                                if (imageUrl) {
                                                                                    updateVariationCombination(comboIndex, 'imageUrl', imageUrl);
                                                                                }
                                                                            }
                                                                            e.target.value = '';
                                                                        }}
                                                                        className="hidden"
                                                                        id={`variation-image-${comboIndex}`}
                                                                        disabled={uploadingVariationImage[comboIndex]}
                                                                    />
                                                                    <label
                                                                        htmlFor={`variation-image-${comboIndex}`}
                                                                        className={`flex items-center justify-center w-16 h-16 border-2 border-dashed rounded-lg cursor-pointer transition overflow-hidden ${uploadingVariationImage[comboIndex]
                                                                            ? 'border-blue-400 bg-blue-50'
                                                                            : 'border-gray-300 hover:border-blue-500 bg-gray-50'
                                                                            }`}
                                                                    >
                                                                        {uploadingVariationImage[comboIndex] ? (
                                                                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                                                                        ) : (
                                                                            <Package size={16} className="text-gray-400" />
                                                                        )}
                                                                    </label>
                                                                </div>
                                                            ) : (
                                                                <div className="relative group">
                                                                    <div className="w-16 h-16 overflow-hidden rounded-lg border border-gray-200">
                                                                        <img
                                                                            src={getFileUrl(combo.imageUrl)}
                                                                            alt="Variation"
                                                                            className="w-full h-full object-cover"
                                                                            onError={(e) => {
                                                                                e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2VlZSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiM5OTkiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5JbWFnZTwvdGV4dD48L3N2Zz4=';
                                                                            }}
                                                                        />
                                                                    </div>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => updateVariationCombination(comboIndex, 'imageUrl', '')}
                                                                        className="absolute -top-1.5 -right-1.5 p-0.5 bg-red-500 text-white rounded-full hover:bg-red-600 transition opacity-0 group-hover:opacity-100 shadow-md"
                                                                    >
                                                                        <X size={10} />
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </td>

                                                        {/* Variation Attributes */}
                                                        <td className="px-4 py-3 w-48" style={{ position: 'sticky', left: '112px', zIndex: 1, backgroundColor: 'white', boxShadow: '2px 0 4px rgba(0,0,0,0.08)' }}>
                                                            <div className="flex flex-wrap gap-1">
                                                                {Object.entries(combo.attributes).map(([type, value]) => (
                                                                    <span key={type} className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium whitespace-nowrap">
                                                                        {type}: {value}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        </td>

                                                        {/* SKU */}
                                                        <td className="px-4 py-3 w-40">
                                                            <input
                                                                type="text"
                                                                value={combo.sku}
                                                                onChange={(e) => updateVariationCombination(comboIndex, 'sku', e.target.value)}
                                                                placeholder="Enter SKU *"
                                                                required
                                                                className="w-full min-w-[150px] px-3 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                            />
                                                        </td>

                                                        {/* UPC */}
                                                        <td className="px-4 py-3 w-40">
                                                            <input
                                                                type="text"
                                                                value={combo.upc}
                                                                onChange={(e) => updateVariationCombination(comboIndex, 'upc', e.target.value)}
                                                                placeholder="Enter UPC *"
                                                                required
                                                                maxLength={13}
                                                                className="w-full min-w-[150px] px-3 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                            />
                                                        </td>

                                                        {/* Weight */}
                                                        <td className="px-4 py-3 w-32">
                                                            <input
                                                                type="number"
                                                                value={combo.weight || ''}
                                                                onChange={(e) => updateVariationCombination(comboIndex, 'weight', e.target.value)}
                                                                placeholder="0.00 *"
                                                                step="0.01"
                                                                min="0"
                                                                required
                                                                className="w-full min-w-[100px] px-3 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                            />
                                                        </td>

                                                        {/* Dimensions */}
                                                        <td className="px-4 py-3 w-64">
                                                            <div className="flex items-center gap-2">
                                                                <input
                                                                    type="number"
                                                                    value={combo.length}
                                                                    onChange={(e) => updateVariationCombination(comboIndex, 'length', e.target.value)}
                                                                    placeholder="L *"
                                                                    step="0.01"
                                                                    required
                                                                    className="w-20 px-2 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                                />
                                                                <X size={12} className="text-gray-400 flex-shrink-0" />
                                                                <input
                                                                    type="number"
                                                                    value={combo.width}
                                                                    onChange={(e) => updateVariationCombination(comboIndex, 'width', e.target.value)}
                                                                    placeholder="W *"
                                                                    step="0.01"
                                                                    required
                                                                    className="w-20 px-2 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                                />
                                                                <X size={12} className="text-gray-400 flex-shrink-0" />
                                                                <input
                                                                    type="number"
                                                                    value={combo.height}
                                                                    onChange={(e) => updateVariationCombination(comboIndex, 'height', e.target.value)}
                                                                    placeholder="H *"
                                                                    step="0.01"
                                                                    required
                                                                    className="w-20 px-2 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                                />
                                                            </div>
                                                        </td>

                                                        {/* Unit Cost (Read-only) */}
                                                        <td className="px-4 py-3 w-32">
                                                            <input
                                                                type="text"
                                                                value={combo.unitPrice ? `₱${parseFloat(combo.unitPrice).toFixed(2)}` : ''}
                                                                disabled
                                                                className="w-full min-w-[120px] px-3 py-2 text-sm border border-gray-300 rounded bg-gray-100 cursor-not-allowed text-gray-900"
                                                                placeholder="Set via PO"
                                                            />
                                                            {!combo.unitPrice && (
                                                                <p className="text-xs text-gray-500 mt-1">
                                                                    Set in Purchase Orders
                                                                </p>
                                                            )}
                                                        </td>

                                                        {/* ── Company Prices (UPDATED) ── */}
                                                        <td className="px-4 py-3" style={{ minWidth: '360px' }}>
                                                            {/* Apply-to-all row */}
                                                            <div className="flex items-center gap-2 mb-2 pb-2 border-b border-gray-200">
                                                                <span className="text-xs font-semibold text-gray-600 flex-shrink-0">Apply all:</span>
                                                                <div className="flex items-center gap-1 flex-1">
                                                                    <span className="text-sm text-gray-500 flex-shrink-0">₱</span>
                                                                    <input
                                                                        type="number"
                                                                        placeholder="0.00"
                                                                        step="0.01"
                                                                        min="0"
                                                                        id={`apply-all-price-${comboIndex}`}
                                                                        className="w-full px-2 py-1 text-sm border border-blue-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-blue-50"
                                                                    />
                                                                </div>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        const input = document.getElementById(`apply-all-price-${comboIndex}`);
                                                                        if (input && input.value) {
                                                                            applyPriceToAllCompanies(comboIndex, input.value);
                                                                        }
                                                                    }}
                                                                    className="flex-shrink-0 flex items-center gap-1 px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition font-medium"
                                                                    title="Apply this price to all companies"
                                                                >
                                                                    <Copy size={12} />
                                                                    Apply
                                                                </button>
                                                            </div>

                                                            {/* Scrollable company list — shows 3 rows (~108px), scrollable beyond */}
                                                            <div
                                                                className="space-y-1.5 overflow-y-auto pr-1"
                                                                style={{ maxHeight: '108px' }}
                                                            >
                                                                {companies.map((company) => (
                                                                    <div key={company.id} className="flex items-center gap-2">
                                                                        {/* Company name: wraps to 2 lines, no ellipsis */}
                                                                        <label
                                                                            className="text-xs text-gray-700 font-medium flex-shrink-0"
                                                                            style={{
                                                                                width: '200px',
                                                                                display: '-webkit-box',
                                                                                WebkitLineClamp: 2,
                                                                                WebkitBoxOrient: 'vertical',
                                                                                overflow: 'hidden',
                                                                                lineHeight: '1.3',
                                                                            }}
                                                                            title={company.companyName}
                                                                        >
                                                                            {company.companyName}
                                                                        </label>
                                                                        <div className="flex items-center gap-1 flex-shrink-0" style={{ width: '140px' }}>
                                                                            <span className="text-sm text-gray-500">₱</span>
                                                                            <input
                                                                                type="text"
                                                                                inputMode="decimal"
                                                                                value={formatPriceDisplay(combo.companyPrices[company.id])}
                                                                                onChange={(e) => {
                                                                                    const val = e.target.value;
                                                                                    if (/^\d*\.?\d*$/.test(val)) {
                                                                                        updateVariationCompanyPrice(comboIndex, company.id, val);
                                                                                    }
                                                                                }}
                                                                                onBlur={(e) => {
                                                                                    const val = parseFloat(e.target.value);
                                                                                    if (!isNaN(val)) {
                                                                                        updateVariationCompanyPrice(comboIndex, company.id, val.toFixed(2));
                                                                                    }
                                                                                }}
                                                                                placeholder="0.00 *"
                                                                                required
                                                                                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                                            />
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </td>

                                                        <td className="px-4 py-3" style={{ minWidth: '360px' }}>
                                                            <div className="mb-2 pb-2 border-b border-transparent" style={{ height: '32px' }} />
                                                            <div
                                                                className="space-y-1.5 overflow-y-auto pr-1"
                                                                style={{ maxHeight: '108px' }}
                                                            >
                                                                {companies.map((company) => (
                                                                    <div key={company.id} className="flex items-center gap-2">
                                                                        <label
                                                                            className="text-xs text-gray-700 font-medium flex-shrink-0"
                                                                            style={{
                                                                                width: '200px',
                                                                                display: '-webkit-box',
                                                                                WebkitLineClamp: 2,
                                                                                WebkitBoxOrient: 'vertical',
                                                                                overflow: 'hidden',
                                                                                lineHeight: '1.3',
                                                                            }}
                                                                            title={company.companyName}
                                                                        >
                                                                            {company.companyName}
                                                                        </label>
                                                                        <div className="flex items-center gap-1 flex-shrink-0" style={{ width: '140px' }}>
                                                                            <input
                                                                                type="text"
                                                                                value={(combo.companySkus && combo.companySkus[company.id]) || ''}
                                                                                onChange={(e) => updateVariationCompanySku(comboIndex, company.id, e.target.value)}
                                                                                placeholder="Enter SKU *"
                                                                                required
                                                                                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                                            />
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>

                                    {/* Bulk Actions */}
                                    <div className="bg-gray-50 px-4 py-3 border-t border-gray-200">
                                        <div className="flex items-center justify-end">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    if (window.confirm('Clear all variation data?')) {
                                                        setVariationCombinations(variationCombinations.map(combo => ({
                                                            ...combo,
                                                            sku: '',
                                                            upc: '',
                                                            weight: '',
                                                            length: '',
                                                            width: '',
                                                            height: '',
                                                            companyPrices: {},
                                                            companySkus: {}
                                                        })));
                                                    }
                                                }}
                                                className="text-sm text-red-600 hover:text-red-700 font-medium"
                                            >
                                                Clear All Data
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
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
                            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                        >
                            {editingProduct ? 'Update Product' : 'Create Product'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ProductModal;