import React, { useState, useEffect, useMemo } from 'react';
import { Trash2, Edit2, CheckCircle, ChevronDown, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../services/api';
import { useAuth, can } from '../../context/AuthContext';
import { inputCls, Field, MoneyInput } from './Shared';
import SearchableSelect from './SearchableSelect';

const ENTRY_CODES = new Set(['REGULAR_OT', 'REST_DAY', 'SPECIAL_HOLIDAY', 'REGULAR_HOLIDAY',
    'REST_DAY_REGULAR_HOLIDAY', 'NIGHT_DIFF', 'UNDERTIME_HOUR', 'LATE_HOUR', 'ABSENCE_DAY']);
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August',
    'September', 'October', 'November', 'December'].map((m, i) => ({ value: String(i + 1), label: m }));
const CUTOFFS = [
    { value: 'ALL', label: 'Whole month' },
    { value: 'FIRST', label: '1st - 15th' },
    { value: 'SECOND', label: '16th - end of month' },
];
const pad = (n) => String(n).padStart(2, '0');
const rangeFor = (month, year, cutoff) => {
    const m = Number(month), y = Number(year);
    const last = new Date(y, m, 0).getDate();
    return {
        from: `${y}-${pad(m)}-${cutoff === 'SECOND' ? '16' : '01'}`,
        to: `${y}-${pad(m)}-${cutoff === 'FIRST' ? '15' : pad(last)}`,
    };
};
const STATUS_BADGE = {
    PENDING: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
    APPROVED: 'bg-green-50 text-green-700 ring-1 ring-green-200',
};
const fmtShort = (d) =>
    d ? new Date(d + 'T00:00:00').toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

const now = new Date();
const EMPTY_FORM = (date) => ({
    employeeId: '', workDate: date, entryType: 'REGULAR_OT', value: '', unit: 'HOURS', remarks: '',
});

