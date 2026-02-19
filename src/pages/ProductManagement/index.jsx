import React, { useState, useEffect } from 'react';
import {
  Plus, Search, ChevronLeft, ChevronRight, Calendar
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import { api, API_BASE_URL } from '../../services/api';

// Components
import LoadingOverlay from '../../components/common/LoadingOverlay';
import SearchableDropdown from '../../components/common/SearchableDropdown';
import ProductRow from '../../components/tables/ProductRow';
import ProductModal from '../../components/modals/ProductModal';

// Hooks
import useProductManagement from '../../hooks/data/useProductManagement';

// Constants
import { productCategories } from '../../constants/productConstants';

const ProductManagement = () => {
  const {
    products,
    companies,
    suppliers,
    loading,
    actionLoading,
    loadingMessage,
    variationTypes,
    variationCombinations,
    uploadingImage,
    uploadingVariationImage,
    variationInputRefs,
    loadData,
    handleImageUpload,
    updateVariationCombination,
    updateVariationCompanyPrice,
    submitProduct: submitProductHook,
    deleteProduct: deleteProductHook,
    resetForm: resetFormHook,
    setVariationTypes,
    setVariationCombinations,
    setUploadingImage,
    setUploadingVariationImage
  } = useProductManagement(api);

  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  const [formData, setFormData] = useState({
    productName: '',
    category: '',
    upc: '',
    sku: '',
    supplierIds: [],
    supplierCountries: {},
    countryOfOrigin: '',
    companyPrices: {},
    companyBasePrices: {},
    assignToRemainingBase: false,
    remainingBasePriceValue: '',
    assignToRemaining: false,
    remainingCompaniesPrice: '',
    length: '',
    width: '',
    height: '',
    weight: '',
    materials: '',
    brand: '',
    shelfLife: '',
    unitCost: '',
    uom: '',
    imageUrl: '',
    variations: []
  });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (formData.supplierIds?.length > 0) {
      const uniqueIds = [...new Set(formData.supplierIds)];
      if (uniqueIds.length !== formData.supplierIds.length) {
        console.log('Cleaning up duplicates:', {
          before: formData.supplierIds,
          after: uniqueIds
        });
        setFormData(prev => ({
          ...prev,
          supplierIds: uniqueIds
        }));
      }
    }
  }, [formData.supplierIds]);

  useEffect(() => {
    if (formData.supplierIds?.length > 0) {
      console.log('Current supplierIds:', formData.supplierIds);
      console.log('Unique supplierIds:', [...new Set(formData.supplierIds)]);
      console.log('Count discrepancy:',
        formData.supplierIds.length - [...new Set(formData.supplierIds)].length
      );
    }
  }, [formData.supplierIds]);

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getSortedProducts = (products) => {
    if (!sortConfig.key) return products;

    return [...products].sort((a, b) => {
      let aValue = a[sortConfig.key];
      let bValue = b[sortConfig.key];

      if (sortConfig.key === 'createdAt') {
        aValue = aValue ? new Date(aValue).getTime() : 0;
        bValue = bValue ? new Date(bValue).getTime() : 0;
      }

      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name === 'upc') {
      const numericValue = value.replace(/\D/g, '').slice(0, 13);
      setFormData(prev => ({ ...prev, [name]: numericValue }));
      return;
    }
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSupplierToggle = (supplierId) => {
    const id = parseInt(supplierId);
    setFormData(prev => {
      // Ensure we're working with unique IDs from the start
      const currentIds = [...new Set(prev.supplierIds || [])];
      const exists = currentIds.includes(id);

      let newIds;
      if (exists) {
        newIds = currentIds.filter(sid => sid !== id);
      } else {
        newIds = [...currentIds, id];
      }

      // Update supplier countries
      const newSupplierCountries = { ...prev.supplierCountries };
      if (!exists) {
        const supplier = suppliers.find(s => s.id === id);
        if (supplier?.country) {
          newSupplierCountries[id] = supplier.country;
        }
      } else {
        delete newSupplierCountries[id];
      }

      return {
        ...prev,
        supplierIds: newIds,
        supplierCountries: newSupplierCountries
      };
    });
  };

  const handleEdit = (product) => {
    setEditingProduct(product);

    const companyPricesObj = {};
    if (product.companyPrices) {
      product.companyPrices.forEach(cp => {
        if (cp.company?.id) {
          companyPricesObj[cp.company.id] = cp.price;
        }
      });
    }

    const companyBasePricesObj = {};
    if (product.companyBasePrices && product.companyBasePrices.length > 0) {
      product.companyBasePrices.forEach(cbp => {
        if (cbp.company?.id) {
          companyBasePricesObj[cbp.company.id] = cbp.basePrice;
        }
      });
    }

    const dims = product.dimensions ? product.dimensions.split('×') : ['', '', ''];

    const supplierCountries = {};
    if (product.suppliers) {
      product.suppliers.forEach(s => {
        if (s.country) supplierCountries[s.id] = s.country;
      });
    }

    const supplierIds = product.suppliers
      ? [...new Set(product.suppliers.map(s => s.id))]
      : [];

    setFormData({
      productName: product.productName || '',
      category: product.category || '',
      upc: product.upc || '',
      sku: product.sku || '',
      supplierIds: product.suppliers ? product.suppliers.map(s => s.id) : [],
      supplierCountries,
      countryOfOrigin: product.countryOfOrigin || '',
      companyPrices: companyPricesObj,
      companyBasePrices: companyBasePricesObj,
      assignToRemainingBase: false,
      remainingBasePriceValue: '',
      assignToRemaining: false,
      remainingCompanyPrice: '',
      length: dims[0] || '',
      width: dims[1] || '',
      height: dims[2] || '',
      weight: product.weight || '',
      materials: product.materials || '',
      brand: product.brand || '',
      shelfLife: product.shelfLife || '',
      unitCost: product.unitCost || '',
      uom: product.uom || '',
      imageUrl: product.imageUrl || '',
      variations: []
    });

    setVariationTypes([]);
    setVariationCombinations([]);

    if (product.variations && product.variations.length > 0) {
      const typeMap = new Map();

      product.variations.forEach(v => {
        let attrs = {};
        if (v.attributesJson) {
          try {
            attrs = JSON.parse(v.attributesJson);
          } catch (e) {
            attrs = { [v.variationType]: v.variationValue };
          }
        } else {
          attrs = { [v.variationType]: v.variationValue };
        }

        Object.entries(attrs).forEach(([type, value]) => {
          if (!typeMap.has(type)) {
            const isCustomType = !['SIZE', 'COLOR', 'PACK', 'FLAVOR', 'MATERIAL', 'STYLE', 'VOLUME'].includes(type);
            typeMap.set(type, {
              type: isCustomType ? 'OTHER' : type,
              values: [],
              customType: isCustomType ? type : ''
            });
          }

          if (!typeMap.get(type).values.includes(value)) {
            typeMap.get(type).values.push(value);
          }
        });
      });

      const types = Array.from(typeMap.values());
      setVariationTypes(types);

      setTimeout(() => {
        const combos = product.variations.map(v => {
          let attrs = {};
          if (v.attributesJson) {
            try {
              attrs = JSON.parse(v.attributesJson);
            } catch (e) {
              attrs = { [v.variationType]: v.variationValue };
            }
          } else {
            attrs = { [v.variationType]: v.variationValue };
          }

          const comboKey = Object.values(attrs).join('-');
          const dims = v.dimensions ? v.dimensions.split('×') : ['', '', ''];

          const companyPricesMap = {};
          const companySkusMap = {};
          if (v.companyPrices) {
            v.companyPrices.forEach(cp => {
              if (cp.company?.id) {
                companyPricesMap[cp.company.id] = cp.price;
                if (cp.companySku) {
                  companySkusMap[cp.company.id] = cp.companySku;
                }
              }
            });
          }

          return {
            id: v.id,
            combination: comboKey,
            attributes: attrs,
            sku: v.sku || '',
            upc: v.upc || '',
            weight: v.weight !== null && v.weight !== undefined ? v.weight : '',
            length: dims[0] || '',
            width: dims[1] || '',
            height: dims[2] || '',
            imageUrl: v.imageUrl || '',
            unitPrice: v.unitPrice || null,
            companyPrices: companyPricesMap,
            companySkus: companySkusMap
          };
        });

        setVariationCombinations(combos);
      }, 100);
    }

    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this product? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await deleteProductHook(id);

      if (response && response.success) {
        toast.success('Product deleted successfully');
        await loadData();

        const filtered = getSortedProducts(
          products.filter(product =>
            product.productName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            product.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            product.upc?.toLowerCase().includes(searchTerm.toLowerCase())
          )
        );

        if (filtered.length % itemsPerPage === 1 && currentPage > 1) {
          setCurrentPage(currentPage - 1);
        }
      } else {
        toast.error(response?.error || 'Failed to delete product');
      }
    } catch (error) {
      toast.error('Failed to delete product');
      console.error('Delete error:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.productName) {
      toast.error('Please fill in product name');
      return;
    }

    try {
      const response = await submitProductHook(formData, editingProduct, variationCombinations, companies);

      if (response && response.success) {
        toast.success(editingProduct ? 'Product updated successfully' : 'Product created successfully');
        setShowModal(false);
        resetForm();
        await loadData();
        setCurrentPage(1);
      }
    } catch (error) {
      console.error('Submit error:', error);
    }
  };

  const resetForm = () => {
    setFormData(resetFormHook());
    setVariationTypes([]);
    setVariationCombinations([]);
    setEditingProduct(null);
    setSelectedSupplier(null);
  };

  const filteredProducts = getSortedProducts(
    products.filter(product =>
      product.productName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.upc?.toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  const existingCategories = React.useMemo(() => {
    return [...new Set(
      products
        .map(p => p.category)
        .filter(cat => cat && cat.trim() !== '')
    )].sort();
  }, [products]);

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentProducts = filteredProducts.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);
  const nextPage = () => setCurrentPage(prev => Math.min(prev + 1, totalPages));
  const prevPage = () => setCurrentPage(prev => Math.max(prev - 1, 1));

  const getPageNumbers = () => {
    const pageNumbers = [];
    const maxVisiblePages = 5;

    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) pageNumbers.push(i);
    } else {
      const startPage = Math.max(1, currentPage - 2);
      const endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
      for (let i = startPage; i <= endPage; i++) pageNumbers.push(i);
    }

    return pageNumbers;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <LoadingOverlay show={true} message="Loading products..." />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-full mx-auto px-8">
      <LoadingOverlay show={actionLoading} message={loadingMessage} />
      <Toaster position="top-right" />

      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Product Management</h1>
        <p className="text-gray-600 mt-1">Manage your product catalog</p>
      </div>

      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search by name, SKU, or UPC..."
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
          Add Product
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase w-12"></th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Supplier</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Variations</th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 transition"
                  onClick={() => handleSort('createdAt')}
                >
                  <div className="flex items-center gap-2">
                    Created Date
                    {sortConfig.key === 'createdAt' && (
                      <span className="text-blue-600">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {currentProducts.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-8 text-center text-gray-500">
                    {filteredProducts.length === 0 ? 'No products found' : 'No products on this page'}
                  </td>
                </tr>
              ) : (
                currentProducts.map((product) => (
                  <ProductRow
                    key={product.id}
                    product={product}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    API_BASE_URL={API_BASE_URL}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>

        {filteredProducts.length > 0 && (
          <div className="px-6 py-4 border-t border-gray-200 bg-white flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-sm text-gray-700">
              Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, filteredProducts.length)} of {filteredProducts.length} results
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

              <button
                onClick={nextPage}
                disabled={currentPage === totalPages}
                className={`p-2 rounded-lg border ${currentPage === totalPages
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

      {showModal && (
        <ProductModal
          editingProduct={editingProduct}
          formData={formData}
          setFormData={setFormData}
          variationTypes={variationTypes}
          setVariationTypes={setVariationTypes}
          variationCombinations={variationCombinations}
          setVariationCombinations={setVariationCombinations}
          variationInputRefs={variationInputRefs}
          uploadingImage={uploadingImage}
          uploadingVariationImage={uploadingVariationImage}
          handleImageUpload={handleImageUpload}
          companies={companies}
          suppliers={suppliers}
          existingCategories={existingCategories}
          productCategories={productCategories}
          selectedSupplier={selectedSupplier}
          setSelectedSupplier={setSelectedSupplier}
          handleInputChange={handleInputChange}
          handleSupplierToggle={handleSupplierToggle}
          onClose={() => {
            setShowModal(false);
            resetForm();
          }}
          onSubmit={handleSubmit}
        />
      )}
    </div>
  );
};

export default ProductManagement;