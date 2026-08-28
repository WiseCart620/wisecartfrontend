import React from 'react';
import { X } from 'lucide-react';
import { formatCurrency, formatPHDateTime } from '../../utils/salesUtils';
import { months } from '../../constants/salesConstants';

const SaleViewModal = ({ sale, products, productPrices, onClose, productFilters = [] }) => {
  if (!sale) return null;

  const companyId = sale.company?.id;

  const hasActiveProductFilter = productFilters && productFilters.length > 0;
  const displayItems = hasActiveProductFilter
    ? (sale.items || []).filter(item =>
      productFilters.some(pf =>
        pf.productId === item.product?.id && (pf.variationId ?? null) === (item.variation?.id ?? null)
      )
    )
    : (sale.items || []);
  const displayTotal = hasActiveProductFilter
    ? displayItems.reduce((sum, item) => sum + (item.amount || 0), 0)
    : sale.totalAmount;

  const getOriginalPrice = (item) => {
    const product = products?.find(p => p.id === item.product.id);
    if (!product) return null;

    if (item.variation && Array.isArray(product.variations)) {
      const variation = product.variations.find(v => v.id === item.variation.id);
      const companyMatch = variation?.companyPrices?.find(cp => cp?.company?.id === companyId);
      return companyMatch?.price ?? null;
    }

    const companyBaseMatch = product.companyBasePrices?.find(cbp => cbp?.company?.id === companyId);
    return companyBaseMatch?.basePrice
      ?? productPrices?.[String(product.id)]
      ?? productPrices?.[product.id]
      ?? null;
  };

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl max-w-5xl w-full max-h-[95vh] overflow-y-auto shadow-2xl">
        <div className="p-8 border-b border-gray-200 flex justify-between items-center sticky top-0 bg-white rounded-t-2xl">
          <h2 className="text-2xl font-bold text-gray-900">Sale Details</h2>
          <button onClick={onClose} className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition">
            <X size={24} />
          </button>
        </div>

        <div className="p-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-8 mb-8">
            {[
              { label: 'Branch', primary: sale.branch.branchName, secondary: sale.branch.branchCode },
              { label: 'Company', primary: sale.company.companyName, secondary: `TIN: ${sale.tin || 'N/A'}` },
              { label: 'Period', primary: `${months[sale.month - 1]} ${sale.year}` },
            ].map(({ label, primary, secondary }) => (
              <div key={label} className="p-4 bg-gray-50 rounded-lg">
                <h3 className="font-semibold text-gray-700 mb-2">{label}</h3>
                <p className="text-gray-900 text-lg">{primary}</p>
                {secondary && <p className="text-gray-500">{secondary}</p>}
              </div>
            ))}

            <div className="p-4 bg-gray-50 rounded-lg">
              <h3 className="font-semibold text-gray-700 mb-2">Status</h3>
              <span className={`px-4 py-2 inline-flex text-sm leading-5 font-semibold rounded-full ${sale.status === 'INVOICED' ? 'bg-green-100 text-green-800' :
                sale.status === 'CONFIRMED' ? 'bg-blue-100 text-blue-800' :
                  'bg-yellow-100 text-yellow-800'
                }`}>
                {sale.status}
              </span>
              {sale.status === 'INVOICED' && sale.generatedBy && (
                <p className="text-sm text-gray-600 mt-2">Invoiced by: <span className="font-medium">{sale.generatedBy}</span></p>
              )}
              {sale.status === 'INVOICED' && sale.invoicedAt && (
                <p className="text-xs text-gray-500 mt-1">{formatPHDateTime(sale.invoicedAt)}</p>
              )}
            </div>

            <div className="p-4 bg-gray-50 rounded-lg">
              <h3 className="font-semibold text-gray-700 mb-2">Encoded By</h3>
              <p className="text-gray-900 text-lg">{sale.createdBy || sale.generatedBy || 'System'}</p>
              <p className="text-xs text-gray-500 mt-1">Created: {formatPHDateTime(sale.createdAt)}</p>
            </div>
          </div>

          <h3 className="font-semibold text-gray-700 mb-4 text-lg">
            Items{hasActiveProductFilter ? ` (filtered: ${displayItems.length} of ${sale.items?.length || 0})` : ''}
          </h3>
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  {['#', 'Product', 'SKU', 'UPC', 'Quantity', 'Unit Price', 'Amount'].map(h => (
                    <th key={h} className={`px-6 py-4 text-sm font-medium text-gray-700 ${h === '#' ? 'text-center' : h === 'Quantity' || h === 'Unit Price' || h === 'Amount' ? 'text-right' : 'text-left'}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {displayItems.length > 0 ? (
                  displayItems.map((item, i) => {
                    const originalPrice = getOriginalPrice(item);
                    const hasCustomPrice = originalPrice != null && Number(originalPrice) !== Number(item.unitPrice);

                    return (
                      <tr key={item.id || i} className="hover:bg-gray-50 transition">
                        <td className="px-6 py-4 text-center text-sm text-gray-400 font-medium">{i + 1}</td>
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">
                          {item.product.productName}
                          {item.variation && (
                            <div className="text-xs text-gray-500 mt-1">
                              {item.variation.combinationDisplay || (item.variation.variationType && item.variation.variationValue ? `${item.variation.variationType}: ${item.variation.variationValue}` : 'Variation')}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">{item.variation ? (item.variation.sku || '—') : (item.product.sku || '—')}</td>
                        <td className="px-6 py-4 text-sm text-gray-500">{item.variation ? (item.variation.upc || '—') : (item.product.upc || '—')}</td>
                        <td className="px-6 py-4 text-sm text-right font-semibold text-gray-900">{item.quantity.toLocaleString()}</td>
                        <td className="px-6 py-4 text-sm text-right text-gray-900">
                          <div className="flex flex-col items-end gap-0.5">
                            <span>{formatCurrency(item.unitPrice)}</span>
                            {hasCustomPrice && (
                              <span className="text-xs text-gray-400 line-through">{formatCurrency(originalPrice)}</span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-right font-bold text-blue-600">{formatCurrency(item.amount)}</td>
                      </tr>
                    );
                  })
                ) : (
                  <tr><td colSpan="7" className="px-6 py-12 text-center text-gray-500 italic">No items in this sale</td></tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-8 pt-6 border-t border-gray-200 text-right">
            <p className="text-3xl font-bold text-gray-900">Total: {formatCurrency(displayTotal)}</p>
          </div>
        </div>

        <div className="p-8 border-t border-gray-200 flex justify-end">
          <button onClick={onClose} className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition font-medium">Close</button>
        </div>
      </div>
    </div>
  );
};

export default SaleViewModal;