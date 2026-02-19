import { useState, useEffect, useRef, useCallback } from 'react';
import { toast } from 'react-hot-toast';

const useProductManagement = (api) => {
    const [products, setProducts] = useState([]);
    const [companies, setCompanies] = useState([]);
    const [suppliers, setSuppliers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('');
    const [variationTypes, setVariationTypes] = useState([]);
    const [variationCombinations, setVariationCombinations] = useState([]);
    const [uploadingImage, setUploadingImage] = useState(false);
    const [uploadingVariationImage, setUploadingVariationImage] = useState({});

    const variationInputRefs = useRef({});

    const loadData = async () => {
        setLoading(true);
        setLoadingMessage('Loading products...');
        try {
            const [productsResponse, companiesResponse, suppliersResponse] = await Promise.all([
                api.get('/products'),
                api.get('/companies'),
                api.get('/suppliers')
            ]);

            if (productsResponse.success) {
                setProducts(productsResponse.data || []);
            } else {
                toast.error(productsResponse.error || 'Failed to load products');
            }

            if (companiesResponse.success) {
                setCompanies(companiesResponse.data || []);
            } else {
                toast.error(companiesResponse.error || 'Failed to load companies');
            }

            if (suppliersResponse.success) {
                setSuppliers(suppliersResponse.data || []);
            } else {
                toast.error(suppliersResponse.error || 'Failed to load suppliers');
            }
        } catch (error) {
            toast.error('Failed to load data');
            console.error('Load data error:', error);
            setProducts([]);
            setCompanies([]);
            setSuppliers([]);
        } finally {
            setLoading(false);
            setLoadingMessage('');
        }
    };

    const handleImageUpload = async (file, isVariation = false, variationIndex = null) => {
        if (!file) {
            toast.error('Please select a file');
            return null;
        }

        if (!file.type.startsWith('image/')) {
            toast.error('Please select an image file');
            return null;
        }

        if (file.size > 5 * 1024 * 1024) {
            toast.error('Image must be less than 5MB');
            return null;
        }

        const formData = new FormData();
        formData.append('file', file);
        const prefix = isVariation ? 'variation' : 'product';
        formData.append('prefix', prefix);

        if (isVariation) {
            setUploadingVariationImage(prev => ({ ...prev, [variationIndex]: true }));
        } else {
            setUploadingImage(true);
        }

        try {
            const response = await api.upload('/upload/image', formData);

            if (response.success) {
                const imageUrl = response.data?.data?.url;
                if (!imageUrl) {
                    console.error('❌ No imageUrl in response data. Full data:', response.data);
                    toast.error('Upload succeeded but no URL returned from server');
                    return null;
                }

                toast.success('Image uploaded successfully');
                return imageUrl;
            } else {
                console.error('❌ Upload failed:', response.error);
                toast.error(response.error || 'Failed to upload image');
                return null;
            }
        } catch (error) {
            console.error('❌ Upload error:', error);
            toast.error('Failed to upload image');
            return null;
        } finally {
            if (isVariation) {
                setUploadingVariationImage(prev => ({ ...prev, [variationIndex]: false }));
            } else {
                setUploadingImage(false);
            }
        }
    };



    const generateVariationCombinations = useCallback(() => {
        if (variationTypes.length === 0 || !variationTypes.every(vt => vt.values.length > 0)) {
            setVariationCombinations([]);
            return;
        }

        const generateCombos = (types, index = 0, current = {}) => {
            if (index === types.length) {
                const comboKey = Object.values(current).join('-');
                return [{
                    combination: comboKey,
                    attributes: { ...current },
                    sku: '',
                    upc: '',
                    weight: '',
                    length: '',
                    width: '',
                    height: '',
                    companyPrices: {},
                    companySkus: {}
                }];
            }

            const results = [];
            const currentType = types[index];
            const typeKey = currentType.type === 'OTHER' ? currentType.customType : currentType.type;

            for (const value of currentType.values) {
                results.push(...generateCombos(types, index + 1, { ...current, [typeKey]: value }));
            }

            return results;
        };

        setVariationCombinations(prevCombos => {
            const preservedDataMap = new Map();

            prevCombos.forEach(combo => {
                const clonedPrices = {};
                if (combo.companyPrices) {
                    Object.keys(combo.companyPrices).forEach(key => {
                        clonedPrices[key] = combo.companyPrices[key];
                    });
                }

                preservedDataMap.set(combo.combination, {
                    sku: combo.sku || '',
                    upc: combo.upc || '',
                    weight: combo.weight !== undefined && combo.weight !== null && combo.weight !== '' ? combo.weight : '',
                    length: combo.length || '',
                    width: combo.width || '',
                    height: combo.height || '',
                    companyPrices: clonedPrices,
                    companySkus: combo.companySkus ? { ...combo.companySkus } : {},
                    attributes: combo.attributes
                });
            });

            const newCombinations = generateCombos(variationTypes);

            const result = newCombinations.map(newCombo => {
                let preserved = preservedDataMap.get(newCombo.combination);

                if (!preserved) {
                    const newAttrValues = new Set(Object.values(newCombo.attributes));

                    for (const [key, data] of preservedDataMap.entries()) {
                        const preservedAttrValues = new Set(Object.values(data.attributes));
                        const hasOverlap = [...preservedAttrValues].every(val => newAttrValues.has(val));

                        if (hasOverlap) {
                            preserved = data;
                            break;
                        }
                    }
                }

                if (preserved) {
                    return {
                        combination: newCombo.combination,
                        attributes: newCombo.attributes,
                        sku: preserved.sku,
                        upc: preserved.upc,
                        weight: preserved.weight,
                        length: preserved.length,
                        width: preserved.width,
                        height: preserved.height,
                        companyPrices: { ...preserved.companyPrices },
                        companySkus: { ...preserved.companySkus }
                    };
                }

                return {
                    combination: newCombo.combination,
                    attributes: newCombo.attributes,
                    sku: '',
                    upc: '',
                    weight: '',
                    length: '',
                    width: '',
                    height: '',
                    companyPrices: {}
                };
            });

            return result;
        });
    }, [variationTypes]);

    useEffect(() => {
        if (variationTypes.length > 0 && variationTypes.every(vt => vt.values.length > 0)) {
            generateVariationCombinations();
        } else if (variationTypes.length === 0) {
            setVariationCombinations([]);
        }
    }, [variationTypes, generateVariationCombinations]);

    const updateVariationCombination = (index, field, value) => {
        setVariationCombinations(prev => {
            const newCombinations = [...prev];
            newCombinations[index][field] = value;
            return newCombinations;
        });
    };

    const updateVariationCompanyPrice = (comboIndex, companyId, price) => {
        setVariationCombinations(prev => {
            const newCombinations = [...prev];
            newCombinations[comboIndex].companyPrices[companyId] = price;
            return newCombinations;
        });
    };

    const submitProduct = async (formData, editingProduct, variationCombinations, companies) => {
        setActionLoading(true);
        setLoadingMessage(editingProduct ? 'Updating product...' : 'Creating product...');

        try {
            const normalizedVariations = [];

            if (variationCombinations.length > 0) {
                variationCombinations.forEach(combo => {
                    const variationData = {
                        id: combo.id || null,
                        attributes: combo.attributes,
                        sku: combo.sku || null,
                        upc: combo.upc || null,
                        weight: combo.weight ? parseFloat(combo.weight) : null,
                        dimensions: null,
                        imageUrl: combo.imageUrl || null,
                        companyPrices: []
                    };

                    // Build dimensions string
                    if (combo.length || combo.width || combo.height) {
                        const l = combo.length || '0';
                        const w = combo.width || '0';
                        const h = combo.height || '0';
                        variationData.dimensions = `${l}×${w}×${h}`;
                    }

                    Object.entries(combo.companyPrices).forEach(([companyId, price]) => {
                        if (price && parseFloat(price) > 0) {
                            variationData.companyPrices.push({
                                companyId: parseInt(companyId),
                                price: parseFloat(price),
                                companySku: combo.companySkus?.[companyId] || null
                            });
                        }
                    });

                    normalizedVariations.push(variationData);
                });
            }

            const companyPricesArray = [];

            Object.keys(formData.companyPrices).forEach(companyId => {
                const price = parseFloat(formData.companyPrices[companyId]);
                if (price > 0) {
                    companyPricesArray.push({
                        companyId: parseInt(companyId),
                        price: price
                    });
                }
            });

            if (formData.assignToRemaining && formData.remainingCompaniesPrice) {
                const assignedCompanyIds = new Set(Object.keys(formData.companyPrices).map(id => parseInt(id)));
                companies.forEach(company => {
                    if (!assignedCompanyIds.has(company.id)) {
                        companyPricesArray.push({
                            companyId: company.id,
                            price: parseFloat(formData.remainingCompaniesPrice)
                        });
                    }
                });
            }

            const companyBasePricesArray = [];

            if (variationCombinations.length === 0) {
                Object.keys(formData.companyBasePrices).forEach(companyId => {
                    const basePrice = parseFloat(formData.companyBasePrices[companyId]);
                    if (basePrice > 0) {
                        companyBasePricesArray.push({
                            companyId: parseInt(companyId),
                            basePrice: basePrice
                        });
                    }
                });

                if (formData.assignToRemainingBase && formData.remainingBasePriceValue) {
                    const assignedCompanyIds = new Set(Object.keys(formData.companyBasePrices).map(id => parseInt(id)));
                    companies.forEach(company => {
                        if (!assignedCompanyIds.has(company.id)) {
                            companyBasePricesArray.push({
                                companyId: company.id,
                                basePrice: parseFloat(formData.remainingBasePriceValue)
                            });
                        }
                    });
                }
            }

            let dimensionsString = null;
            if (variationCombinations.length === 0) {
                if (formData.length || formData.width || formData.height) {
                    const l = formData.length || '0';
                    const w = formData.width || '0';
                    const h = formData.height || '0';
                    dimensionsString = `${l}×${w}×${h}`;
                }
            }

            const payload = {
                productName: formData.productName,
                category: formData.category || null,
                upc: variationCombinations.length === 0 ? formData.upc : null,
                sku: variationCombinations.length === 0 ? formData.sku : null,
                supplierIds: formData.supplierIds || [],
                countryOfOrigin: formData.countryOfOrigin || null,
                weight: variationCombinations.length === 0 && formData.weight ? parseFloat(formData.weight) : null,
                dimensions: dimensionsString,
                materials: formData.materials || null,
                brand: formData.brand || null,
                shelfLife: formData.shelfLife || null,
                imageUrl: formData.imageUrl || null,
                uom: formData.uom || null,
                variations: normalizedVariations,
                companyPrices: companyPricesArray,
                companyBasePrices: companyBasePricesArray
            };

            let response;
            if (editingProduct) {
                response = await api.put(`/products/${editingProduct.id}`, payload);
            } else {
                response = await api.post('/products', payload);
            }

            return response;
        } catch (error) {
            console.error('Submit product error:', error);
            throw error;
        } finally {
            setActionLoading(false);
            setLoadingMessage('');
        }
    };

    const deleteProduct = async (id) => {
        setActionLoading(true);
        setLoadingMessage('Deleting product...');

        try {
            const response = await api.delete(`/products/${id}`);
            return response;
        } catch (error) {
            console.error('Delete product error:', error);
            throw error;
        } finally {
            setActionLoading(false);
            setLoadingMessage('');
        }
    };

    const resetForm = () => {
        return {
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
        };
    };

    return {
        // State
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

        // Setters
        setProducts,
        setCompanies,
        setSuppliers,
        setLoading,
        setActionLoading,
        setLoadingMessage,
        setVariationTypes,
        setVariationCombinations,
        setUploadingImage,
        setUploadingVariationImage,

        // Functions
        loadData,
        handleImageUpload,
        updateVariationCombination,
        updateVariationCompanyPrice,
        submitProduct,
        deleteProduct,
        resetForm
    };
};

export default useProductManagement;