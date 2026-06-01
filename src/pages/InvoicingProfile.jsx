import React, { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '../services/api';
import toast from 'react-hot-toast';
import { ArrowLeft, CreditCard, X, Trash2, Eye, ChevronDown, ChevronUp, FileText } from 'lucide-react';
import '../styles/invoice-print.css';

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

        const filename = filePath.split('/').pop();
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
    const payments = profile.payments || [];

    return (
        <div
            className="inline-block w-full"
            style={{ position: 'static' }}
            onMouseEnter={(e) => { setHovered(true); setPos({ x: e.clientX, y: e.clientY }); }}
            onMouseMove={(e) => setPos({ x: e.clientX, y: e.clientY })}
            onMouseLeave={() => setHovered(false)}
        >
            <button
                onClick={onClick}
                className={`text-right w-full font-semibold text-sm underline decoration-dashed underline-offset-2 cursor-pointer transition-colors ${isPaid ? 'text-emerald-600 hover:text-emerald-700' : 'text-red-500 hover:text-red-600'
                    }`}
            >
                {isPaid ? '✓ Paid' : '₱' + fmt(bal)}
            </button>
            {payments.length > 0 && (
                <div className="text-[10px] text-gray-400 text-right mt-0.5 tabular-nums">
                    {payments.length} payment{payments.length > 1 ? 's' : ''} · ₱{fmt(paid)}
                </div>
            )}

            {hovered && (
                <div
                    className="w-72 bg-white rounded-xl border border-gray-100 shadow-xl overflow-hidden"
                    style={{
                        position: 'fixed',
                        zIndex: 999999,
                        left: Math.min(pos.x + 12, window.innerWidth - 300),
                        top: pos.y - 20,
                        transform: 'translateY(-100%)',
                        pointerEvents: 'none',
                    }}
                >
                    <div className="px-4 py-3 border-b border-gray-50 flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Payment Summary</span>
                        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${isPaid ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'
                            }`}>
                            {isPaid ? 'Settled' : 'Outstanding'}
                        </span>
                    </div>

                    <div className="px-4 py-3 flex items-center justify-between border-b border-gray-50">
                        <span className="text-xs text-gray-500">Invoice amount</span>
                        <span className="text-sm font-semibold text-gray-800 tabular-nums">₱{fmt(profile.totalAmountDue)}</span>
                    </div>

                    {payments.length === 0 ? (
                        <div className="px-4 py-4 text-center">
                            <div className="text-xs text-gray-400 italic">No payments recorded</div>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-50 max-h-44 overflow-y-auto">
                            {payments.map((p, idx) => (
                                <div key={p.id} className="px-4 py-2.5 flex items-center justify-between gap-3 hover:bg-gray-50 transition-colors">
                                    <div className="flex items-center gap-2.5 min-w-0">
                                        <div className="w-5 h-5 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center text-[10px] font-bold flex-shrink-0">
                                            {idx + 1}
                                        </div>
                                        <div className="min-w-0">
                                            <div className="text-[11px] text-gray-500 leading-tight">
                                                {new Date(p.paymentDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                            </div>
                                            {p.referenceNumber && (
                                                <div className="text-[10px] text-gray-400 font-mono truncate">{p.referenceNumber}</div>
                                            )}
                                        </div>
                                    </div>
                                    <span className="text-sm font-semibold text-emerald-600 tabular-nums flex-shrink-0">₱{fmt(p.amount)}</span>
                                </div>
                            ))}
                        </div>
                    )}

                    {payments.length > 0 && (
                        <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 space-y-1.5">
                            <div className="flex items-center justify-between">
                                <span className="text-[11px] text-gray-500">Total paid</span>
                                <span className="text-xs font-semibold text-emerald-600 tabular-nums">₱{fmt(paid)}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-[11px] text-gray-500">Remaining</span>
                                <span className={`text-xs font-bold tabular-nums ${isPaid ? 'text-emerald-600' : 'text-red-500'}`}>
                                    {isPaid ? '₱0.00' : '₱' + fmt(bal)}
                                </span>
                            </div>
                        </div>
                    )}

                    <div className="px-4 py-2 border-t border-gray-50">
                        <p className="text-[10px] text-gray-300 text-center">Click to manage payments</p>
                    </div>
                </div>
            )}
        </div>
    );
};

const PaymentEntry = ({ p, idx }) => {
    const [isOpen, setIsOpen] = useState(false);
    return (
        <div className="bg-gray-50 rounded-xl overflow-hidden">
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
                <div className="text-gray-400">
                    {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </div>
            </div>
            {isOpen && p.proofFilePath && (
                <div className="px-3 pb-3 pt-0 border-t border-gray-200 mt-2">
                    <ProofImage filePath={p.proofFilePath} fileName={p.proofFileName} />
                </div>
            )}
            {isOpen && !p.proofFilePath && (
                <div className="px-3 pb-3 pt-0 text-xs text-gray-400 italic">
                    No proof of payment uploaded
                </div>
            )}
        </div>
    );
};

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
                    <div className="bg-gray-50 rounded-xl p-4 mb-4 flex justify-between items-center">
                        <span className="text-sm text-gray-500">Amount due</span>
                        <span className="text-lg font-bold text-gray-900">₱{fmt(profile.totalAmountDue)}</span>
                    </div>

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
                            {profile.payments.map((p, idx) => (
                                <PaymentEntry key={p.id} p={p} idx={idx} />
                            ))}
                        </div>
                    )}

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
            const maxSize = 5 * 1024 * 1024;

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

const InvoicingProfile = ({ onBack }) => {
    const [profiles, setProfiles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [detailProfile, setDetailProfile] = useState(null);
    const [paymentProfile, setPaymentProfile] = useState(null);
    const [editingDateId, setEditingDateId] = useState(null);
    const [editingDateValue, setEditingDateValue] = useState('');
    const [receiptProfile, setReceiptProfile] = useState(null);
    const [expandedRows, setExpandedRows] = useState({});
    const [cosData, setCosData] = useState({});

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
            toast.error('Failed to load Sales Journal');
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

    const parseTermsDays = (terms) => {
        if (!terms) return null;
        const match = String(terms).match(/(\d+)/);
        return match ? parseInt(match[1]) : null;
    };

    const calcOverdueDays = (invoiceDate, terms) => {
        if (!invoiceDate || !terms) return null;
        const days = parseTermsDays(terms);
        if (days === null) return null;
        const due = new Date(invoiceDate);
        due.setDate(due.getDate() + days);
        due.setHours(0, 0, 0, 0);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return Math.floor((today - due) / (1000 * 60 * 60 * 24));
    };

    const getStatus = (profile) => {
        const paid = (profile.payments || []).reduce((s, p) => s + Number(p.amount), 0);
        const balance = Number(profile.openBalance);
        if (balance <= 0) return { label: 'Fully Paid', cls: 'bg-green-100 text-green-800' };
        if (paid > 0) return { label: 'Partially Paid', cls: 'bg-yellow-100 text-yellow-800' };
        return { label: 'Unpaid', cls: 'bg-red-100 text-red-800' };
    };

    useEffect(() => {
        if (profiles && profiles.length > 0) {
            profiles.forEach(p => loadCosData(p.id));
        }
    }, [profiles]);

    const loadCosData = async (profileId) => {
        if (cosData[profileId] !== undefined) return;
        setCosData(prev => ({ ...prev, [profileId]: null }));
        try {
            const res = await api.get(`/invoice-profiles/${profileId}/cos-summary`).catch(() => ({ success: false }));
            if (res.success && res.data) {
                setCosData(prev => ({ ...prev, [profileId]: res.data?.data || res.data }));
            } else {
                setCosData(prev => ({ ...prev, [profileId]: { items: [], productCost: 0, shipping: 0, others: 0, totalCos: 0 } }));
            }
        } catch {
            setCosData(prev => ({ ...prev, [profileId]: { items: [], productCost: 0, shipping: 0, others: 0, totalCos: 0 } }));
        }
    };

    const fmtPeriod = (profile) => {
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const sm = profile.startMonth;
        const em = profile.endMonth;
        const sy = profile.startYear;
        const ey = profile.endYear;
        if (!sm || !sy) {
            const d = profile.invoiceDate || profile.createdAt;
            if (!d) return '—';
            return new Date(d).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        }
        const smName = months[sm - 1];
        const emName = months[(em || sm) - 1];
        const eyVal = ey || sy;
        if (smName === emName && sy === eyVal) return `${smName} ${sy}`;
        if (sy === eyVal) return `${smName} – ${emName} ${sy}`;
        if (smName === emName) return `${smName} ${sy} – ${eyVal}`;
        return `${smName} – ${emName} ${sy} – ${eyVal}`;
    };

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
                    <h1 className="text-xl font-bold text-gray-900">Sales Journal</h1>
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

            <div className="bg-white rounded-xl border border-gray-200" style={{ overflow: 'visible' }}>
                <div className="overflow-x-auto" style={{ overflowY: 'visible' }}>
                    <table className="w-full min-w-[1100px]" style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
                        <thead className="bg-gray-50 border-b border-gray-200" style={{ position: 'relative', zIndex: 1 }}>
                            <tr>
                                {[
                                    { label: 'Invoice #', align: 'left' },
                                    { label: 'Invoice Date', align: 'left' },
                                    { label: 'Period', align: 'left' },
                                    { label: 'Customer', align: 'left' },
                                    { label: 'vatableSalesHeader', align: 'right' },
                                    { label: 'VAT/PT', align: 'right' },
                                    { label: 'Less: EWT', align: 'right' },
                                    { label: 'Due', align: 'right' },
                                    { label: 'Terms', align: 'center' },
                                    { label: 'Days Overdue', align: 'center' },
                                    { label: 'Amount Paid', align: 'right' },
                                    { label: 'Balance', align: 'right' },
                                    { label: 'Cost of Sales', align: 'right' },
                                    { label: 'Actions', align: 'center' },
                                ].map(({ label, align }) => (
                                    <th
                                        key={label}
                                        className={`px-4 py-3 text-[11px] font-medium text-gray-500 uppercase tracking-wide text-${align}`}
                                    >
                                        {label === 'vatableSalesHeader' ? (
                                            <span className="flex flex-col items-end leading-tight">
                                                <span>Vatable Sales /</span>
                                                <span>Gross Sales (PT)</span>
                                            </span>
                                        ) : label}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                <tr>
                                    <td colSpan={14} className="px-4 py-10 text-center text-gray-400 text-sm">
                                        Loading...
                                    </td>
                                </tr>
                            ) : filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={14} className="px-4 py-10 text-center text-gray-400 text-sm italic">
                                        {profiles.length === 0
                                            ? 'No invoices yet. Generate an invoice and click "Generate to Sales Journal".'
                                            : 'No results match your filter.'}
                                    </td>
                                </tr>
                            ) : (
                                filtered.map((p) => {
                                    const totalPaid = (p.payments || []).reduce((s, pay) => s + Number(pay.amount), 0);
                                    const overdueDays = calcOverdueDays(p.invoiceDate || p.createdAt, p.companyTerms);
                                    const termsDays = parseTermsDays(p.companyTerms);
                                    const isPaid = Number(p.openBalance) <= 0;
                                    const hasPartialPayments = totalPaid > 0 && !isPaid;

                                    const rowBg = isPaid
                                        ? 'bg-green-50 hover:bg-green-100'
                                        : hasPartialPayments
                                            ? 'bg-yellow-50 hover:bg-yellow-100'
                                            : 'bg-red-50 hover:bg-red-100';

                                    return (
                                        <React.Fragment key={p.id}>
                                            <tr className={`${rowBg} transition`}>
                                                <td className="px-4 py-3 text-xs font-mono whitespace-nowrap">
                                                    {p.invoiceNumber ? (
                                                        <button
                                                            onClick={() => setReceiptProfile(p)}
                                                            className="text-blue-600 hover:underline font-mono font-semibold"
                                                            title="View Invoice Receipt"
                                                        >
                                                            {p.invoiceNumber}
                                                        </button>
                                                    ) : (
                                                        <span className="text-gray-300 italic">—</span>
                                                    )}
                                                </td>
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
                                                                const d = p.invoiceDate || (p.createdAt ? new Date(p.createdAt).toISOString().split('T')[0] : '');
                                                                setEditingDateValue(d);
                                                            }}
                                                            className="text-left hover:text-blue-600 hover:underline decoration-dashed underline-offset-2 transition"
                                                            title="Click to edit date"
                                                        >
                                                            {fmtDate(p.invoiceDate || p.createdAt)}
                                                        </button>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">{fmtPeriod(p)}</td>
                                                <td className="px-4 py-3 text-sm font-medium text-gray-900 max-w-[160px] truncate">
                                                    {p.soldTo}
                                                    {p.companyName && p.companyName !== p.soldTo && (
                                                        <div className="text-[10px] text-gray-400 font-normal">{p.companyName}</div>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-xs text-right whitespace-nowrap">₱{fmt(p.vatableSales)}</td>
                                                <td className="px-4 py-3 text-xs text-right whitespace-nowrap">₱{fmt(p.vat)}</td>
                                                <td className="px-4 py-3 text-xs text-right text-red-600 whitespace-nowrap">−₱{fmt(p.withholdingTax)}</td>
                                                <td className="px-4 py-3 text-xs text-right font-semibold whitespace-nowrap">₱{fmt(p.totalAmountDue)}</td>
                                                <td className="px-4 py-3 text-center text-xs text-gray-600 whitespace-nowrap">
                                                    {termsDays !== null ? p.companyTerms : <span className="text-gray-300">—</span>}
                                                </td>
                                                <td className="px-4 py-3 text-center whitespace-nowrap">
                                                    {termsDays !== null ? (
                                                        overdueDays === null ? <span className="text-[10px] text-gray-300">—</span>
                                                            : overdueDays === 0 ? <span className="text-[10px] font-semibold text-green-600">Due today</span>
                                                                : overdueDays < 0 ? <span className="text-[10px] font-semibold text-yellow-600">{Math.abs(overdueDays)}d</span>
                                                                    : <span className="text-[10px] font-semibold text-red-600">{overdueDays}d</span>
                                                    ) : <span className="text-[10px] text-gray-300">—</span>}
                                                </td>
                                                <td className="px-4 py-3 text-xs text-right font-medium text-green-700 whitespace-nowrap">
                                                    {totalPaid > 0 ? `₱${fmt(totalPaid)}` : <span className="text-gray-300">—</span>}
                                                </td>
                                                <td className="px-4 py-3 text-xs text-right font-semibold whitespace-nowrap" style={{ overflow: 'visible', position: 'relative' }}>
                                                    <BalanceTooltip profile={p} onClick={() => setDetailProfile(p)} />
                                                </td>
                                                {/* Cost of Sales */}
                                                <td className="px-4 py-3 text-xs text-right whitespace-nowrap">
                                                    <button
                                                        onClick={() => {
                                                            const nowExpanded = !expandedRows[p.id];
                                                            setExpandedRows(prev => ({ ...prev, [p.id]: nowExpanded }));
                                                            if (nowExpanded && cosData[p.id] === undefined) {
                                                                loadCosData(p.id);
                                                            }
                                                        }}
                                                        className="text-blue-700 font-semibold hover:underline inline-flex items-center gap-1"
                                                    >
                                                        {expandedRows[p.id] ? (
                                                            <ChevronUp size={12} className="text-blue-500" />
                                                        ) : (
                                                            <ChevronDown size={12} className="text-blue-500" />
                                                        )}
                                                        {cosData[p.id] === undefined ? '—' :
                                                            cosData[p.id] === null ? '...' :
                                                                `₱${fmt(
                                                                    (cosData[p.id].items || []).reduce((s, item) => {
                                                                        const qty = item.qty || item.totalQuantity || 1;
                                                                        const unitCost = Number(item.unitCost || 0);
                                                                        return s + (unitCost * qty);
                                                                    }, 0)
                                                                )}`}
                                                    </button>
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <div className="flex items-center justify-center gap-1">
                                                        <button onClick={() => setPaymentProfile(p)} title="Record payment" className="w-8 h-8 rounded-lg flex items-center justify-center bg-amber-50 text-amber-600 hover:bg-amber-100 transition">
                                                            <CreditCard size={15} />
                                                        </button>
                                                        <button onClick={() => handleDelete(p.id)} title="Delete" className="w-8 h-8 rounded-lg flex items-center justify-center bg-red-50 text-red-600 hover:bg-red-100 transition">
                                                            <Trash2 size={15} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                            {expandedRows[p.id] && cosData[p.id] && cosData[p.id] !== null && (() => {
                                                const rawItems = cosData[p.id].items || p.items || [];
                                                const totalShipping = Number(cosData[p.id].shipping || 0);
                                                const totalOthers = Number(cosData[p.id].others || 0);
                                                const n = rawItems.length || 1;
                                                const itemsWithBreakdown = rawItems.map(item => {
                                                    const qty = item.qty || item.totalQuantity || 1;
                                                    const unitCost = item.unitCost || 0;
                                                    const itemShipping = Number(item.itemShipping || 0);
                                                    const itemOthers = Number(item.itemOthers || 0);
                                                    const itemProductCost = Number(item.itemProductCost || 0);
                                                    const itemTotal = Number(item.unitCost || 0) * qty;
                                                    return {
                                                        ...item,
                                                        qty,
                                                        itemProductCost,
                                                        productName: item.productName || item.description || '—',
                                                        variationDisplay: item.variationDisplay || item.variation?.combinationDisplay || null,
                                                        itemShipping,
                                                        itemOthers,
                                                        itemTotal,
                                                    };
                                                });

                                                const grandTotal = itemsWithBreakdown.reduce((s, i) => s + i.itemTotal, 0);

                                                return (
                                                    <tr key={`cos-${p.id}`} className="bg-blue-50">
                                                        <td colSpan={14} className="px-6 py-4">
                                                            <div className="text-xs font-semibold text-blue-700 mb-2 uppercase tracking-wide">Cost of Sales Breakdown</div>
                                                            <table className="w-full text-xs mb-2">
                                                                <thead>
                                                                    <tr className="text-gray-500 border-b border-blue-200">
                                                                        <th className="text-left pb-1">SKU</th>
                                                                        <th className="text-left pb-1">UPC</th>
                                                                        <th className="text-left pb-1">Description</th>
                                                                        <th className="text-right pb-1">Qty</th>
                                                                        <th className="text-right pb-1">Unit Cost</th>
                                                                        <th className="text-right pb-1 text-blue-700 font-bold">Total Cost</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody className="divide-y divide-blue-100">
                                                                    {itemsWithBreakdown.map((item, i) => (
                                                                        <tr key={i} className="hover:bg-blue-100 transition">
                                                                            <td className="py-1.5 text-gray-500 font-mono text-[10px]">{item.sku || '—'}</td>
                                                                            <td className="py-1.5 text-gray-500 font-mono text-[10px]">{item.upc || '—'}</td>
                                                                            <td className="py-1.5 text-gray-800 font-medium">
                                                                                {item.productName}
                                                                                {item.variationDisplay && item.variationDisplay !== 'Adjustment' && (
                                                                                    <span className="text-xs text-gray-500 ml-1">({item.variationDisplay})</span>
                                                                                )}
                                                                                {item.variationDisplay === 'Adjustment' && (
                                                                                    <span className="ml-2 text-xs text-blue-600 italic">(Adjustment)</span>
                                                                                )}
                                                                            </td>
                                                                            <td className="py-1.5 text-right text-gray-700 font-medium">{Number(item.qty).toLocaleString()}</td>
                                                                            <td className="py-1.5 text-right text-gray-600">
                                                                                ₱{fmt(item.unitCost || 0)}
                                                                            </td>
                                                                            <td className="py-1.5 text-right font-bold text-blue-800 relative group">
                                                                                <span className="cursor-default underline decoration-dashed underline-offset-2">₱{fmt(item.itemTotal)}</span>
                                                                                <div className="absolute right-0 bottom-full mb-1 z-50 hidden group-hover:block w-56 bg-white border border-gray-200 rounded-lg shadow-xl p-3 text-xs">
                                                                                    <div className="flex justify-between mb-1 text-gray-600"><span>Unit Cost</span><span className="font-medium text-gray-800">₱{fmt(item.unitCost)}</span></div>
                                                                                    <div className="flex justify-between mb-2 text-gray-600"><span>Quantity</span><span className="font-medium text-gray-800">×{Number(item.qty).toLocaleString()}</span></div>
                                                                                    <div className="flex justify-between border-t border-gray-100 pt-2 font-bold text-blue-800"><span>Total</span><span>₱{fmt(item.itemTotal)}</span></div>
                                                                                </div>
                                                                            </td>
                                                                        </tr>
                                                                    ))}
                                                                </tbody>
                                                                <tfoot>
                                                                    <tr className="border-t-2 border-blue-300 bg-blue-100">
                                                                        <td colSpan={5} className="py-2 text-xs font-semibold text-blue-700 uppercase tracking-wide">Totals</td>
                                                                        <td className="py-2 text-right text-sm font-bold text-blue-900 relative group">
                                                                            <span className="cursor-default underline decoration-dashed underline-offset-2">₱{fmt(grandTotal)}</span>
                                                                            <div className="absolute right-0 bottom-full mb-1 z-50 hidden group-hover:block w-56 bg-white border border-gray-200 rounded-lg shadow-xl p-3 text-xs">
                                                                                <div className="flex justify-between border-t border-gray-100 pt-2 font-bold text-blue-800"><span>Grand Total (Unit Cost × Qty)</span><span>₱{fmt(grandTotal)}</span></div>
                                                                            </div>
                                                                        </td>
                                                                    </tr>
                                                                </tfoot>
                                                            </table>
                                                        </td>
                                                    </tr>
                                                );
                                            })()}
                                        </React.Fragment>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modals */}
            {receiptProfile && (
                <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-6">
                    <div className="bg-white rounded-2xl max-w-6xl w-full max-h-[95vh] overflow-y-auto shadow-2xl">
                        <div className="p-6 border-b border-gray-200 flex justify-between items-center sticky top-0 bg-white rounded-t-2xl z-10 print:hidden">
                            <h2 className="text-xl font-bold text-gray-900">Invoice Report</h2>
                            <div className="flex gap-3">
                                <button onClick={() => window.print()} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium">🖨️ Print</button>
                                <button onClick={() => setReceiptProfile(null)} className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition"><X size={24} /></button>
                            </div>
                        </div>
                        <div className="p-8" id="invoice-report">
                            <div className="flex justify-between items-start mb-5 pb-4 border-gray-900">
                                <div className="text-left leading-none space-y-0">
                                    <div className="text-[34px] font-bold text-gray-900 -mb-0 font-serif tracking-tight">WISECART MERCHANTS CORP.</div>
                                    <div className="text-[18px] text-gray-900 font-medium space-y-[1px] tracking-tight">
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
                                        <input type="text" readOnly value={receiptProfile.invoiceNumber || ''} placeholder="_____________" className="border-b border-gray-500 w-36 text-center focus:outline-none bg-transparent print:border-0" />
                                    </div>
                                </div>
                            </div>
                            <div className="flex justify-between items-center mb-2 mt-11">
                                <div className="flex gap-6">
                                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700"><input type="checkbox" className="w-6 h-6 border-2 border-gray-900" /> CASH SALES</label>
                                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700"><input type="checkbox" className="w-6 h-6 border-2 border-gray-900" /> CHARGE SALES</label>
                                </div>
                                <div className="text-right">
                                    <div className="flex items-center gap-2 justify-end text-gray-900">
                                        <span className="font-medium">DATE:</span>
                                        <input type="text" readOnly value={receiptProfile.invoiceDate ? new Date(receiptProfile.invoiceDate).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }) : receiptProfile.createdAt ? new Date(receiptProfile.createdAt).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }) : ''} className="border-b border-gray-500 text-sm focus:outline-none bg-transparent print:border-0" />
                                    </div>
                                </div>
                            </div>
                            <div className="border border-gray-900 p-3 mb-1.5" style={{ height: '165px' }}>
                                <div className="flex flex-col gap-2">
                                    <div className="flex items-center mb-1.5"><span className="font-bold text-gray-900 w-48">SOLD TO:</span><span className="text-black-900 flex-1 print-visible">{receiptProfile.soldTo || 'N/A'}</span></div>
                                    <div className="flex items-center mb-1.5"><span className="font-bold text-gray-900 w-48">REGISTERED NAME:</span><span className="text-black-900 flex-1 print-visible">{receiptProfile.registeredName || 'N/A'}</span></div>
                                    <div className="flex items-center mb-1.5"><span className="font-bold text-gray-900 w-48">TIN:</span><span className="text-black-900 flex-1 print-visible">{receiptProfile.tin || 'N/A'}</span></div>
                                    <div className="grid grid-cols-[180px_1fr] items-start gap-3"><div className="font-bold text-gray-900 pt-1 self-start">BUSINESS ADDRESS:</div><div className="text-black-900 -mt-1 leading-[1.1] tracking-tight print-visible">{receiptProfile.businessAddress || 'N/A'}</div></div>
                                </div>
                            </div>
                            <div className="border border-b-0 border-gray-900">
                                <table className="w-full" style={{ borderCollapse: 'collapse', minHeight: '150mm' }}>
                                    <thead>
                                        <tr className="border-b border-gray-900">
                                            <th className="text-left px-4 py-1 font-bold text-gray-900 text-sm leading-tight" style={{ width: '60%' }}>ITEM DESCRIPTION / NATURE OF SERVICE</th>
                                            <th className="text-right px-4 py-1 font-bold text-gray-900 text-sm leading-tight" style={{ width: '12%' }}>QTY.</th>
                                            <th className="text-right px-4 py-1 text-gray-900 text-xs text-[11px] leading-tight" style={{ width: '12%' }}>UNIT COST / PRICE</th>
                                            <th className="text-right px-4 py-1 font-bold text-gray-900 text-sm leading-tight" style={{ width: '15%' }}>AMOUNT</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {(receiptProfile.items || []).map((item, i) => (
                                            <tr key={i} className="align-top">
                                                <td className="py-1 px-4 text-sm text-gray-900 leading-tight">{item.productName}{item.variationDisplay && item.variationDisplay !== 'Adjustment' && <span> {item.variationDisplay}{item.upc ? ` - ${item.upc}` : ''}</span>}{item.variationDisplay === 'Adjustment' && <span className="ml-2 text-xs text-blue-600 italic">(Adjustment)</span>}</td>
                                                <td className="py-1 px-4 text-right text-sm text-gray-900 leading-tight">{Number(item.totalQuantity).toLocaleString()}</td>
                                                <td className="py-1 px-4 text-right text-sm text-gray-900 leading-tight">{fmt(item.unitCost)}</td>
                                                <td className="py-1 px-4 text-right text-sm text-gray-900 leading-tight">{fmt(item.totalAmount)}</td>
                                            </tr>
                                        ))}
                                        {(!receiptProfile.items || receiptProfile.items.length === 0) && (
                                            <tr><td colSpan={4} className="py-8 text-center text-gray-400 italic text-sm">No item data saved for this invoice.</td></tr>
                                        )}
                                        <tr className="h-full"><td colSpan={4} className="p-0"></td></tr>
                                    </tbody>
                                </table>
                            </div>
                            {/* VAT Summary Section */}
                            <div className="grid grid-cols-6 border border-gray-900 text-sm">
                                <div className="col-span-2 grid grid-cols-2">
                                    <div className="px-2 py-3 flex flex-col justify-start font-medium text-[13px]">
                                        <div className="mb-2">Total Sales:</div>
                                        <div className="mb-2">VAT/PT:</div>
                                        <div className="mb-2">Zero-Rated Sales:</div>
                                        <div>VAT-Exempt Sales:</div>
                                    </div>
                                    <div className="px-4 py-3 flex flex-col justify-start text-[15px]">
                                        <input readOnly value={fmt(receiptProfile.vatableSales || 0)} className="w-full text-right pb-0 mb-2 bg-transparent" />
                                        <input readOnly value={fmt(receiptProfile.vat || 0)} className="w-full text-right pb-0 mb-2 bg-transparent" />
                                        <input readOnly value={fmt(0)} className="w-full text-right pb-0 mb-2 bg-transparent" />
                                        <input readOnly value={fmt(0)} className="w-full text-right pb-0 bg-transparent" />
                                    </div>
                                </div>
                                <div className="border-l border-r border-gray-900 px-3 py-3 flex flex-col justify-center text-[11px]">
                                    <div className="font-medium leading-tight">SC/PWD/NAAC/MOV/<br />SOLO PARENT ID No.:</div>
                                    <div className="font-medium leading-tight mt-9">SC/PWD/NAAC/MOV/<br />Signature:</div>
                                </div>
                                <div className="border-r border-gray-900 px-3 py-3 flex flex-col justify-center text-[13px]">
                                    <input type="text" readOnly className="w-full pb-0 text-sm -mt-1 bg-transparent" />
                                    <input type="text" readOnly className="w-full pb-0 text-sm mt-5 bg-transparent" />
                                </div>
                                <div className="col-span-2 grid grid-cols-2">
                                    <div className="px-2 py-3 flex flex-col justify-start font-medium text-[11px]">
                                        <div className="mb-2 text-[9px]">TOTAL SALES (VAT Inclusive)</div>
                                        <div className="mb-2">Less: VAT</div>
                                        <div className="mb-2">Amount: Net of VAT</div>
                                        <div>Less: Discount<br /><span className="text-[10px]">(SC/PWD/NAAC/MOV/SP)</span></div>
                                    </div>
                                    <div className="px-4 pt-2 flex flex-col justify-start">
                                        <input readOnly value={fmt((receiptProfile.vatableSales || 0) + (receiptProfile.vat || 0))} className="w-full text-right pb-0 mb-2 text-[15px] bg-transparent" />
                                        <input readOnly value={fmt(receiptProfile.vat || 0)} className="w-full text-right pb-0 mb-2 text-[15px] bg-transparent" />
                                        <input readOnly value={fmt(receiptProfile.vatableSales || 0)} className="w-full text-right pb-0 mb-2 text-[15px] bg-transparent" />
                                        <input readOnly value={fmt(0)} className="w-full text-right pb-0 text-[15px] bg-transparent" />
                                    </div>
                                </div>
                            </div>

                            {/* Total Amount Due Section */}
                            <div className="grid grid-cols-6 border-l border-r border-b border-gray-900 text-sm">
                                <div className="col-span-4 border-r border-gray-900 px-4">
                                    <label className="flex items-start gap-2 text-sm font-medium text-gray-700">
                                        <input type="checkbox" className="w-6 h-6 mt-8" />
                                        <div>
                                            <div className="mb-8 mt-8">Received the amount of</div>
                                            <div className="border-b border-gray-900 mt-1 w-full"></div>
                                        </div>
                                    </label>
                                </div>
                                <div className="col-span-2 grid grid-cols-2">
                                    <div className="px-2 py-3 flex flex-col justify-start font-medium text-[11px]">
                                        <div className="mb-2">Add: VAT</div>
                                        <div className="mb-2">Less: Withholding Tax</div>
                                        <div>Total Amount Due:</div>
                                    </div>
                                    <div className="px-4 pt-2 flex flex-col justify-start">
                                        <input readOnly value={fmt(receiptProfile.vat || 0)} className="w-full text-right pb-0 mb-2 text-[15px] bg-transparent" />
                                        <input readOnly value={fmt(receiptProfile.withholdingTax || 0)} className="w-full text-right pb-0 mb-2 text-[15px] bg-transparent" />
                                        <input readOnly value={fmt(receiptProfile.totalAmountDue || 0)} className="w-full text-right font-bold pb-0 text-[16px] bg-transparent" />
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 border border-gray-900 text-sm mt-6">
                                <div className="border-gray-900 px-4 py-2"><div className="font-medium text-[16px]">PERMIT TO USE LOOSE LEAF No. : LLSI-080-1024-00002</div><div className="font-medium text-[16px]">DATE ISSUED: OCT. 11, 2024</div></div>
                                <div className="px-4 py-2 pb-4"><div className="font-medium text-[16px]">BIR AUTHORITY TO PRINT No. 080AU20240000016398</div><div className="font-medium text-[16px]">DATE ISSUED: OCT. 23, 2024</div><div className="font-medium text-[16px]">APPROVED SERIES: 0501-1500 • 20PADS (2X)</div></div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {detailProfile && <DetailModal profile={detailProfile} onClose={() => setDetailProfile(null)} onAddPayment={(p) => setPaymentProfile(p)} />}
            {paymentProfile && <PaymentModal profile={paymentProfile} onClose={() => setPaymentProfile(null)} onSaved={(updated) => { setProfiles((prev) => prev.map((p) => (p.id === updated.id ? updated : p))); setPaymentProfile(null); }} />}
        </div>
    );
};

export default InvoicingProfile;