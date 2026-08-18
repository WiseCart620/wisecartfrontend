import React, { useState, useEffect } from 'react';
import { X, FileText, Printer } from 'lucide-react';
import { api } from '../../services/api';

const SalesSummaryModal = ({ onClose, filterData, statusFilter, searchTerm, companies, branches }) => {
  const [printRows, setPrintRows] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    const fetchData = async () => {
      try {
        const startDateObj = filterData.startDate ? new Date(filterData.startDate) : null;
        const endDateObj = filterData.endDate ? new Date(filterData.endDate) : null;
        const params = new URLSearchParams({
          ...(statusFilter !== 'ALL' && { status: statusFilter }),
          ...(searchTerm && { searchTerm }),
          ...(startDateObj && { startYear: startDateObj.getFullYear(), startMonth: startDateObj.getMonth() + 1 }),
          ...(endDateObj && { endYear: endDateObj.getFullYear(), endMonth: endDateObj.getMonth() + 1 }),
        });

        if (filterData.companyIds?.length > 0) {
          filterData.companyIds.forEach(id => params.append('companyIds', id));
        }

        if (filterData.branchIds?.length > 0) {
          filterData.branchIds.forEach(id => params.append('branchIds', id));
        }

        if (filterData.productFilters?.length > 0) {
          filterData.productFilters.forEach(pf => {
            if (pf.productId) params.append('productIds', pf.productId);
            if (pf.variationId) params.append('variationIds', pf.variationId);
          });
        }

        const response = await api.get(`/sales/summary-report?${params}`);
        const rows = response.data?.rows || [];

        setPrintRows(rows
          .map(r => ({
            productName: r.productName || '',
            variationDisplay: r.variationDisplay || '',
            sku: r.sku || '—',
            upc: r.upc || '—',
            quantity: r.quantity || 0,
            unitPrice: r.unitPrice || 0,
            amount: r.amount || 0,
          }))
          .sort((a, b) => a.productName.localeCompare(b.productName)));
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const selectedCompany = filterData.companyIds?.length > 0
    ? (filterData.companyIds.length === 1
      ? (companies.find(c => c.id === filterData.companyIds[0])?.companyName || 'All Companies')
      : `${filterData.companyIds.length} Companies`)
    : 'All Companies';
  const selectedBranch = filterData.branchIds?.length > 0
    ? (filterData.branchIds.length === 1
      ? (branches.find(b => b.id === filterData.branchIds[0])?.branchName || 'All Branches')
      : `${filterData.branchIds.length} Branches`)
    : 'All Branches';
  const statusLabel = statusFilter === 'ALL' ? 'All Status' : statusFilter;
  const dateFrom = filterData.startDate || '—';
  const dateTo = filterData.endDate || '—';
  const totalQty = printRows.reduce((s, r) => s + r.quantity, 0);
  const totalAmt = printRows.reduce((s, r) => s + r.amount, 0);

  const handlePrint = () => {
    const content = document.getElementById('sales-summary-modal-body').innerHTML;
    const w = window.open('', '_blank');
    w.document.write(`<!DOCTYPE html><html><head><title>Sales Summary Report</title>
      <style>
        * { margin:0; padding:0; box-sizing:border-box; }
        body { font-family: Arial, sans-serif; padding: 15px; font-size: 9pt; }
        h2 { font-size: 13pt; font-weight: bold; margin-bottom: 8pt; }
        .meta { display: grid; grid-template-columns: repeat(4,1fr); gap: 4pt; margin-bottom: 10pt; }
        .meta-item { border: 0.5pt solid #ccc; padding: 3pt 5pt; border-radius: 2pt; }
        .meta-label { display: block; font-size: 6.5pt; color: #666; text-transform: uppercase; margin-bottom: 1pt; }
        table { width: 100%; border-collapse: collapse; font-size: 7.5pt; }
        th { background: #f0f0f0; border: 0.5pt solid #999; padding: 3pt 4pt; text-align: left; font-size: 7pt; }
        td { border: 0.5pt solid #ccc; padding: 2.5pt 4pt; }
        tr:nth-child(even) td { background: #fafafa; }
        tfoot td { border-top: 1.5pt solid #333; font-weight: bold; }
        .sub { font-size: 6.5pt; color: #555; }
        .footer { margin-top: 8pt; font-size: 7pt; color: #666; text-align: right; }
        @page { size: A4 portrait; margin: 10mm 8mm; }
      </style>
    </head><body>${content}</body></html>`);
    w.document.close();
    w.print();
    w.close();
  };

  const handleExcel = () => {
    const rows = [];
    rows.push(['COMPANY', selectedCompany]);
    rows.push(['BRANCH', selectedBranch]);
    rows.push(['STATUS', statusLabel]);
    rows.push(['DATE OF COVERAGE', `${dateFrom} to ${dateTo}`]);
    rows.push(['GENERATED AT', new Date().toLocaleString('en-PH', { timeZone: 'Asia/Manila' })]);
    rows.push([]);
    rows.push(['NO.', 'PRODUCT', 'VARIATION', 'SKU', 'UPC', 'QTY', 'UNIT PRICE', 'TOTAL']);
    printRows.forEach((r, i) => rows.push([
      i + 1, r.productName, r.variationDisplay || '—',
      r.sku, r.upc, r.quantity,
      Number(r.unitPrice).toFixed(2),
      Number(r.amount).toFixed(2)
    ]));
    rows.push([]);
    rows.push(['', '', '', '', 'TOTAL QTY', totalQty, '', '']);
    rows.push(['', '', '', '', 'GRAND TOTAL', '', '', totalAmt.toFixed(2)]);

    const csv = rows.map(r => r.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sales_summary_${selectedCompany}_${selectedBranch}_${new Date().toISOString().split('T')[0]}.csv`
      .replace(/[\s/\\:*?"<>|]+/g, '_');
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[95vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200 flex-shrink-0">
          <div>
            <h2 className="text-base font-semibold text-gray-800">Sales Summary Report</h2>
            <p className="text-xs text-gray-500">{selectedCompany} · {selectedBranch} · {statusLabel}</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleExcel}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
            >
              <FileText size={14} /> Excel
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              <Printer size={14} /> Print
            </button>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100">
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="overflow-auto flex-1 p-5" id="sales-summary-modal-body">
          <h2 style={{ fontSize: '13pt', fontWeight: 'bold', marginBottom: '8pt', fontFamily: 'Arial, sans-serif' }}>
            Sales Report — WISECART MERCHANTS CORP.
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '4pt', marginBottom: '10pt', fontFamily: 'Arial, sans-serif', fontSize: '7.5pt' }}>
            {[
              ['Company', selectedCompany],
              ['Branch', selectedBranch],
              ['Status', statusLabel],
              ['Date of Coverage', `${dateFrom} to ${dateTo}`]
            ].map(([label, val]) => (
              <div key={label} style={{ border: '0.5pt solid #ccc', padding: '3pt 5pt', borderRadius: '2pt' }}>
                <span style={{ display: 'block', fontSize: '6.5pt', color: '#666', textTransform: 'uppercase', marginBottom: '1pt' }}>
                  {label}
                </span>
                {val}
              </div>
            ))}
          </div>

          {loading ? (
            <div className="py-16 text-center text-gray-400 text-sm animate-pulse">Loading report data...</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '7.5pt', fontFamily: 'Arial, sans-serif' }}>
              <thead>
                <tr>
                  <th style={{ border: '0.5pt solid #999', padding: '3pt 4pt', background: '#f0f0f0', textAlign: 'left', width: '30px', fontSize: '7pt' }}>#</th>
                  <th style={{ border: '0.5pt solid #999', padding: '3pt 4pt', background: '#f0f0f0', textAlign: 'left', fontSize: '7pt' }}>PRODUCT / SKU / UPC</th>
                  <th style={{ border: '0.5pt solid #999', padding: '3pt 4pt', background: '#f0f0f0', textAlign: 'right', fontSize: '7pt' }}>QTY</th>
                  <th style={{ border: '0.5pt solid #999', padding: '3pt 4pt', background: '#f0f0f0', textAlign: 'right', fontSize: '7pt' }}>UNIT PRICE</th>
                  <th style={{ border: '0.5pt solid #999', padding: '3pt 4pt', background: '#f0f0f0', textAlign: 'right', fontSize: '7pt' }}>TOTAL</th>
                </tr>
              </thead>
              <tbody>
                {printRows.map((row, idx) => (
                  <tr key={idx} style={{ background: idx % 2 === 1 ? '#fafafa' : '#fff' }}>
                    <td style={{ border: '0.5pt solid #ccc', padding: '2.5pt 4pt' }}>{idx + 1}</td>
                    <td style={{ border: '0.5pt solid #ccc', padding: '2.5pt 4pt' }}>
                      <div style={{ fontWeight: 600 }}>
                        {row.productName}{row.variationDisplay ? ` — ${row.variationDisplay}` : ''}
                      </div>
                      <div style={{ fontSize: '6.5pt', color: '#555' }}>
                        SKU: {row.sku} &nbsp;|&nbsp; UPC: {row.upc}
                      </div>
                    </td>
                    <td style={{ border: '0.5pt solid #ccc', padding: '2.5pt 4pt', textAlign: 'right' }}>
                      {row.quantity.toLocaleString()}
                    </td>
                    <td style={{ border: '0.5pt solid #ccc', padding: '2.5pt 4pt', textAlign: 'right' }}>
                      {Number(row.unitPrice).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                    </td>
                    <td style={{ border: '0.5pt solid #ccc', padding: '2.5pt 4pt', textAlign: 'right' }}>
                      {Number(row.amount).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={2} style={{ border: '0.5pt solid #ccc', padding: '3pt 4pt', fontWeight: 'bold', textAlign: 'right', borderTop: '1.5pt solid #333' }}>
                    TOTAL QTY
                  </td>
                  <td style={{ border: '0.5pt solid #ccc', padding: '3pt 4pt', fontWeight: 'bold', textAlign: 'right', borderTop: '1.5pt solid #333' }}>
                    {totalQty.toLocaleString()}
                  </td>
                  <td colSpan={2} style={{ border: '0.5pt solid #ccc', padding: '3pt 4pt', borderTop: '1.5pt solid #333' }} />
                </tr>
                <tr>
                  <td colSpan={2} style={{ border: '0.5pt solid #ccc', padding: '3pt 4pt', fontWeight: 'bold', textAlign: 'right' }}>
                    GRAND TOTAL
                  </td>
                  <td style={{ border: '0.5pt solid #ccc', padding: '3pt 4pt' }} />
                  <td style={{ border: '0.5pt solid #ccc', padding: '3pt 4pt' }} />
                  <td style={{ border: '0.5pt solid #ccc', padding: '3pt 4pt', fontWeight: 'bold', textAlign: 'right' }}>
                    ₱{totalAmt.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              </tfoot>
            </table>
          )}

          <div style={{ marginTop: '8pt', fontSize: '7pt', color: '#666', textAlign: 'right', fontFamily: 'Arial, sans-serif' }}>
            Generated: {new Date().toLocaleString('en-PH', { timeZone: 'Asia/Manila' })} &nbsp;|&nbsp; Total Products: {printRows.length}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SalesSummaryModal;