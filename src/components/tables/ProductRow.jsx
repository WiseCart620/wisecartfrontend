import React, { useState } from 'react';
import {
    Edit2,
    Trash2,
    Calendar,
    Package,
    ChevronDown
} from 'lucide-react';

const ProductRow = ({
    product,
    onEdit,
    onDelete,
    suppliers = []
}) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [imageError, setImageError] = useState(false);

    const getImageUrl = (imageUrl) => {
        if (!imageUrl) return getPlaceholderImage();

        if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
            return imageUrl;
        }

        const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

        let cleanPath = imageUrl.trim();
        if (cleanPath.startsWith('/uploads/')) {
            cleanPath = cleanPath.substring('/uploads/'.length);
        }
        if (cleanPath.startsWith('uploads/')) {
            cleanPath = cleanPath.substring('uploads/'.length);
        }

        return `${API_BASE_URL}/files/serve?path=${encodeURIComponent(cleanPath)}`;
    };

    const getPlaceholderImage = () => {
        return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2VlZSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiM5OTkiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5ObyBJbWFnZTwvdGV4dD48L3N2Zz4=';
    };

    const formatDate = (dateString) => {
        if (!dateString) return '-';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    const getDaysSinceCreation = (dateString) => {
        if (!dateString) return null;
        const created = new Date(dateString);
        const now = new Date();
        const diffTime = Math.abs(now - created);
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        return diffDays;
    };

    const hasVariations = product.variations && product.variations.length > 0;
    const daysSinceCreation = getDaysSinceCreation(product.createdAt);

    // Helper function to get unique suppliers from product
    const getProductSuppliers = () => {
        let supplierList = [];
        
        // Check if product has suppliers array (from API)
        if (product.suppliers && Array.isArray(product.suppliers)) {
            supplierList = product.suppliers;
        }
        
        // Check if product has supplierIds (from form data)
        if (product.supplierIds && Array.isArray(product.supplierIds)) {
            const suppliersFromIds = product.supplierIds
                .map(id => suppliers.find(s => s.id === id))
                .filter(Boolean);
            
            // Merge with existing suppliers, avoiding duplicates by ID
            supplierList = [...supplierList, ...suppliersFromIds];
        }
        
        // Remove duplicates based on supplier ID
        const uniqueSuppliers = [];
        const seenIds = new Set();
        
        supplierList.forEach(supplier => {
            if (supplier && supplier.id && !seenIds.has(supplier.id)) {
                seenIds.add(supplier.id);
                uniqueSuppliers.push(supplier);
            }
        });
        
        return uniqueSuppliers;
    };

    const productSuppliers = getProductSuppliers();

    const VariationImage = ({ imageUrl, alt }) => {
        const [varImageError, setVarImageError] = useState(false);

        const getVarImageUrl = (url) => {
            if (!url) return getPlaceholderImage();

            if (url.startsWith('http://') || url.startsWith('https://')) {
                return url;
            }

            const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

            let cleanPath = url.trim();
            if (cleanPath.startsWith('/uploads/')) {
                cleanPath = cleanPath.substring('/uploads/'.length);
            }
            if (cleanPath.startsWith('uploads/')) {
                cleanPath = cleanPath.substring('uploads/'.length);
            }

            return `${API_BASE_URL}/files/serve?path=${encodeURIComponent(cleanPath)}`;
        };

        if (imageUrl && !varImageError) {
            return (
                <div className="w-10 h-10 overflow-hidden rounded border border-gray-200">
                    <img
                        src={getVarImageUrl(imageUrl)}
                        alt={alt}
                        className="w-full h-full object-cover"
                        onError={() => setVarImageError(true)}
                    />
                </div>
            );
        }

        return (
            <div className="w-10 h-10 bg-gray-100 rounded border border-gray-200 flex items-center justify-center">
                <Package size={16} className="text-gray-400" />
            </div>
        );
    };

    return (
        <>
            {/* Parent Row */}
            <tr className="hover:bg-gray-50">
                <td className="px-6 py-4">
                    {hasVariations && (
                        <button
                            onClick={() => setIsExpanded(!isExpanded)}
                            className="p-1 hover:bg-gray-200 rounded transition"
                        >
                            <ChevronDown
                                size={18}
                                className={`transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                            />
                        </button>
                    )}
                </td>

                <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                        {product.imageUrl ? (
                            <img
                                src={getImageUrl(product.imageUrl)}
                                alt={product.productName}
                                className="w-12 h-12 object-cover rounded-lg border border-gray-200"
                                onError={(e) => {
                                    console.error('Image failed to load:', product.imageUrl);
                                    e.target.src = getPlaceholderImage();
                                }}
                            />
                        ) : (
                            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                                <Package size={24} className="text-blue-600" />
                            </div>
                        )}
                        <div>
                            <div className="font-medium text-gray-900">{product.productName}</div>
                            {product.brand && <div className="text-sm text-gray-500">{product.brand}</div>}
                            {!hasVariations && product.sku && (
                                <div className="text-xs text-gray-400 mt-1">SKU: {product.sku}</div>
                            )}
                        </div>
                    </div>
                </td>

                <td className="px-6 py-4 text-sm text-gray-600">
                    {product.category || '-'}
                </td>

                <td className="px-6 py-4">
                    {productSuppliers.length > 0 ? (
                        <div className="flex flex-wrap gap-1 max-w-[250px]">
                            {productSuppliers.slice(0, 3).map((supplier, index) => (
                                <span
                                    key={`${supplier.id}-${index}`}
                                    className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium whitespace-nowrap"
                                    title={supplier.country || ''}
                                >
                                    {supplier.name || 'Unknown'}
                                </span>
                            ))}
                            {productSuppliers.length > 3 && (
                                <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">
                                    +{productSuppliers.length - 3}
                                </span>
                            )}
                        </div>
                    ) : (
                        <span className="text-sm text-gray-400">-</span>
                    )}
                </td>

                <td className="px-6 py-4">
                    {hasVariations ? (
                        <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                            {product.variations.length} variation{product.variations.length > 1 ? 's' : ''}
                        </span>
                    ) : (
                        <div className="space-y-1">
                            {product.unitCost ? (
                                <div className="text-sm font-medium text-green-600">
                                    ₱{Number(product.unitCost).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                                </div>
                            ) : (
                                <span className="text-xs text-gray-400">No price set</span>
                            )}
                        </div>
                    )}
                </td>

                <td className="px-6 py-4">
                    {product.createdAt ? (
                        <div className="flex flex-col">
                            <div className="flex items-center gap-2 text-sm text-gray-900">
                                <Calendar size={14} className="text-gray-400" />
                                <span>{formatDate(product.createdAt)}</span>
                            </div>
                            {daysSinceCreation !== null && (
                                <span className="text-xs text-gray-500 mt-1">
                                    {daysSinceCreation === 0
                                        ? 'Today'
                                        : daysSinceCreation === 1
                                            ? '1 day ago'
                                            : `${daysSinceCreation} days ago`}
                                </span>
                            )}
                        </div>
                    ) : (
                        <span className="text-sm text-gray-400">-</span>
                    )}
                </td>

                <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                        <button
                            onClick={() => onEdit(product)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                            title="Edit product"
                        >
                            <Edit2 size={18} />
                        </button>
                        <button
                            onClick={() => onDelete(product.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                            title="Delete product"
                        >
                            <Trash2 size={18} />
                        </button>
                    </div>
                </td>
            </tr>

            {/* Expanded Variations */}
            {isExpanded && hasVariations && (
                <tr>
                    <td colSpan="7" className="bg-gray-50 px-6 py-4">
                        <div className="pl-12">
                            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                                <table className="w-full">
                                    <thead className="bg-gray-100">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Image</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Variation</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">SKU</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">UPC</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Weight</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Dimensions</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Company Prices</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Unit Price</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200">
                                        {product.variations.map((variation, index) => (
                                            <tr key={index} className="hover:bg-gray-50">
                                                <td className="px-4 py-3">
                                                    <VariationImage
                                                        imageUrl={variation.imageUrl}
                                                        alt={variation.combinationDisplay}
                                                    />
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex flex-wrap gap-1">
                                                        {variation.combinationDisplay?.split('-').map((attr, i) => (
                                                            <span key={i} className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs font-medium">
                                                                {attr}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-sm text-gray-900">{variation.sku || '-'}</td>
                                                <td className="px-4 py-3 text-sm text-gray-600">{variation.upc || '-'}</td>
                                                <td className="px-4 py-3 text-sm text-gray-600">
                                                    {variation.weight ? `${variation.weight} kg` : '-'}
                                                </td>
                                                <td className="px-4 py-3 text-sm text-gray-600">
                                                    {variation.dimensions || '-'}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="space-y-1">
                                                        {variation.companyPrices && variation.companyPrices.length > 0 ? (
                                                            variation.companyPrices.slice(0, 2).map((cp, idx) => (
                                                                <div key={idx} className="text-xs">
                                                                    <span className="font-medium text-green-600">
                                                                        ₱{Number(cp.price).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                                                                    </span>
                                                                    <span className="text-gray-500 ml-1">({cp.company?.companyName})</span>
                                                                </div>
                                                            ))
                                                        ) : (
                                                            <span className="text-xs text-gray-400">No prices set</span>
                                                        )}
                                                        {variation.companyPrices && variation.companyPrices.length > 2 && (
                                                            <div className="text-xs text-gray-500">+{variation.companyPrices.length - 2} more</div>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-sm font-medium text-gray-900">
                                                    {variation.unitPrice ? `₱${Number(variation.unitPrice).toLocaleString('en-PH', { minimumFractionDigits: 2 })}` : '-'}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </td>
                </tr>
            )}
        </>
    );
};

export default ProductRow;