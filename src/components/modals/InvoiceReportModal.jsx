import React from 'react';
import { X, Plus, Printer } from 'lucide-react';
import { formatCurrency, formatCurrencyTruncated } from '../../utils/salesUtils';

const InvoiceReportModal = ({
  invoiceReport,
  setInvoiceReport,
  invoiceNumber,
  setInvoiceNumber,
  invoiceDate,
  setInvoiceDate,
  taxType,
  includeWithholdingTax = true,
  setIncludeWithholdingTax,
  onGenerate,
  invoiceNumberError,
}) => {
  if (!invoiceReport) return null;

  const handlePrint = () => {
    if (!invoiceNumber.trim()) {
      alert('Please enter an invoice number before printing.');
      return;
    }
    window.print();
  };

  const adjustmentTotal = (invoiceReport.adjustments || []).reduce((sum, adj) => sum + (adj.amount || 0), 0);

  const getVatValues = () => {
    if (taxType === 'VAT') {
      const vatableSales = (invoiceReport.vatableSales || 0) + adjustmentTotal;
      const vat = vatableSales * 0.12;
      const totalSales = (invoiceReport.totalSalesVatInclusive || 0) + adjustmentTotal;
      const netOfVat = (invoiceReport.netOfVat || 0) + adjustmentTotal;
      const withholdingTax = includeWithholdingTax ? netOfVat * 0.01 : 0;
      return { vatableSales, vat, totalSales, netOfVat, withholdingTax, totalAmountDue: totalSales - withholdingTax };
    } else {
      const grossSales = (invoiceReport.totalSalesVatInclusive || 0) + adjustmentTotal;
      const withholdingTax = includeWithholdingTax ? (grossSales / 1.12) * 0.01 : 0;
      return { grossSales, withholdingTax, totalAmountDue: grossSales - withholdingTax };
    }
  };

  const vals = getVatValues();

  const lblCls = 'px-2 py-0 flex flex-col justify-start font-medium text-[10px] leading-tight';
  const valWrapCls = 'px-3 py-0 flex flex-col justify-start';
  const valCls = 'w-full text-right mb-1 text-[14px] leading-tight py-0';
  const valLastCls = 'w-full text-right text-[14px] leading-tight py-0';

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl max-w-6xl w-full max-h-[95vh] overflow-y-auto shadow-2xl">

        {/* Header */}
        <div className="p-8 border-b border-gray-200 flex justify-between items-center print:hidden sticky top-0 bg-white rounded-t-2xl z-10">
          <h2 className="text-2xl font-bold text-gray-900">Invoice Report</h2>
          <div className="flex gap-3">
            <button
              onClick={() => {
                const newAdjustments = [...(invoiceReport.adjustments || []), { description: '', quantity: 1, unitCost: 0, amount: 0 }];
                setInvoiceReport({ ...invoiceReport, adjustments: newAdjustments });
              }}
              className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 transition"
            >
              <Plus size={18} /> Add Adjustment
            </button>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 border border-gray-300 rounded px-3 py-2 bg-white">
              <input
                type="checkbox"
                checked={includeWithholdingTax}
                onChange={(e) => setIncludeWithholdingTax && setIncludeWithholdingTax(e.target.checked)}
              />
              Include Withholding Tax
            </label>
            <button
              onClick={() => setInvoiceReport(null)}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Invoice Body */}
        <div id="invoice-report" className="p-8">

          {/* Company Header */}
          <div className="flex justify-between items-start mb-5 pb-4">
            <div className="text-left leading-none space-y-0">
              <div className="text-[34px] font-bold text-gray-900 font-serif tracking-tight">
                WISECART MERCHANTS CORP.
              </div>
              <div className="text-[18px] text-gray-900 font-medium tracking-tight">
                <div>407B 4F Tower One Plaza Magellan The Mactan Newtown</div>
                <div>Mactan 6015 City of Lapu-lapu Cebu, Phils.</div>
                <div>VAT REG. TIN 010-751-561-00000</div>
              </div>
            </div>
            <div className="text-right">
              <div className="inline-block text-left leading-none">
                <div className="text-3xl font-bold text-gray-900 tracking-widest">SALES</div>
                <div className="text-3xl font-bold text-gray-900 tracking-widest -mt-2">INVOICE</div>
              </div>
              <div className="text-lg font-semibold flex items-center gap-1">
                NO.
                <input
                  type="text"
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  placeholder="_____________"
                  className={`border-b w-36 text-center focus:outline-none bg-transparent ${invoiceNumberError ? 'border-red-500 text-red-600' : 'border-gray-500'
                    }`}
                />
              </div>
              {invoiceNumberError && (
                <p className="text-xs text-red-600 font-medium mt-1 print:hidden">
                  {invoiceNumberError}
                </p>
              )}
            </div>
          </div>

          <div className="flex justify-between items-center mb-2" style={{ marginTop: '10px' }}>
            <div className="flex gap-6">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <input type="checkbox" className="w-6 h-6 border-2 border-gray-900" /> CASH SALES
              </label>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <input type="checkbox" className="w-6 h-6 border-2 border-gray-900" /> CHARGE SALES
              </label>
            </div>
            <div className="flex items-center gap-2 text-black-900">
              <span className="font-medium">DATE:</span>
              <input
                type="date"
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
                className="border-b border-gray-500 text-sm focus:outline-none bg-transparent"
              />
            </div>
          </div>

          <div className="border border-gray-900 px-3 py-2 mb-1.5 sold-to-box" style={{ minHeight: '98px', overflow: 'visible' }}>
            <div className="grid grid-cols-[1.7fr_1fr] gap-x-6 sold-to-block">
              <div className="flex flex-col gap-1 sold-to-rows">
                <div className="flex items-center">
                  <span className="font-bold text-gray-900 w-40 shrink-0 text-sm">SOLD TO:</span>
                  <span className="flex-1 text-black-900 print-visible text-[15px]">{invoiceReport.soldTo || 'N/A'}</span>
                </div>
                <div className="flex items-center">
                  <span className="font-bold text-gray-900 w-40 shrink-0 text-sm">REGISTERED NAME:</span>
                  <span className="flex-1 text-black-900 print-visible text-[15px]">{invoiceReport.registeredName || 'N/A'}</span>
                </div>
                <div className="flex items-start">
                  <span className="font-bold text-gray-900 w-40 shrink-0 text-sm">BUSINESS ADDRESS:</span>
                  <span className="flex-1 text-black-900 print-visible break-words leading-snug text-[15px]">{invoiceReport.businessAddress || 'N/A'}</span>
                </div>
              </div>
              <div className="flex items-start sold-to-tin">
                <span className="font-bold text-gray-900 w-12 shrink-0 text-sm">TIN:</span>
                <span className="flex-1 text-black-900 print-visible text-[15px]">{invoiceReport.tin || invoiceReport.branchTin || 'N/A'}</span>
              </div>
            </div>
          </div>

          {/* Items Table (taller: 150mm -> 175mm) */}
          <div className="border border-b-0 border-gray-900 pt-3">
            <table className="w-full" style={{ minHeight: '170mm' }}>
              <thead>
                <tr className="border-b border-gray-900">
                  <th className="text-left px-4 font-bold text-gray-900 text-sm" style={{ width: '60%' }}>
                    ITEM DESCRIPTION / NATURE OF SERVICE
                  </th>
                  <th className="text-right px-4 font-bold text-gray-900 text-sm" style={{ width: '12%' }}>QTY.</th>
                  <th className="text-right px-4 text-gray-900 text-xs" style={{ width: '12%' }}>UNIT COST / PRICE</th>
                  <th className="text-right px-4 font-bold text-gray-900 text-sm" style={{ width: '15%' }}>AMOUNT</th>
                </tr>
              </thead>
              <tbody>
                {invoiceReport.products.map((product, i) => (
                  <tr key={i} className="align-top">
                    <td className="py-2 px-4 text-sm text-gray-900">
                      {product.productName}
                      {product.companySku && ` - ${product.companySku}`}
                      {product.variation && ` ${product.variation.combinationDisplay ||
                        (product.variation.variationType && product.variation.variationValue
                          ? `${product.variation.variationType}: ${product.variation.variationValue}`
                          : 'Variation')} - ${product.variation.upc || 'N/A'}`}
                    </td>
                    <td className="py-2 px-4 text-right text-sm">{product.totalQuantity.toLocaleString()}</td>
                    <td className="py-2 px-4 text-right text-sm">{formatCurrencyTruncated(product.totalAmount / product.totalQuantity)}</td>
                    <td className="py-2 px-4 text-right text-sm">{formatCurrency(product.totalAmount)}</td>
                  </tr>
                ))}

                {/* Adjustments */}
                {(invoiceReport.adjustments || []).map((adj, i) => (
                  <tr key={`adj-${i}`} className="align-top">
                    <td className="py-1 px-2">
                      <input
                        type="text"
                        value={adj.description}
                        onChange={(e) => {
                          const newAdj = [...invoiceReport.adjustments];
                          newAdj[i].description = e.target.value;
                          setInvoiceReport({ ...invoiceReport, adjustments: newAdj });
                        }}
                        placeholder="Adjustment description..."
                        className="w-full text-sm border-0 focus:ring-1 focus:ring-orange-500 rounded px-2 py-1"
                      />
                    </td>
                    <td className="py-1 px-2">
                      <input
                        type="text"
                        value={adj.quantity}
                        onChange={(e) => {
                          const newAdj = [...invoiceReport.adjustments];
                          newAdj[i].quantity = parseFloat(e.target.value) || 0;
                          newAdj[i].amount = newAdj[i].quantity * newAdj[i].unitCost;
                          setInvoiceReport({ ...invoiceReport, adjustments: newAdj });
                        }}
                        className="w-full text-sm text-right border-0 focus:ring-1 focus:ring-orange-500 rounded px-2 py-1"
                      />
                    </td>
                    <td className="py-1 px-2">
                      <input
                        type="number"
                        value={adj.unitCost}
                        onChange={(e) => {
                          const newAdj = [...invoiceReport.adjustments];
                          newAdj[i].unitCost = parseFloat(e.target.value) || 0;
                          newAdj[i].amount = newAdj[i].quantity * newAdj[i].unitCost;
                          setInvoiceReport({ ...invoiceReport, adjustments: newAdj });
                        }}
                        className="w-full text-sm text-right border-0 focus:ring-1 focus:ring-orange-500 rounded px-2 py-1"
                      />
                    </td>
                    <td className="py-2 px-4 text-right">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm flex-1 text-right">{formatCurrency(adj.amount)}</span>
                        <button
                          onClick={() => {
                            const newAdj = invoiceReport.adjustments.filter((_, idx) => idx !== i);
                            setInvoiceReport({ ...invoiceReport, adjustments: newAdj });
                          }}
                          className="print:hidden p-1 text-red-600 hover:bg-red-50 rounded transition"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                <tr className="h-full"><td colSpan={4} /></tr>
              </tbody>
            </table>
          </div>

          <div className="totals-block">
            {/* Tax Section (compact) */}
            {taxType === 'VAT' ? (
              <div className="grid grid-cols-6 border border-gray-900 text-xs -mt-4">
                <div className="col-span-2 grid grid-cols-2 sales-summary-block">
                  <div className={`${lblCls} tax-labels-col`}>
                    <div className="mb-1">Total Sales:</div>
                    <div className="mb-1">VAT/PT:</div>
                    <div className="mb-1">Zero-Rated Sales:</div>
                    <div>VAT-Exempt Sales:</div>
                  </div>
                  <div className={`${valWrapCls} tax-values-col`}>
                    <input readOnly value={formatCurrency(vals.vatableSales)} className={valCls} />
                    <input readOnly value={formatCurrency(vals.vat)} className={valCls} />
                    <input readOnly value={formatCurrency(invoiceReport.zeroRatedSales || 0)} className={valCls} />
                    <input readOnly value={formatCurrency(invoiceReport.vatExemptSales || 0)} className={valLastCls} />
                  </div>
                </div>
                <div className="border-x border-gray-900 px-2 py-1 flex flex-col justify-center text-[9px]">
                  <div className="font-medium leading-tight">SC/PWD/NAAC/MOV/<br />SOLO PARENT ID No.:</div>
                  <div className="font-medium leading-tight mt-3">SC/PWD/NAAC/MOV/<br />Signature:</div>
                </div>
                <div className="border-r border-gray-900 px-2 py-1 flex flex-col justify-center">
                  <input type="text" className="w-full text-xs py-0" />
                  <input type="text" className="w-full text-xs mt-2 py-0" />
                </div>
                <div className="col-span-2 grid grid-cols-2">
                  <div className={lblCls}>
                    <div className="mb-1 text-[8px]">TOTAL SALES (VAT Inclusive)</div>
                    <div className="mb-1">Less: VAT</div>
                    <div className="mb-1">Amount: Net of VAT</div>
                    <div>Less: Discount</div>
                  </div>
                  <div className={valWrapCls}>
                    <input readOnly value={formatCurrency(vals.totalSales)} className={valCls} />
                    <input readOnly value={formatCurrency(vals.vat)} className={valCls} />
                    <input readOnly value={formatCurrency(vals.netOfVat)} className={valCls} />
                    <input readOnly value={formatCurrency(invoiceReport.discount || 0)} className={valLastCls} />
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-6 border border-gray-900 text-xs -mt-2">
                <div className="col-span-2 grid grid-cols-2">
                  <div className={`${lblCls} tax-labels-col`}>
                    <div className="mb-1">Gross Sales (PT):</div>
                    <div className="mb-1">VAT/PT:</div>
                    <div className="mb-1">Zero-Rated Sales:</div>
                    <div>VAT-Exempt Sales:</div>
                  </div>
                  <div className={`${valWrapCls} tax-values-col`}>
                    <input readOnly value={formatCurrency(vals.grossSales)} className={valCls} />
                    <input readOnly value="" className={valCls} />
                    <input readOnly value="" className={valCls} />
                    <input readOnly value="" className={valLastCls} />
                  </div>
                </div>
                <div className="border-x border-gray-900 px-2 py-1 flex flex-col justify-center text-[9px]">
                  <div className="font-medium leading-tight">SC/PWD/NAAC/MOV/<br />SOLO PARENT ID No.:</div>
                  <div className="font-medium leading-tight mt-3">SC/PWD/NAAC/MOV/<br />Signature:</div>
                </div>
                <div className="border-r border-gray-900 px-2 py-1 flex flex-col justify-center">
                  <input type="text" className="w-full text-xs py-0" />
                  <input type="text" className="w-full text-xs mt-2 py-0" />
                </div>
                <div className="col-span-2 grid grid-cols-2">
                  <div className={lblCls}>
                    <div className="mb-1 text-[8px]">TOTAL SALES (Gross Sales)</div>
                    <div className="mb-1">Less: VAT</div>
                    <div className="mb-1">Amount: Net of VAT</div>
                    <div>Less: Discount</div>
                  </div>
                  <div className={valWrapCls}>
                    <input readOnly value={formatCurrency(vals.grossSales)} className={valCls} />
                    <input readOnly value="" className={valCls} />
                    <input readOnly value="" className={valCls} />
                    <input readOnly value="" className={valLastCls} />
                  </div>
                </div>
              </div>
            )}

            {/* Bottom Section (compact) */}
            <div className="grid grid-cols-6 border-t-0 border-gray-900 text-xs -mt-1">
              <div className="col-span-4 border-r border-gray-900 px-3">
                <label className="flex items-start gap-2 text-xs font-medium text-gray-700">
                  <input type="checkbox" className="w-5 h-5 mt-3" />
                  <div>
                    <div className="mb-4 mt-3 text-[11px]">Received the amount of</div>
                    <div className="border-b border-gray-900 mt-1 w-full" />
                  </div>
                </label>
              </div>
              {taxType === 'VAT' ? (
                <div className="col-span-2 grid grid-cols-2 total-due-block">
                  <div className={lblCls}>
                    <div className="mb-1">Add: VAT</div>
                    <div className="mb-1">Less: Withholding Tax</div>
                    <div>Total Amount Due:</div>
                  </div>
                  <div className={valWrapCls}>
                    <input readOnly value={formatCurrency(vals.vat)} className={valCls} />
                    <input readOnly value={formatCurrency(vals.withholdingTax)} className={valCls} />
                    <input readOnly value={formatCurrency(vals.totalAmountDue)} className="w-full text-right font-bold text-[15px] leading-tight py-0" />
                  </div>
                </div>
              ) : (
                <div className="col-span-2 grid grid-cols-2">
                  <div className={`${lblCls} tax-labels-col`}>
                    <div className="mb-1">Total Sales:</div>
                    <div className="mb-1">VAT/PT:</div>
                    <div className="mb-1">Zero-Rated Sales:</div>
                    <div>VAT-Exempt Sales:</div>
                  </div>
                  <div className={valWrapCls}>
                    <input readOnly value="" className={valCls} />
                    <input readOnly value="" className={valCls} />
                    <input readOnly value={formatCurrency(vals.totalAmountDue)} className="w-full text-right font-bold text-[15px] leading-tight py-0" />
                  </div>
                </div>
              )}
            </div>
          </div>
          {/* end totals-block */}

          {/* Footer (shorter, smaller font, new permit numbers) */}
          <div className="grid grid-cols-2 border border-gray-900 mt-2 permit-footer">
            <div className="px-3 py-1">
              <div className="font-medium text-[10px] leading-tight">PERMIT TO USE LOOSE LEAF No. : LLAR-080-0526-18477</div>
              <div className="font-medium text-[10px] leading-tight">DATE ISSUED: 2026-05-25</div>
            </div>
            <div className="px-3 py-1">
              <div className="font-medium text-[10px] leading-tight">BIR AUTHORITY TO PRINT No. 080AU20260000012335</div>
              <div className="font-medium text-[10px] leading-tight">DATE ISSUED: MAY 18, 2026</div>
              <div className="font-medium text-[10px] leading-tight">APPROVED SERIES: 1501-2000 • 10PADS (2X)</div>
            </div>
          </div>
        </div>

        {/* Footer Buttons */}
        <div className="p-8 border-t border-gray-200 flex justify-end gap-3 print:hidden sticky bottom-0 bg-white rounded-b-2xl">
          <button
            onClick={() => {
              if (!invoiceNumber.trim()) { alert('Please enter an invoice number before saving.'); return; }
              onGenerate();
            }}
            disabled={!!invoiceNumberError}
            className={`flex items-center gap-2 px-5 py-3 rounded transition font-medium shadow-md ${!invoiceNumber.trim() || invoiceNumberError ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-green-600 text-white hover:bg-green-700'
              }`}
          >
            Generate
          </button>
          <button
            onClick={handlePrint}
            className={`flex items-center gap-2 px-6 py-3 rounded transition font-medium shadow-md ${!invoiceNumber.trim() ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-orange-600 text-white hover:bg-orange-700'
              }`}
          >
            <Printer size={20} /> Print Report
          </button>
          <button
            onClick={() => setInvoiceReport(null)}
            className="px-6 py-3 border border-gray-300 rounded hover:bg-white transition font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default InvoiceReportModal;