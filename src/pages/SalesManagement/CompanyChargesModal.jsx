import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { X, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../services/api';

const fmt = (n) =>
    Number(n || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtDate = (d) =>
    d ? new Date(d + (String(d).length === 10 ? 'T00:00:00' : '')).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '—';

// Freight and other charges deducted on a DV, kept per customer (never per sales invoice).
const CompanyChargesModal = ({ onClose }) => {
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [company, setCompany] = useState('');

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.get('/invoice-profiles/company-charges');
            if (res.success) setRows(res.data?.data || res.data || []);
            else toast.error(res.message || 'Failed to load freight charges');
        } catch {
            toast.error('Failed to load freight charges');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    const totals = useMemo(() => {
        const map = new Map();
        rows.forEach(r => {
            const k = r.companyName || `Company #${r.companyId}`;
            const cur = map.get(k) || { name: k, count: 0, total: 0 };
            cur.count += 1;
            cur.total += Number(r.amount || 0);
            map.set(k, cur);
        });
        return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
    }, [rows]);

    const shown = rows.filter(r => !company || (r.companyName || `Company #${r.companyId}`) === company);
    const shownTotal = shown.reduce((s, r) => s + Number(r.amount || 0), 0);

    const remove = async (id) => {
        if (!window.confirm('Delete this freight charge record? This cannot be undone.')) return;
        try {
            const res = await api.delete(`/invoice-profiles/company-charges/${id}`);
            if (res.success) {
                toast.success('Charge deleted');
                setRows(prev => prev.filter(r => r.id !== id));
            } else {
                toast.error(res.message || 'Failed to delete');
            }
        } catch {
            toast.error('Failed to delete');
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl">
                <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-start">
                    <div>
                        <div className="text-lg font-semibold text-gray-900">Freight charges</div>
                        <div className="text-sm text-gray-600 mt-0.5">Deducted on DVs and totaled per customer, not per sales invoice.</div>
                    </div>
                    <button onClick={onClose} className="p-1 text-gray-600 hover:text-black"><X size={20} /></button>
                </div>

                <div className="px-6 py-4 space-y-4">
                    <div>
                        <div className="text-xs font-semibold tracking-wide text-gray-600 uppercase mb-2">Total per customer</div>
                        <div className="border border-gray-200 rounded-xl overflow-hidden">
                            {loading ? (
                                <div className="px-4 py-6 text-sm text-gray-500 text-center">Loading...</div>
                            ) : totals.length === 0 ? (
                                <div className="px-4 py-6 text-sm text-gray-500 text-center italic">No freight charges recorded yet.</div>
                            ) : totals.map(t => (
                                <button key={t.name} type="button" onClick={() => setCompany(company === t.name ? '' : t.name)}
                                    className={`w-full flex items-center justify-between px-4 py-2.5 text-sm border-b border-gray-100 last:border-0 text-left hover:bg-gray-50 ${company === t.name ? 'bg-orange-50' : ''}`}>
                                    <span className="font-medium text-gray-900">{t.name} <span className="text-xs text-gray-500 font-normal">· {t.count} charge{t.count > 1 ? 's' : ''}</span></span>
                                    <span className="font-bold tabular-nums text-gray-900">₱{fmt(t.total)}</span>
                                </button>
                            ))}
                        </div>
                        {company && <div className="text-xs text-gray-600 mt-1">Showing {company}. <button type="button" onClick={() => setCompany('')} className="text-orange-700 underline">Show all</button></div>}
                    </div>

                    <div>
                        <div className="text-xs font-semibold tracking-wide text-gray-600 uppercase mb-2">Payment history</div>
                        <div className="border border-gray-200 rounded-xl overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50 text-[11px] uppercase tracking-wide text-gray-600">
                                    <tr>
                                        <th className="text-left px-3 py-2">Date</th>
                                        <th className="text-left px-3 py-2">Customer</th>
                                        <th className="text-left px-3 py-2">DV no.</th>
                                        <th className="text-left px-3 py-2">Description</th>
                                        <th className="text-right px-3 py-2">Amount</th>
                                        <th className="w-10"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {shown.length === 0 ? (
                                        <tr><td colSpan={6} className="px-3 py-6 text-center text-gray-500 italic">Nothing to show.</td></tr>
                                    ) : shown.map(r => (
                                        <tr key={r.id}>
                                            <td className="px-3 py-2 whitespace-nowrap">{fmtDate(r.paymentDate)}</td>
                                            <td className="px-3 py-2">{r.companyName}</td>
                                            <td className="px-3 py-2 font-mono text-xs">{r.dvNumber}</td>
                                            <td className="px-3 py-2">{r.label}</td>
                                            <td className="px-3 py-2 text-right tabular-nums font-medium">₱{fmt(r.amount)}</td>
                                            <td className="px-2 py-2 text-right">
                                                <button type="button" title="Delete" onClick={() => remove(r.id)} className="w-7 h-7 rounded text-gray-500 hover:text-red-600 hover:bg-gray-100 flex items-center justify-center"><Trash2 size={14} /></button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                                {shown.length > 0 && (
                                    <tfoot>
                                        <tr className="bg-gray-50 font-semibold">
                                            <td colSpan={4} className="px-3 py-2 text-right">Total</td>
                                            <td className="px-3 py-2 text-right tabular-nums">₱{fmt(shownTotal)}</td>
                                            <td></td>
                                        </tr>
                                    </tfoot>
                                )}
                            </table>
                        </div>
                    </div>
                </div>

                <div className="px-6 py-3 border-t border-gray-200 flex justify-end">
                    <button onClick={onClose} className="h-10 px-5 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">Close</button>
                </div>
            </div>
        </div>
    );
};

export default CompanyChargesModal;