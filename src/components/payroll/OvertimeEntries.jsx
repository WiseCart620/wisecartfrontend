import React, { useState, useEffect } from 'react';
import { Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../services/api';
import { inputCls, Field, MoneyInput } from './Shared';


const today = new Date().toISOString().slice(0, 10);
const monthStart = today.slice(0, 8) + '01';

const OvertimeEntries = ({ canEdit }) => {
    const ENTRY_CODES = new Set(['REGULAR_OT', 'REST_DAY', 'SPECIAL_HOLIDAY', 'REGULAR_HOLIDAY',
        'REST_DAY_REGULAR_HOLIDAY', 'NIGHT_DIFF', 'UNDERTIME_HOUR', 'LATE_HOUR', 'ABSENCE_DAY']);
    const [types, setTypes] = useState([]);
    const TYPES = types;
    const [employees, setEmployees] = useState([]);
    const [rows, setRows] = useState([]);
    const [from, setFrom] = useState(monthStart);
    const [to, setTo] = useState(today);
    const [filterEmployee, setFilterEmployee] = useState('');
    const [filterType, setFilterType] = useState('');

    const [form, setForm] = useState({
        employeeId: '',
        workDate: today,
        entryType: 'REGULAR_OT',
        value: '',
        unit: 'HOURS',
        remarks: '',
    });

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

    useEffect(() => {
        if (!from || !to) return;
        load();
    }, [from, to]);

    const load = async () => {
        if (!from || !to) return;
        try {
            const r = await api.get(`/payroll/overtime?from=${from}&to=${to}`);
            if (r.success) setRows(r.data || []);
        } catch (e) { toast.error('Failed to load entries'); }
    };

    // Reset unit when the type changes
    const onTypeChange = (newType) => {
        const meta = TYPES.find(t => t[0] === newType);
        const mode = meta ? meta[2] : 'HOURS';
        setForm(p => ({
            ...p,
            entryType: newType,
            value: '',
            unit: mode === 'MINUTES' ? 'MINUTES' : mode === 'DAYS' ? 'DAYS' : 'HOURS',
        }));
    };

    const currentType = TYPES.find(t => t[0] === form.entryType);
    const unitMode = currentType ? currentType[2] : 'HOURS';

    // What to send to the backend — always in the backend's native unit
    const computeBackendValue = () => {
        const n = Number(form.value);
        if (!Number.isFinite(n) || n <= 0) return null;

        if (unitMode === 'DAYS') {
            // Days pass through as-is (backend multiplies by 8h internally)
            return n;
        }
        if (form.unit === 'MINUTES') {
            return n / 60; // convert minutes -> hours
        }
        return n; // already hours
    };

    const add = async (e) => {
        e.preventDefault();
        if (!form.employeeId) { toast.error('Select an employee'); return; }
        if (!form.value || Number(form.value) <= 0) { toast.error('Enter a value greater than zero'); return; }

        const hours = computeBackendValue();
        if (hours === null) { toast.error('Invalid value'); return; }

        try {
            await api.post('/payroll/overtime', {
                employeeId: Number(form.employeeId),
                workDate: form.workDate,
                entryType: form.entryType,
                hours,
                remarks: form.remarks,
            });
            toast.success('Saved');
            setForm(p => ({ ...p, value: '', remarks: '' }));
            load();
        } catch (err) { toast.error(err.message || 'Failed to save'); }
    };

    const del = async (id) => {
        if (!window.confirm('Delete this entry?')) return;
        try { await api.delete(`/payroll/overtime/${id}`); load(); }
        catch (err) { toast.error(err.message || 'Failed'); }
    };

    const label = (t) => (TYPES.find(x => x[0] === t) || [])[1] || t;

    const filteredRows = rows.filter(r =>
        (!filterEmployee || String(r.employeeId) === filterEmployee) &&
        (!filterType || r.entryType === filterType)
    );
    const formatStored = (entryType, hours) => {
        const meta = TYPES.find(t => t[0] === entryType);
        const mode = meta ? meta[2] : 'HOURS';
        if (mode === 'DAYS') {
            return `${hours} day${Number(hours) === 1 ? '' : 's'}`;
        }
        return `${hours} hr${Number(hours) === 1 ? '' : 's'}`;
    };

    return (
        <div className="space-y-6">
            {canEdit && (
                <form onSubmit={add} className="bg-white rounded-xl shadow-sm p-5 grid grid-cols-1 md:grid-cols-6 gap-4 items-end">
                    <Field label="Employee" required>
                        <select className={inputCls} value={form.employeeId}
                            onChange={(e) => setForm(p => ({ ...p, employeeId: e.target.value }))}>
                            <option value="">Select...</option>
                            {employees.map(e => <option key={e.employeeId} value={e.employeeId}>{e.fullName}</option>)}
                        </select>
                    </Field>

                    <Field label="Date" required>
                        <input type="date" className={inputCls} value={form.workDate}
                            onChange={(e) => setForm(p => ({ ...p, workDate: e.target.value }))} />
                    </Field>

                    <Field label="Type" required>
                        <select className={inputCls} value={form.entryType}
                            onChange={(e) => onTypeChange(e.target.value)}>
                            {TYPES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                        </select>
                    </Field>

                    {/* Unit dropdown — hidden when Days */}
                    {unitMode !== 'DAYS' && (
                        <Field label="Unit" required>
                            <select className={inputCls} value={form.unit}
                                onChange={(e) => setForm(p => ({ ...p, unit: e.target.value }))}>
                                {unitMode === 'MINUTES' ? (
                                    <>
                                        <option value="MINUTES">Minutes</option>
                                        <option value="HOURS">Hours</option>
                                    </>
                                ) : (
                                    <>
                                        <option value="HOURS">Hours</option>
                                        <option value="MINUTES">Minutes</option>
                                    </>
                                )}
                            </select>
                        </Field>
                    )}

                    <Field label={unitMode === 'DAYS' ? 'Days' : (form.unit === 'MINUTES' ? 'Minutes' : 'Hours')} required>
                        <MoneyInput decimals={unitMode === 'DAYS' || form.unit === 'HOURS' ? 2 : 0}
                            className={inputCls} value={form.value}
                            onChange={(e) => setForm(p => ({ ...p, value: e.target.value }))} />
                    </Field>

                    <button className="px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
                        Add Entry
                    </button>
                </form>
            )}

            <div className="flex flex-wrap gap-3 items-center text-sm">
                <span>Employee</span>
                <select className={inputCls + ' !w-auto'} value={filterEmployee}
                    onChange={e => setFilterEmployee(e.target.value)}>
                    <option value="">All employees</option>
                    {employees.map(e => (
                        <option key={e.employeeId} value={String(e.employeeId)}>{e.fullName}</option>
                    ))}
                </select>

                <span>Type</span>
                <select className={inputCls + ' !w-auto'} value={filterType}
                    onChange={e => setFilterType(e.target.value)}>
                    <option value="">All types</option>
                    {TYPES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                </select>

                <span>From</span>
                <input type="date" className={inputCls + ' !w-auto'} value={from}
                    onChange={e => setFrom(e.target.value || monthStart)} />
                <span>To</span>
                <input type="date" className={inputCls + ' !w-auto'} value={to}
                    onChange={e => setTo(e.target.value || today)} />

                {(filterEmployee || filterType) && (
                    <button type="button"
                        onClick={() => { setFilterEmployee(''); setFilterType(''); }}
                        className="px-3 py-2 text-xs text-gray-600 hover:bg-gray-100 rounded-lg">
                        Clear filters
                    </button>
                )}
            </div>

            <div className="bg-white rounded-xl shadow-sm overflow-x-auto">
                <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b">
                        <tr>
                            {['Date', 'Employee', 'Type', 'Value', ''].map(h => (
                                <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {filteredRows.length === 0 ? (
                            <tr><td colSpan="5" className="px-4 py-8 text-center text-gray-500">No entries</td></tr>
                        ) : filteredRows.map(r => (
                            <tr key={r.id}>
                                <td className="px-4 py-3">{r.workDate}</td>
                                <td className="px-4 py-3">{r.employeeName}</td>
                                <td className="px-4 py-3">{label(r.entryType)}</td>
                                <td className="px-4 py-3">{formatStored(r.entryType, r.hours)}</td>
                                <td className="px-4 py-3 text-right">
                                    {canEdit && (
                                        <button onClick={() => del(r.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg">
                                            <Trash2 size={16} />
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <p className="text-xs text-gray-500">
                Entries dated inside a payroll run's period are picked up automatically when the run is created or regenerated.
                Overtime and holiday rates are edited under Pay Types.
            </p>
        </div>
    );
};

export default OvertimeEntries;