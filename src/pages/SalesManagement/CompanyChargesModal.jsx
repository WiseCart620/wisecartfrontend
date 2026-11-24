import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { X, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../services/api';

const fmt = (n) =>
    Number(n || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtDate = (d) =>
    d ? new Date(d + (String(d).length === 10 ? 'T00:00:00' : '')).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '—';

// Freight and other charges deducted on a DV, kept per customer (never per sales invoice).
const CompanyChargesModal = ({ onClose, balances = {}, profiles = [] }) => {
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

    const dvBreakdown = useMemo(() => {
        const byDv = {};
        rows.forEach(r => {
            const k = String(r.dvNumber || '').trim();
            if (!k) return;
            if (!byDv[k]) byDv[k] = { dv: k, deduct: 0 };
            byDv[k].deduct += Number(r.amount || 0);
        });
        const r2 = (v) => Math.round(v * 100) / 100;
        return Object.values(byDv).map(g => {
            const lines = [];
            profiles.forEach(pr => (pr.payments || []).forEach(pay => {
                if (String(pay.referenceNumber || '').trim().toLowerCase() === g.dv.toLowerCase() && Number(pay.amount || 0) > 0) {
                    lines.push({ inv: pr.invoiceNumber || ('#' + pr.id), gross: Number(pay.grossAmount != null ? pay.grossAmount : pay.amount) });
                }
            }));
            const total = lines.reduce((s, l) => s + l.gross, 0);
            let left = r2(g.deduct);
            lines.forEach((l, i) => {
                const share = i === lines.length - 1 ? left : r2(total ? (g.deduct * l.gross) / total : 0);
                left = r2(left - share);
                l.pct = total ? (l.gross / total) * 100 : 0;
                l.share = share;
                l.after = r2(l.gross - share);
            });
            return { dv: g.dv, deduct: r2(g.deduct), lines, total: r2(total) };
        }).filter(g => g.lines.length > 0);
    }, [rows, profiles]);

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
                        
                        
                    </div>
                    <button onClick={onClose} className="p-1 text-gray-600 hover:text-black"><X size={20} /></button>
                </div>

                <div className="px-6 py-4 space-y-4">
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