const OvertimeEntries = ({ canEdit }) => {
    const { user } = useAuth();
    const canApprove = can(user, 'payroll', 'approve');

    const YEARS = useMemo(() => {
        const y = now.getFullYear();
        return [y - 1, y, y + 1].map(v => ({ value: String(v), label: String(v) }));
    }, []);

    const [types, setTypes] = useState([]);
    const TYPES = types;
    const [employees, setEmployees] = useState([]);
    const [rows, setRows] = useState([]);
    const [month, setMonth] = useState(String(now.getMonth() + 1));
    const [year, setYear] = useState(String(now.getFullYear()));
    const [cutoff, setCutoff] = useState('ALL');
    const [filterEmployee, setFilterEmployee] = useState('');
    const [filterType, setFilterType] = useState('');
    const [editing, setEditing] = useState(null);
    const [collapsed, setCollapsed] = useState(() => new Set());
    const { from, to } = rangeFor(month, year, cutoff);
    const [form, setForm] = useState(EMPTY_FORM(now.toISOString().slice(0, 10)));

    useEffect(() => {
        api.get('/pay-types').then(r => {
            if (r.success) {
                setTypes((r.data || [])
                    .filter(p => p.category !== 'ALLOWANCE'
                        && (p.code
                            ? ENTRY_CODES.has(p.code) && p.includeInEntries !== false
                            : !!p.includeInEntries))
                    .map(p => [p.code || String(p.payTypeId), p.payTypeName, p.unit || 'HOURS']));
            }
        }).catch(() => { });
    }, []);

    useEffect(() => {
        api.get('/employees')
            .then(r => r.success && setEmployees((r.data || []).filter(e => e.status === 'ACTIVE')))
            .catch(() => { });
    }, []);

    useEffect(() => { load(); }, [from, to]);

    // keep the add-form date inside the chosen period
    useEffect(() => {
        setForm(p => (p.workDate >= from && p.workDate <= to ? p : { ...p, workDate: from }));
    }, [from, to]);

    const load = async () => {
        try {
            const r = await api.get(`/payroll/overtime?from=${from}&to=${to}`);
            if (r.success) setRows(r.data || []);
        } catch (e) { toast.error('Failed to load entries'); }
    };

    const metaOf = (code) => TYPES.find(t => t[0] === code);
    const label = (code) => (metaOf(code) || [])[1] || code;
    const modeOf = (code) => (metaOf(code) || [])[2] || 'HOURS';
    const unitMode = modeOf(form.entryType);

    const onTypeChange = (newType) => {
        const mode = modeOf(newType);
        setForm(p => ({
            ...p, entryType: newType, value: '',
            unit: mode === 'MINUTES' ? 'MINUTES' : mode === 'DAYS' ? 'DAYS' : mode === 'AMOUNT' ? 'AMOUNT' : 'HOURS',
        }));
    };

    const computeBackendValue = () => {
        const n = Number(form.value);
        if (!Number.isFinite(n) || n <= 0) return null;
        if (unitMode === 'DAYS' || unitMode === 'AMOUNT') return n;
        return form.unit === 'MINUTES' ? n / 60 : n;
    };

    const reset = () => { setEditing(null); setForm({ ...EMPTY_FORM(from) }); };

    const save = async (e) => {
        e.preventDefault();
        if (!form.employeeId) { toast.error('Select an employee'); return; }
        if (!form.value || Number(form.value) <= 0) { toast.error('Enter a value greater than zero'); return; }
        const hours = computeBackendValue();
        if (hours === null) { toast.error('Invalid value'); return; }
        const body = {
            employeeId: Number(form.employeeId),
            workDate: form.workDate,
            entryType: form.entryType,
            hours,
            remarks: form.remarks,
        };
        try {
            if (editing) await api.put(`/payroll/overtime/${editing.id}`, body);
            else await api.post('/payroll/overtime', body);
            toast.success(editing ? 'Entry updated' : 'Entry added (awaiting approval)');
            reset();
            load();
        } catch (err) { toast.error(err.message || 'Failed to save'); }
    };

    const startEdit = (r) => {
        setEditing(r);
        const mode = modeOf(r.entryType);
        setForm({
            employeeId: String(r.employeeId),
            workDate: r.workDate,
            entryType: r.entryType,
            value: String(Number(r.hours)),
            unit: mode === 'DAYS' ? 'DAYS' : mode === 'AMOUNT' ? 'AMOUNT' : 'HOURS',
            remarks: r.remarks || '',
        });
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const del = async (r) => {
        const msg = r.status === 'APPROVED'
            ? 'This entry is already approved. Delete it anyway? Payslips already generated keep their figures until the run is regenerated.'
            : 'Delete this entry?';
        if (!window.confirm(msg)) return;
        try { await api.delete(`/payroll/overtime/${r.id}`); load(); }
        catch (err) { toast.error(err.message || 'Failed'); }
    };

    const approveMany = async (list) => {
        if (!window.confirm(`Approve ${list.length} entr${list.length === 1 ? 'y' : 'ies'}? Approved entries are included in payroll runs.`)) return;
        try {
            for (const r of list) await api.patch(`/payroll/overtime/${r.id}/approve`);
            toast.success('Approved');
            load();
        } catch (err) { toast.error(err.message || 'Failed to approve'); load(); }
    };

    const formatStored = (entryType, hours) => {
        const mode = modeOf(entryType);
        if (mode === 'AMOUNT') return Number(hours).toLocaleString('en-PH', { style: 'currency', currency: 'PHP' });
        if (mode === 'DAYS') return `${hours} day${Number(hours) === 1 ? '' : 's'}`;
        return `${hours} hr${Number(hours) === 1 ? '' : 's'}`;
    };

    const filteredRows = rows.filter(r =>
        (!filterEmployee || String(r.employeeId) === filterEmployee) &&
        (!filterType || r.entryType === filterType));

    const groups = useMemo(() => {
        const map = new Map();
        filteredRows.forEach(r => {
            if (!map.has(r.employeeId)) map.set(r.employeeId, { id: r.employeeId, name: r.employeeName, rows: [] });
            map.get(r.employeeId).rows.push(r);
        });
        return Array.from(map.values()).sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    }, [filteredRows]);

    const toggle = (id) => setCollapsed(prev => {
        const next = new Set(prev);
        next.has(id) ? next.delete(id) : next.add(id);
        return next;
    });
    const pendingAll = filteredRows.filter(r => r.status === 'PENDING');

    return (
        <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm p-4 flex flex-wrap items-end gap-3">
                <div className="min-w-[150px]">
                    <label className="block text-xs font-medium text-gray-700 mb-1">Month</label>
                    <SearchableSelect typeable={false} searchPlaceholder="Search month..."
                        value={month} options={MONTHS} onChange={(v) => setMonth(v || month)} />
                </div>
                <div className="min-w-[110px]">
                    <label className="block text-xs font-medium text-gray-700 mb-1">Year</label>
                    <SearchableSelect typeable={false} searchPlaceholder="Search year..."
                        value={year} options={YEARS} onChange={(v) => setYear(v || year)} />
                </div>
                <div className="min-w-[170px]">
                    <label className="block text-xs font-medium text-gray-700 mb-1">Cutoff</label>
                    <SearchableSelect typeable={false} value={cutoff} options={CUTOFFS}
                        onChange={(v) => setCutoff(v || 'ALL')} />
                </div>
                <div className="flex-1 min-w-[200px]">
                    <label className="block text-xs font-medium text-gray-700 mb-1">Employee</label>
                    <SearchableSelect allLabel="All employees" typeable={false} searchPlaceholder="Search employee..."
                        value={filterEmployee}
                        options={employees.map(e => ({ value: String(e.employeeId), label: e.fullName }))}
                        onChange={setFilterEmployee} />
                </div>
                <div className="min-w-[180px]">
                    <label className="block text-xs font-medium text-gray-700 mb-1">Type</label>
                    <SearchableSelect allLabel="All types" typeable={false} value={filterType}
                        options={TYPES.map(([k, l]) => ({ value: k, label: l }))} onChange={setFilterType} />
                </div>
                <div className="text-xs text-gray-500 pb-2">{fmtShort(from)} to {fmtShort(to)}</div>
            </div>

            {canEdit && (
                <form onSubmit={save} className="bg-white rounded-xl shadow-sm p-5">
                    <div className="text-sm font-semibold text-gray-900 mb-4">
                        {editing ? `Edit entry for ${editing.employeeName}` : 'Add Entry'}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-end">
                        <Field label="Employee" required className="md:col-span-2">
                            <SearchableSelect typeable={false} disabled={!!editing}
                                placeholder="Select employee..." searchPlaceholder="Search employee..."
                                value={form.employeeId}
                                options={employees.map(e => ({ value: String(e.employeeId), label: e.fullName }))}
                                onChange={(v) => setForm(p => ({ ...p, employeeId: v }))} />
                        </Field>
                        <Field label="Date" required>
                            <input type="date" className={inputCls} value={form.workDate}
                                onChange={(e) => setForm(p => ({ ...p, workDate: e.target.value }))} />
                        </Field>
                        <Field label="Type" required>
                            <SearchableSelect typeable={false} searchPlaceholder="Search type..."
                                value={form.entryType}
                                options={TYPES.map(([k, l]) => ({ value: k, label: l }))}
                                onChange={(v) => v && onTypeChange(v)} />
                        </Field>
                        {unitMode !== 'DAYS' && unitMode !== 'AMOUNT' && (
                            <Field label="Unit" required>
                                <select className={inputCls} value={form.unit}
                                    onChange={(e) => setForm(p => ({ ...p, unit: e.target.value }))}>
                                    <option value="HOURS">Hours</option>
                                    <option value="MINUTES">Minutes</option>
                                </select>
                            </Field>
                        )}
                        <Field label={unitMode === 'AMOUNT' ? 'Amount (₱)' : unitMode === 'DAYS' ? 'Days' : (form.unit === 'MINUTES' ? 'Minutes' : 'Hours')} required>
                            <MoneyInput decimals={unitMode === 'AMOUNT' || unitMode === 'DAYS' || form.unit === 'HOURS' ? 2 : 0}
                                className={inputCls} value={form.value}
                                onChange={(e) => setForm(p => ({ ...p, value: e.target.value }))} />
                        </Field>
                    </div>
                    <div className="flex justify-end gap-2 mt-4">
                        {editing && (
                            <button type="button" onClick={reset}
                                className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">Cancel</button>
                        )}
                        <button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
                            {editing ? 'Update Entry' : 'Add Entry'}
                        </button>
                    </div>
                </form>
            )}

            <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-sm text-gray-600">
                    {filteredRows.length} entr{filteredRows.length === 1 ? 'y' : 'ies'} · {groups.length} employee{groups.length === 1 ? '' : 's'}
                    {pendingAll.length > 0 && <span className="ml-2 text-amber-700">{pendingAll.length} awaiting approval</span>}
                </div>
                <div className="flex gap-2">
                    {canApprove && pendingAll.length > 0 && (
                        <button onClick={() => approveMany(pendingAll)}
                            className="px-3 py-2 text-xs bg-green-600 text-white rounded-lg hover:bg-green-700">
                            Approve all pending
                        </button>
                    )}
                    <button onClick={() => setCollapsed(new Set())}
                        className="px-3 py-2 text-xs border border-gray-300 rounded-lg hover:bg-gray-100">Expand all</button>
                    <button onClick={() => setCollapsed(new Set(groups.map(g => g.id)))}
                        className="px-3 py-2 text-xs border border-gray-300 rounded-lg hover:bg-gray-100">Collapse all</button>
                </div>
            </div>

            {groups.length === 0 ? (
                <div className="bg-white rounded-xl shadow-sm px-4 py-10 text-center text-gray-500 text-sm">
                    No entries for this period
                </div>
            ) : groups.map(g => {
                const isOpen = !collapsed.has(g.id);
                const pending = g.rows.filter(r => r.status === 'PENDING');
                const initials = (g.name || '?').split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase();
                return (
                    <div key={g.id} className="bg-white rounded-xl shadow-sm overflow-hidden">
                        <div onClick={() => toggle(g.id)}
                            className={`flex items-center justify-between gap-3 px-4 py-3 cursor-pointer border-l-4 ${isOpen ? 'bg-blue-50/60 border-blue-600' : 'hover:bg-gray-50 border-transparent'}`}>
                            <div className="flex items-center gap-3">
                                {isOpen ? <ChevronDown size={16} className="text-gray-500" /> : <ChevronRight size={16} className="text-gray-500" />}
                                <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 text-xs font-semibold flex items-center justify-center">{initials}</div>
                                <div>
                                    <div className="font-semibold text-gray-900 text-sm">{g.name}</div>
                                    <div className="text-xs text-gray-500">
                                        {g.rows.length} entr{g.rows.length === 1 ? 'y' : 'ies'}
                                        {pending.length > 0 && ` · ${pending.length} pending`}
                                    </div>
                                </div>
                            </div>
                            {canApprove && pending.length > 0 && (
                                <button onClick={(e) => { e.stopPropagation(); approveMany(pending); }}
                                    className="px-3 py-1.5 text-xs border border-green-300 text-green-700 rounded-lg hover:bg-green-50">
                                    Approve {pending.length} pending
                                </button>
                            )}
                        </div>
                        {isOpen && (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-gray-50 border-y border-gray-200">
                                        <tr>
                                            {['Date', 'Type', 'Value', 'Remarks', 'Status'].map(h => (
                                                <th key={h} className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                                            ))}
                                            <th className="px-4 py-2 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {g.rows.map(r => (
                                            <tr key={r.id} className="hover:bg-gray-50">
                                                <td className="px-4 py-2.5 whitespace-nowrap">{fmtShort(r.workDate)}</td>
                                                <td className="px-4 py-2.5 whitespace-nowrap">{label(r.entryType)}</td>
                                                <td className="px-4 py-2.5 whitespace-nowrap font-medium">{formatStored(r.entryType, r.hours)}</td>
                                                <td className="px-4 py-2.5 text-gray-600 max-w-[220px] truncate" title={r.remarks}>{r.remarks || '—'}</td>
                                                <td className="px-4 py-2.5 whitespace-nowrap">
                                                    <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${STATUS_BADGE[r.status] || STATUS_BADGE.APPROVED}`}>
                                                        {r.status === 'PENDING' ? 'Pending' : 'Approved'}
                                                    </span>
                                                    {r.approvedBy && <div className="text-xs text-gray-500 mt-1">by {r.approvedBy}</div>}
                                                </td>
                                                <td className="px-4 py-2.5 text-right whitespace-nowrap">
                                                    <div className="flex justify-end gap-1">
                                                        {canApprove && r.status === 'PENDING' && (
                                                            <button onClick={() => approveMany([r])} title="Approve"
                                                                className="p-2 text-green-600 hover:bg-green-50 rounded-lg"><CheckCircle size={16} /></button>
                                                        )}
                                                        {canEdit && r.status === 'PENDING' && (
                                                            <button onClick={() => startEdit(r)} title="Edit"
                                                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"><Edit2 size={16} /></button>
                                                        )}
                                                        {canEdit && (
                                                            <button onClick={() => del(r)} title="Delete"
                                                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={16} /></button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                );
            })}

            <p className="text-xs text-gray-500">
                Only approved entries dated inside a payroll run's period are included when the run is created or regenerated.
                Overtime and holiday rates are edited under Pay Types.
            </p>
        </div>
    );
};

export default OvertimeEntries;