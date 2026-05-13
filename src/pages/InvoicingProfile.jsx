import React, { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '../services/api';
import toast from 'react-hot-toast';
import { ArrowLeft, CreditCard, X, Trash2, Eye, ChevronDown, ChevronUp } from 'lucide-react';
const fmt = (n) =>
    Number(n || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const API_BASE = 'https://backend.wisecart.ph';

const ProofImage = ({ filePath, fileName }) => {
    const [blobUrl, setBlobUrl] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(false);

    useEffect(() => {
        if (!filePath) return;

        let objectUrl = null;
        setLoading(true);
        setError(false);

        // Extract filename from path
        const filename = filePath.split('/').pop();

        // ✅ USE THE CORRECT ENDPOINT - THIS IS THE FIX
        const fileUrl = `${API_BASE}/api/files/serve?path=payment-proofs/${filename}`;

        const token = localStorage.getItem('token')
            || localStorage.getItem('authToken')
            || localStorage.getItem('jwt')
            || localStorage.getItem('accessToken')
            || sessionStorage.getItem('token')
            || sessionStorage.getItem('authToken');

        const headers = token ? { Authorization: `Bearer ${token}` } : {};

        fetch(fileUrl, { headers })
            .then(response => {
                if (!response.ok) {
                    if (response.status === 404) {
                        throw new Error('File not found');
                    }
                    throw new Error(`HTTP ${response.status}`);
                }
                return response.blob();
            })
            .then(blob => {
                objectUrl = URL.createObjectURL(blob);
                setBlobUrl(objectUrl);
            })
            .catch(err => {
                console.error('Error loading proof:', err);
                setError(true);
            })
            .finally(() => setLoading(false));

        return () => {
            if (objectUrl) URL.revokeObjectURL(objectUrl);
        };
    }, [filePath]);

    if (!filePath) return null;

    if (loading) return (
        <div className="text-xs text-gray-400 italic animate-pulse">
            Loading proof...
        </div>
    );

    if (error) return (
        <div className="mt-1">
            <a
                href={`${API_BASE}/api/files/serve?path=payment-proofs/${filePath.split('/').pop()}`}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-blue-500 hover:text-blue-700 underline flex items-center gap-1"
            >
                📎 View proof {fileName && `(${fileName})`}
            </a>
            <div className="text-[10px] text-red-400 mt-0.5">
                Preview unavailable - click to download
            </div>
        </div>
    );

    if (!blobUrl) return null;

    const isPdf = fileName?.toLowerCase().endsWith('.pdf');

    if (isPdf) {
        return (
            <a
                href={blobUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 underline mt-1"
            >
                📄 {fileName || 'View PDF'}
            </a>
        );
    }

    return (
        <div className="mt-2">
            <img
                src={blobUrl}
                alt={fileName || 'Proof of payment'}
                className="rounded-lg border border-gray-200 max-h-32 max-w-full object-contain cursor-pointer hover:opacity-90 transition"
                onClick={() => window.open(blobUrl, '_blank')}
                onError={() => {
                    console.error('Image failed to load');
                    setError(true);
                }}
                title="Click to open full size"
            />
            <div className="text-[10px] text-gray-400 mt-1">
                {fileName || 'Proof'} · Click to enlarge
            </div>
        </div>
    );
};

const fmtDate = (d) =>
    d ? new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '—';

const BalanceTooltip = ({ profile, onClick }) => {
    const [hovered, setHovered] = useState(false);
    const [pos, setPos] = useState({ x: 0, y: 0 });
    const paid = (profile.payments || []).reduce((s, p) => s + Number(p.amount), 0);
    const bal = Number(profile.openBalance);
    const isPaid = bal <= 0;

    return (
        <div
            className="relative inline-block w-full"
            onMouseEnter={(e) => { setHovered(true); setPos({ x: e.clientX, y: e.clientY }); }}
            onMouseMove={(e) => setPos({ x: e.clientX, y: e.clientY })}
            onMouseLeave={() => setHovered(false)}
        >
            {/* Balance value */}
            <button
                onClick={onClick}
                className={`text-right w-full font-semibold text-sm underline decoration-dashed underline-offset-2 cursor-pointer ${isPaid ? 'text-green-600' : 'text-red-600'
                    }`}
            >
                {isPaid ? '✓ Fully paid' : '₱' + fmt(bal)}
            </button>
            {(profile.payments || []).length > 0 && (
                <div className="text-xs text-gray-400 text-right mt-0.5">
                    {profile.payments.length} payment{profile.payments.length > 1 ? 's' : ''} · ₱{fmt(paid)}
                </div>
            )}

            {/* Hover tooltip */}
            {hovered && (
                <div className="fixed w-64 bg-white border border-gray-200 rounded-xl shadow-xl p-3 pointer-events-none" style={{ zIndex: 99999, left: pos.x - 256, top: pos.y - 20, transform: 'translateY(-100%)' }}>
                    <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                        Payment summary
                    </div>
                    <div className="flex justify-between text-xs mb-1">
                        <span className="text-gray-500">Amount due</span>
                        <span className="font-medium">₱{fmt(profile.totalAmountDue)}</span>
                    </div>
                    <div className="border-t border-gray-100 my-2" />
                    {(profile.payments || []).length === 0 ? (
                        <div className="text-xs text-gray-400 italic">No payments yet</div>
                    ) : (
                        profile.payments.map((p, idx) => (
                            <div key={p.id} className="mb-2">
                                <div className="flex justify-between items-center text-xs">
                                    <span className="text-gray-500 flex items-center gap-1">
                                        <span className="inline-flex w-4 h-4 rounded-full bg-blue-100 text-blue-700 items-center justify-center text-[9px] font-bold">
                                            {idx + 1}
                                        </span>
                                        {fmtDate(p.paymentDate)}
                                    </span>
                                    <span className="font-medium text-green-700">
                                        ₱{fmt(p.amount)}
                                    </span>
                                </div>
                                {p.proofFilePath && (
                                    <ProofImage filePath={p.proofFilePath} fileName={p.proofFileName} />
                                )}
                            </div>
                        ))
                    )}
                    <div className="border-t border-gray-100 my-2" />
                    <div className="flex justify-between text-xs font-semibold">
                        <span>Open balance</span>
                        <span className={isPaid ? 'text-green-600' : 'text-red-600'}>
                            {isPaid ? '✓ Fully paid' : '₱' + fmt(bal)}
                        </span>
                    </div>
                    {(profile.payments || []).length > 0 && (
                        <div className="text-[10px] text-gray-400 text-right mt-1">Click to view full detail</div>
                    )}
                </div>
            )}
        </div>
    );
};

// ── Detail modal (click open balance) ───────────────────────────────────────
const DetailModal = ({ profile, onClose, onAddPayment }) => {
    const totalPaid = (profile.payments || []).reduce((s, p) => s + Number(p.amount), 0);
    const bal = Number(profile.openBalance);
    const isPaid = bal <= 0;

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-lg max-h-[88vh] overflow-y-auto shadow-2xl">
                <div className="p-5 border-b border-gray-100 flex justify-between items-start">
                    <div>
                        <div className="font-semibold text-gray-900">{profile.soldTo}</div>
                        <div className="text-xs text-gray-500 mt-0.5">Invoice dated {fmtDate(profile.createdAt)}</div>
                    </div>
                    <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 rounded-lg">
                        <X size={18} />
                    </button>
                </div>

                <div className="p-5">
                    {/* Amount due header */}
                    <div className="bg-gray-50 rounded-xl p-4 mb-4 flex justify-between items-center">
                        <span className="text-sm text-gray-500">Amount due</span>
                        <span className="text-lg font-bold text-gray-900">₱{fmt(profile.totalAmountDue)}</span>
                    </div>

                    {/* Payment history */}
                    <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
                        Payment history
                        {(profile.payments || []).length > 0 && (
                            <span className="ml-1 font-normal text-gray-400">
                                ({profile.payments.length} entr{profile.payments.length > 1 ? 'ies' : 'y'})
                            </span>
                        )}
                    </div>

                    {(profile.payments || []).length === 0 ? (
                        <div className="text-sm text-gray-400 italic mb-4">No payments recorded yet.</div>
                    ) : (
                        <div className="space-y-2 mb-4">
                            {profile.payments.map((p, idx) => {
                                // State for this payment's dropdown
                                const [isOpen, setIsOpen] = React.useState(false);

                                return (
                                    <div key={p.id} className="bg-gray-50 rounded-xl overflow-hidden">
                                        {/* Clickable header */}
                                        <div
                                            className="flex items-start justify-between p-3 cursor-pointer hover:bg-gray-100 transition"
                                            onClick={() => setIsOpen(!isOpen)}
                                        >
                                            <div className="flex items-start gap-3 flex-1">
                                                <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                                                    {idx + 1}
                                                </div>
                                                <div className="flex-1">
                                                    <div className="text-sm font-semibold text-green-700">₱{fmt(p.amount)}</div>
                                                    <div className="text-xs text-gray-500 mt-0.5">
                                                        {fmtDate(p.paymentDate)}
                                                        {p.referenceNumber && (
                                                            <span className="ml-1 font-mono text-[10px] bg-gray-200 px-1 rounded">
                                                                {p.referenceNumber}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            {/* Dropdown indicator */}
                                            <div className="text-gray-400">
                                                {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                            </div>
                                        </div>

                                        {/* Dropdown content - proof image */}
                                        {isOpen && p.proofFilePath && (
                                            <div className="px-3 pb-3 pt-0 border-t border-gray-200 mt-2">
                                                <ProofImage filePath={p.proofFilePath} fileName={p.proofFileName} />
                                            </div>
                                        )}

                                        {/* Show "No proof" message when no proof but dropdown opened */}
                                        {isOpen && !p.proofFilePath && (
                                            <div className="px-3 pb-3 pt-0 text-xs text-gray-400 italic">
                                                No proof of payment uploaded
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Balance banner */}
                    <div
                        className={`rounded-xl p-4 flex justify-between items-center mb-4 ${isPaid
                            ? 'bg-green-50 border border-green-200'
                            : 'bg-red-50 border border-red-200'
                            }`}
                    >
                        <div>
                            <div className={`text-xs font-semibold uppercase tracking-wide ${isPaid ? 'text-green-700' : 'text-red-700'}`}>
                                Open balance
                            </div>
                            {(profile.payments || []).length > 0 && (
                                <div className={`text-xs mt-0.5 ${isPaid ? 'text-green-600' : 'text-red-600'}`}>
                                    ₱{fmt(profile.totalAmountDue)} − ₱{fmt(totalPaid)} paid
                                </div>
                            )}
                        </div>
                        <div className={`text-xl font-bold ${isPaid ? 'text-green-700' : 'text-red-700'}`}>
                            {isPaid ? '✓ Fully paid' : '₱' + fmt(bal)}
                        </div>
                    </div>

                    <div className="flex justify-end">
                        <button
                            onClick={() => { onClose(); onAddPayment(profile); }}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition"
                        >
                            <CreditCard size={15} />
                            Record payment
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// ── Payment modal ────────────────────────────────────────────────────────────
const PaymentModal = ({ profile, onClose, onSaved }) => {
    const [amount, setAmount] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [ref, setRef] = useState('');
    const [proofFile, setProofFile] = useState(null);
    const [saving, setSaving] = useState(false);
    const fileRef = useRef();

    const totalPaid = (profile.payments || []).reduce((s, p) => s + Number(p.amount), 0);
    const balance = Math.max(0, Number(profile.totalAmountDue) - totalPaid);

    const handleSave = async () => {
        if (!amount || Number(amount) <= 0) {
            toast.error('Enter a valid payment amount');
            return;
        }
        if (proofFile) {
            const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'application/pdf'];
            const maxSize = 5 * 1024 * 1024; // 5MB

            if (!allowedTypes.includes(proofFile.type)) {
                toast.error('Only PNG, JPG, JPEG, or PDF files are allowed');
                return;
            }

            if (proofFile.size > maxSize) {
                toast.error('File size must be less than 5MB');
                return;
            }
        }

        setSaving(true);
        try {
            const formData = new FormData();
            formData.append('amount', amount);
            formData.append('paymentDate', date);
            if (ref) formData.append('referenceNumber', ref);
            if (proofFile) formData.append('proofFile', proofFile);

            const res = await api.upload(`/invoice-profiles/${profile.id}/payments`, formData);
            if (res.success) {
                toast.success('Payment recorded successfully!');
                onSaved(res.data.data || res.data);
                onClose();
            } else {
                toast.error(res.error || 'Failed to save payment');
            }
        } catch (e) {
            toast.error('Failed to save payment');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
                <div className="p-5 border-b border-gray-100 flex justify-between items-center">
                    <div>
                        <div className="font-semibold text-gray-900">Record payment</div>
                        <div className="text-xs text-gray-500 mt-0.5">{profile.soldTo}</div>
                    </div>
                    <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 rounded-lg">
                        <X size={18} />
                    </button>
                </div>

                <div className="p-5">
                    {/* Summary */}
                    <div className="grid grid-cols-3 gap-2 mb-5">
                        {[
                            ['Total due', '₱' + fmt(profile.totalAmountDue), ''],
                            ['Paid', '₱' + fmt(totalPaid), 'text-green-600'],
                            ['Balance', '₱' + fmt(balance), balance > 0 ? 'text-red-600' : 'text-green-600'],
                        ].map(([l, v, cls]) => (
                            <div key={l} className="bg-gray-50 rounded-xl p-3">
                                <div className="text-[10px] text-gray-500 uppercase tracking-wide mb-1">{l}</div>
                                <div className={`text-sm font-bold ${cls}`}>{v}</div>
                            </div>
                        ))}
                    </div>

                    <div className="space-y-3">
                        <div>
                            <label className="block text-xs text-gray-500 mb-1 font-medium">Amount *</label>
                            <input
                                type="number"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                placeholder="0.00"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs text-gray-500 mb-1 font-medium">Date</label>
                                <input
                                    type="date"
                                    value={date}
                                    onChange={(e) => setDate(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-xs text-gray-500 mb-1 font-medium">Reference</label>
                                <input
                                    type="text"
                                    value={ref}
                                    onChange={(e) => setRef(e.target.value)}
                                    placeholder="CHK-00123"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs text-gray-500 mb-1 font-medium">Proof of payment (optional)</label>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => fileRef.current?.click()}
                                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 transition"
                                >
                                    📎 Upload
                                </button>
                                <input
                                    ref={fileRef}
                                    type="file"
                                    accept="image/*,application/pdf"
                                    className="hidden"
                                    onChange={(e) => setProofFile(e.target.files[0] || null)}
                                />
                                {proofFile && (
                                    <span className="text-xs text-green-600 truncate max-w-[160px]">✓ {proofFile.name}</span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-5 border-t border-gray-100 flex justify-end gap-2">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 transition"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving || !amount || Number(amount) <= 0}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition disabled:opacity-40"
                    >
                        {saving ? 'Saving...' : 'Save payment'}
                    </button>
                </div>
            </div>
        </div>
    );
};

// ── Main InvoicingProfile page ───────────────────────────────────────────────
const InvoicingProfile = ({ onBack }) => {
    const [profiles, setProfiles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [detailProfile, setDetailProfile] = useState(null);
    const [paymentProfile, setPaymentProfile] = useState(null);
    const [editingDateId, setEditingDateId] = useState(null);
    const [editingDateValue, setEditingDateValue] = useState('');

    const saveDate = async (profileId) => {
        if (!editingDateValue) {
            setEditingDateId(null);
            return;
        }
        try {
            const res = await api.put(`/invoice-profiles/${profileId}/date`, { date: editingDateValue });
            if (res.success) {
                setProfiles(prev => prev.map(p =>
                    p.id === profileId ? { ...p, createdAt: editingDateValue } : p
                ));
                toast.success('Date updated');
            } else {
                toast.error(res.message || 'Failed to update date');
            }
        } catch {
            toast.error('Failed to update date');
        } finally {
            setEditingDateId(null);
            setEditingDateValue('');
        }
    };

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.get('/invoice-profiles');
            if (res.success) setProfiles(res.data?.data || res.data || []);
        } catch {
            toast.error('Failed to load invoicing profiles');
        } finally {
            setLoading(false);
        }
    }, []);

    const handleDelete = async (id) => {
        if (!window.confirm('Delete this invoice profile? This cannot be undone.')) return;
        try {
            const res = await api.delete(`/invoice-profiles/${id}`);
            if (res.success) {
                toast.success('Invoice profile deleted');
                setProfiles(prev => prev.filter(p => p.id !== id));
            } else {
                toast.error(res.message || 'Failed to delete');
            }
        } catch {
            toast.error('Failed to delete invoice profile');
        }
    };

    useEffect(() => { load(); }, [load]);

    const filtered = profiles.filter((p) => {
        const matchSearch =
            !search ||
            p.soldTo?.toLowerCase().includes(search.toLowerCase()) ||
            p.companyName?.toLowerCase().includes(search.toLowerCase());
        const bal = Number(p.openBalance);
        if (statusFilter === 'PAID' && bal > 0) return false;
        if (statusFilter === 'UNPAID' && bal <= 0) return false;
        return matchSearch;
    });


    return (
        <div className="min-h-screen bg-gray-50 p-3 lg:p-5">
            {/* Header */}
            <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                <div>
                    <button
                        onClick={onBack}
                        className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 mb-1 transition"
                    >
                        <ArrowLeft size={15} />
                        Back to Sales
                    </button>
                    <h1 className="text-xl font-bold text-gray-900">Invoicing Profile</h1>
                    <p className="text-xs text-gray-500 mt-0.5">
                        Hover open balance to preview · Click to view full detail
                    </p>
                </div>
                <button
                    onClick={load}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-100 transition"
                >
                    ↻ Refresh
                </button>
            </div>


            {/* Filters */}
            <div className="bg-white rounded-xl border border-gray-200 p-3 mb-3 flex flex-wrap gap-3 items-center">
                <input
                    placeholder="Search company..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm w-48 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                    <option value="ALL">All status</option>
                    <option value="UNPAID">With balance</option>
                    <option value="PAID">Fully paid</option>
                </select>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl border border-gray-200">
                <div className="overflow-x-auto overflow-y-visible">
                    <table className="w-full min-w-[900px]" style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
                        <thead className="bg-gray-50 border-b border-gray-200" style={{ position: 'relative', zIndex: 1 }}>
                            <tr>
                                {[
                                    'Date', 'Transaction type', 'Company name',
                                    'Vatable sales', 'VAT', 'Less W/H tax',
                                    'Total amount', 'Open balance', 'Payment', '',
                                ].map((h, i) => (
                                    <th
                                        key={h}
                                        className={`px-4 py-3 text-[11px] font-medium text-gray-500 uppercase tracking-wide whitespace-nowrap ${i > 2 ? 'text-right' : 'text-left'
                                            } ${i === 8 ? 'text-center' : ''}`}
                                    >
                                        {h}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                <tr>
                                    <td colSpan={9} className="px-4 py-10 text-center text-gray-400 text-sm">
                                        Loading...
                                    </td>
                                </tr>
                            ) : filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={9} className="px-4 py-10 text-center text-gray-400 text-sm italic">
                                        {profiles.length === 0
                                            ? 'No invoices yet. Generate an invoice and click "Generate to invoicing profile".'
                                            : 'No results match your filter.'}
                                    </td>
                                </tr>
                            ) : (
                                filtered.map((p) => {
                                    const isPaid = Number(p.openBalance) <= 0;
                                    return (
                                        <tr key={p.id} className="hover:bg-gray-50 transition">
                                            <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">
                                                {editingDateId === p.id ? (
                                                    <input
                                                        type="date"
                                                        autoFocus
                                                        value={editingDateValue}
                                                        onChange={(e) => setEditingDateValue(e.target.value)}
                                                        onBlur={() => saveDate(p.id)}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter') saveDate(p.id);
                                                            if (e.key === 'Escape') { setEditingDateId(null); setEditingDateValue(''); }
                                                        }}
                                                        className="border border-blue-400 rounded px-1 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                    />
                                                ) : (
                                                    <button
                                                        onClick={() => {
                                                            setEditingDateId(p.id);
                                                            const d = p.createdAt ? new Date(p.createdAt).toISOString().split('T')[0] : '';
                                                            setEditingDateValue(d);
                                                        }}
                                                        className="text-left hover:text-blue-600 hover:underline decoration-dashed underline-offset-2 transition"
                                                        title="Click to edit date"
                                                    >
                                                        {fmtDate(p.createdAt)}
                                                    </button>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="text-xs px-2 py-1 rounded-full font-medium bg-blue-100 text-blue-700 whitespace-nowrap">
                                                    {p.transactionType || 'Sales Invoice'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-sm font-medium text-gray-900 max-w-[180px] truncate">
                                                {p.soldTo}
                                            </td>
                                            <td className="px-4 py-3 text-xs text-right whitespace-nowrap">
                                                ₱{fmt(p.vatableSales)}
                                            </td>
                                            <td className="px-4 py-3 text-xs text-right whitespace-nowrap">
                                                ₱{fmt(p.vat)}
                                            </td>
                                            <td className="px-4 py-3 text-xs text-right text-red-600 whitespace-nowrap">
                                                −₱{fmt(p.withholdingTax)}
                                            </td>
                                            <td className="px-4 py-3 text-xs text-right font-semibold whitespace-nowrap">
                                                ₱{fmt(p.totalAmountDue)}
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <BalanceTooltip
                                                    profile={p}
                                                    onClick={() => setDetailProfile(p)}
                                                />
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <button
                                                    onClick={() => setPaymentProfile(p)}
                                                    title="Record / view payments"
                                                    className={`w-8 h-8 rounded-lg flex items-center justify-center mx-auto transition ${isPaid
                                                        ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                                        : 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                                                        }`}
                                                >
                                                    <CreditCard size={15} />
                                                </button>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <button
                                                    onClick={() => handleDelete(p.id)}
                                                    title="Delete invoice profile"
                                                    className="w-8 h-8 rounded-lg flex items-center justify-center mx-auto transition bg-red-100 text-red-600 hover:bg-red-200"
                                                >
                                                    <Trash2 size={15} />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Detail modal */}
            {detailProfile && (
                <DetailModal
                    profile={detailProfile}
                    onClose={() => setDetailProfile(null)}
                    onAddPayment={(p) => setPaymentProfile(p)}
                />
            )}

            {/* Payment modal */}
            {paymentProfile && (
                <PaymentModal
                    profile={paymentProfile}
                    onClose={() => setPaymentProfile(null)}
                    onSaved={(updated) => {
                        setProfiles((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
                        setPaymentProfile(null);
                    }}
                />
            )}
        </div>
    );
};

export default InvoicingProfile;