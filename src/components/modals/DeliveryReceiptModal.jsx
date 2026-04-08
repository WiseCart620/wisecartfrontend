// src/components/modals/DeliveryReceiptModal.jsx
import React, { useState } from 'react';
import { X, Printer, Check } from 'lucide-react';

const DeliveryReceiptModal = ({
  receiptData,
  onClose,
  onSave
}) => {
  const [receipt, setReceipt] = useState(receiptData);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    await onSave(receipt);
    setIsSaving(false);
  };

  const handlePrint = () => {
    document.querySelectorAll('.print-hidden').forEach(el => {
      el.classList.remove('print-hidden');
    });
    setTimeout(() => {
      window.print();
      setTimeout(() => {
        document.querySelectorAll('.print-hidden').forEach(el => {
          el.classList.add('print-hidden');
        });
      }, 500);
    }, 100);
  };

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl max-w-6xl w-full max-h-[95vh] overflow-y-auto shadow-2xl print:shadow-none print:max-h-none print:rounded-none">
        <div className="p-8 border-b border-gray-200 flex justify-between items-center sticky top-0 bg-white rounded-t-2xl z-10 print:hidden">
          <h2 className="text-2xl font-bold text-gray-900">Delivery Receipt</h2>
          <div className="flex gap-3">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50"
            >
              <Check size={18} />
              Save Details
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              <Printer size={18} />
              Print Receipt
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        <div id="delivery-receipt" className="p-8 print:p-0">
          {/* Header Section */}
          <div className="mb-5 pb-4">
            <div className="text-left leading-none space-y-0">
              <div className="text-[34px] font-bold text-gray-900 -mb-0 font-serif tracking-tight company-name">
                WISECART MERCHANTS CORP.
              </div>
              <div className="text-[18px] text-gray-900 font-medium space-y-[1px] tracking-tight">
                <div>407B 4F Tower One Plaza Magellan The Mactan Newtown</div>
                <div>Mactan 6015 City of Lapu-lapu Cebu, Phils.</div>
                <div>VAT REG. TIN 010-751-561-00000</div>
              </div>
            </div>

            <div className="flex justify-between items-baseline mt-2">
              <div className="text-3xl font-bold text-gray-900 tracking-widest receipt-title">
                DELIVERY RECEIPT
              </div>
              <div className="flex items-center gap-2 print:hidden">
                <span className="font-bold text-gray-900 text-lg">No.:</span>
                <div className="text-black-900 text-lg w-48 border-b-2 border-gray-900">
                  <input
                    type="text"
                    value={receipt.deliveryReceiptNumberDisplay || receipt.deliveryReceiptNumber || ''}
                    onChange={(e) => setReceipt({ ...receipt, deliveryReceiptNumberDisplay: e.target.value })}
                    className="w-full bg-transparent border-none focus:outline-none focus:border-blue-500 text-lg text-center"
                    placeholder=""
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8 mb-4 -mt-4">
            <div>
              <div className="mb-3">
                <div className="flex items-start mb-7">
                  <span className="font-bold text-gray-900 text-sm w-32 flex-shrink-0">DELIVERED TO:</span>
                  <div className="text-black-900 text-sm flex-1 border-b border-gray-300 px-2 print:border-0 print:p-0 bg-transparent break-words min-h-[1.5rem]">
                    {`${receipt.branchName} - ${receipt.companyName}`}
                  </div>
                </div>
              </div>
              <div className="mb-2">
                <div className="flex items-start mb-7">
                  <span className="font-bold text-gray-900 text-sm w-32 flex-shrink-0">ADDRESS:</span>
                  <div className="text-black-900 text-sm flex-1 border-b border-gray-300 px-2 print:border-0 print:p-0 bg-transparent break-words min-h-[1.5rem]">
                    {receipt.branchAddress}
                  </div>
                </div>
              </div>
              <div>
                <div className="flex items-start mb-3">
                  <span className="font-bold text-gray-900 text-sm w-32 flex-shrink-0">BUSINESS STYLE:</span>
                  <div className="flex-1">
                    <textarea
                      value={receipt.businessStyle || ''}
                      onChange={(e) => setReceipt({ ...receipt, businessStyle: e.target.value })}
                      rows={1}
                      className="text-black-900 text-sm w-full border-b border-gray-300 px-2 focus:outline-none focus:border-blue-500 bg-transparent print:hidden break-words resize-none overflow-hidden"
                      style={{ minHeight: '1.5rem' }}
                      onInput={(e) => {
                        e.target.style.height = 'auto';
                        e.target.style.height = e.target.scrollHeight + 'px';
                      }}
                    />
                    <div className="hidden print:block text-black-900 text-sm break-words px-2">{receipt.businessStyle || ''}</div>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <div className="mb-2">
                <div className="flex items-start mb-7">
                  <span className="font-bold text-gray-900 text-sm w-32 flex-shrink-0">DATE:</span>
                  <div className="text-black-900 text-sm flex-1 border-b border-gray-300 px-2 print:border-0 print:p-0 bg-transparent break-words min-h-[1.5rem]">
                    {receipt.date}
                  </div>
                </div>
              </div>
              <div className="mb-2">
                <div className="flex items-start mb-7">
                  <span className="font-bold text-gray-900 text-sm w-32 flex-shrink-0">TIN:</span>
                  <div className="text-black-900 text-sm flex-1 border-b border-gray-300 px-2 print:border-0 print:p-0 bg-transparent break-words min-h-[1.5rem]">
                    {receipt.companyTin}
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-4 mb-3">
                <div className="flex items-start flex-1 min-w-0">
                  <span className="font-bold text-gray-900 text-sm whitespace-nowrap mr-2 flex-shrink-0">
                    TERMS OF PAYMENT:
                  </span>
                  <div className="flex-1" style={{ minWidth: '100px' }}>
                    <textarea
                      value={receipt.termsOfPayment || ''}
                      onChange={(e) => setReceipt({ ...receipt, termsOfPayment: e.target.value })}
                      rows={1}
                      className="text-black-900 w-full border-b border-gray-300 text-sm px-2 focus:outline-none focus:border-blue-500 bg-transparent print:hidden resize-none overflow-hidden break-words"
                      style={{ minHeight: '1.5rem', minWidth: '100px' }}
                      onInput={(e) => {
                        e.target.style.height = 'auto';
                        e.target.style.height = e.target.scrollHeight + 'px';
                      }}
                    />
                    <div className="hidden print:block text-black-900 text-sm break-words px-2">
                      {receipt.termsOfPayment || ''}
                    </div>
                  </div>
                </div>

                <div className="flex items-start flex-shrink-0">
                  <span className="font-bold text-gray-900 text-sm whitespace-nowrap mr-2">
                    P.O. NUMBER:
                  </span>
                  <div className="w-32">
                    <textarea
                      value={receipt.purchaseOrderNumber || ''}
                      onChange={(e) => setReceipt({ ...receipt, purchaseOrderNumber: e.target.value })}
                      rows={1}
                      className="text-black-900 w-full border-b border-gray-300 text-sm px-2 focus:outline-none focus:border-blue-500 bg-transparent print:hidden resize-none overflow-hidden break-words"
                      style={{ minHeight: '1.5rem' }}
                      onInput={(e) => {
                        e.target.style.height = 'auto';
                        e.target.style.height = e.target.scrollHeight + 'px';
                      }}
                    />
                    <div className="hidden print:block text-black-900 text-sm break-words px-2">
                      {receipt.purchaseOrderNumber || ''}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Items Table */}
          <div className="-mt-3 leading-none">
            <table className="w-full border-collapse">
              <colgroup>
                <col style={{ width: '7%' }} />
                <col style={{ width: '4%' }} />
                <col style={{ width: '70%' }} />
                <col style={{ width: '19%' }} />
              </colgroup>
              <thead>
                <tr className="border-b border-gray-900">
                  <th className="text-left px-2 py-0.5 font-bold text-gray-900 text-xs uppercase tracking-wider">
                    Quantity
                  </th>
                  <th className="text-left px-1 py-0.5 font-bold text-gray-900 text-xs uppercase tracking-wider">
                    Unit
                  </th>
                  <th className="text-left px-3 py-0.5 font-bold text-gray-900 text-xs uppercase tracking-wider">
                    Particulars
                  </th>
                  <th className="text-left px-3 py-0.5 font-bold text-gray-900 text-xs uppercase tracking-wider">
                    <input
                      type="text"
                      value={receipt.extraHeader || 'EXTRA'}
                      onChange={(e) => setReceipt({ ...receipt, extraHeader: e.target.value })}
                      className="w-full bg-transparent font-bold text-xs uppercase px-0 py-0.5 border-none focus:outline-none print:hidden"
                    />
                    <span className="hidden print:inline">
                      {receipt.extraHeader || 'EXTRA'}
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white">
                {receipt.items?.length > 0 ? (
                  receipt.items.map((item, i) => (
                    <tr key={i} className="align-middle">
                      {/* Quantity */}
                      <td className="px-2 py-0.5 text-xs font-medium text-gray-900 whitespace-nowrap text-center">
                        {item.deliveredQty || item.preparedQty || item.quantity || 0}
                      </td>

                      {/* Unit */}
                      <td className="px-1 py-0.5 text-xs font-medium text-gray-900 whitespace-nowrap">
                        {item.uom || item.unit || 'pcs'}
                      </td>

                      {/* Particulars */}
                      <td className="px-3 py-0.5 text-xs text-gray-900 leading-tight" colSpan={1}>
                        <div className="font-semibold">
                          {`${item.product?.productName || item.productName || 'Product'}${item.product?.upc ? ` - ${item.product.upc}` : ''}`}
                        </div>
                        {item.particular && (
                          <div className="text-[10px] text-black-600 -mt-0.5">
                            {item.particular}
                          </div>
                        )}
                      </td>

                      {/* Extra */}
                      <td className="px-3 py-1 text-xs">
                        <input
                          type="text"
                          value={item.extra || ''}
                          onChange={(e) => {
                            const newItems = [...receipt.items];
                            newItems[i] = { ...newItems[i], extra: e.target.value };
                            setReceipt({ ...receipt, items: newItems });
                          }}
                          className="w-full bg-transparent border-b border-black-300 text-xs px-0 py-0.5 focus:outline-none focus:border-blue-500 print:hidden"
                        />
                        <span className="hidden print:inline">{item.extra || ''}</span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" className="py-8 text-center text-gray-400 italic text-xs">
                      No items
                    </td>
                  </tr>
                )}

                {Array.from({ length: Math.max(0, 16 - (receipt.items?.length || 0)) }).map((_, i) => (
                  <tr key={`empty-${i}`} style={{ height: '18px' }}>
                    <td className="px-2 text-xs">&nbsp;</td>
                    <td className="px-1 text-xs">&nbsp;</td>
                    <td className="px-3 text-xs">&nbsp;</td>
                    <td className="px-3 text-xs">&nbsp;</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="text-xs text-black-900 text-[11px] mr-29 text-right mt-0 font-bold leading-tight">
            Receive the above goods in good order and condition
          </div>

          <div className="grid grid-cols-2 gap-8 mt-4">
            <div>
              <div className="mb-3">
                <div className="flex items-center mb-0">
                  <span className="font-bold text-gray-900 text-sm w-25 print:text-xs">Prepared by:</span>
                  <div className="relative">
                    <input
                      type="text"
                      value={receipt.preparedBy || ''}
                      onChange={(e) => setReceipt({ ...receipt, preparedBy: e.target.value })}
                      className="text-black-900 text-sm w-full border-b border-gray-300 px-2 focus:outline-none focus:border-blue-500 bg-transparent print:hidden"
                    />
                    <div className="hidden print:block text-black-900 text-sm w-full px-2">
                      {receipt.preparedBy || ''}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <div className="mb-2">
                <div className="flex items-center mb-0">
                  <span className="font-bold text-gray-900 text-sm w-40 print:text-xs">Received by:</span>
                  <div className="text-black-900 text-sm w-full border-b border-gray-300 print:border-b print:border-black h-5">
                    &nbsp;
                  </div>
                </div>
                <div className="text-xs text-black-900 mt-0 ml-32 font-bold print:text-xs print:ml-24 leading-tight">
                  Customer Signature over Printed Name
                </div>
              </div>
              <div className="mt-2">
                <div className="flex items-center mb-0">
                  <span className="font-bold text-gray-900 text-sm w-40 print:text-xs">Date Received:</span>
                  <div className="text-black-900 text-sm w-full border-b border-gray-300 print:border-b print:border-black h-5">
                    &nbsp;
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-12 pt-4 text-center">
            <div className="text-gray-900 mb-2 text-[7.5px]">
              PERMIT TO USE LOOSE LEAF No. : LLSI-080-1024-00002 • DATE ISSUED: OCT. 11, 2024 •
              BIR AUTHORITY TO PRINT No. 080AU20240000016398 • DATE ISSUED: OCT. 23, 2024 •
              APPROVED SERIES: 05001-10000 • 100PADS (2X)
            </div>
            <div className="text-xs font-bold text-gray-900 italic">
              *THIS DOCUMENT IS NOT VALID FOR CLAIM INPUT TAX*
            </div>
          </div>
        </div>

        <div className="p-8 border-t border-gray-200 flex justify-end gap-4 print:hidden">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-3 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium shadow-md disabled:opacity-50"
          >
            <Check size={20} />
            <span>Save Changes</span>
          </button>
          <button
            onClick={onClose}
            className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeliveryReceiptModal;