import React, { useState, useEffect } from 'react';
import { Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../services/api';
import { inputCls, Field } from './Shared';

const TYPES = [
    ['REGULAR_OT', 'Overtime - Regular (rate + 30%)'],
    ['REST_DAY', 'Overtime - Rest Day (130%)'],
    ['SPECIAL_HOLIDAY', 'Overtime - Special Holiday (130%)'],
    ['REGULAR_HOLIDAY', 'Regular Holiday (200% / excess 260%)'],
    ['REST_DAY_REGULAR_HOLIDAY', 'Rest Day + Regular Holiday (260% / excess 320%)'],
    ['NIGHT_DIFF', 'Night Differential (+10%)'],
    ['UNDERTIME_HOUR', 'Undertime - Hours'],
    ['UNDERTIME_DAY', 'Undertime - Days'],
    ['LATE_HOUR', 'Lates - Hours'],
    ['ABSENCE_DAY', 'Absences - Days'],
];
const today = new Date().toISOString().slice(0, 10);
const monthStart = today.slice(0, 8) + '01';

const OvertimeEntries = ({ canEdit }) => {
    const [employees, setEmployees] = useState([]);
    const [rows, setRows] = useState([]);
    const [from, setFrom] = useState(monthStart);
    const [to, setTo] = useState(today);
    const [form, setForm] = useState({ employeeId: '', workDate: today, entryType: 'REGULAR_OT', hours: '', remarks: '' });

    useEffect(() => {
        api.get('/employees').then(r => r.success && setEmployees((r.data || []).filter(e => e.status === 'ACTIVE'))).catch(() => { });
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

    const add = async (e) => {
        e.preventDefault();
        if (!form.employeeId || !form.hours) { toast.error('Employee and hours are required'); return; }
        try {
            await api.post('/payroll/overtime', { ...form, employeeId: Number(form.employeeId), hours: Number(form.hours) });
            toast.success('Saved');
            setForm(p => ({ ...p, hours: '', remarks: '' }));
            load();
        } catch (err) { toast.error(err.message || 'Failed to save'); }
    };

    const del = async (id) => {
        if (!window.confirm('Delete this entry?')) return;
        try { await api.delete(`/payroll/overtime/${id}`); load(); } catch (err) { toast.error(err.message || 'Failed'); }
    };

    const set = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));
    const label = (t) => (TYPES.find(x => x[0] === t) || [])[1] || t;

    return (
        <div className="space-y-6">
            {canEdit && (
                <form onSubmit={add} className="bg-white rounded-xl shadow-sm p-5 grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
                    <Field label="Employee" required>
                        <select className={inputCls} value={form.employeeId} onChange={set('employeeId')}>
                            <option value="">Select...</option>
                            {employees.map(e => <option key={e.employeeId} value={e.employeeId}>{e.fullName}</option>)}
                        </select>
                    </Field>
                    <Field label="Date" required><input type="date" className={inputCls} value={form.workDate} onChange={set('workDate')} /></Field>
                    <Field label="Type" required>
                        <select className={inputCls} value={form.entryType} onChange={set('entryType')}>
                            {TYPES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                        </select>
                    </Field>
                    <Field label={(form.entryType === 'UNDERTIME_DAY' || form.entryType === 'ABSENCE_DAY') ? 'Days' : 'Hours'} required>
                        <input type="number" min="0" step="0.25" className={inputCls} value={form.hours} onChange={set('hours')} />
                    </Field>
                    <button className="px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">Add Entry</button>
                </form>
            )}

            <div className="flex gap-3 items-center text-sm">
                <span>From</span>
                <input type="date" className={inputCls + ' !w-auto'} value={from}
                    onChange={e => setFrom(e.target.value || monthStart)} />
                <span>To</span>
                <input type="date" className={inputCls + ' !w-auto'} value={to}
                    onChange={e => setTo(e.target.value || today)} />
            </div>

            <div className="bg-white rounded-xl shadow-sm overflow-x-auto">
                <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b">
                        <tr>{['Date', 'Employee', 'Type', 'Hrs/Days', ''].map(h => <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>)}</tr>
                    </thead>
                    <tbody className="divide-y">
                        {rows.length === 0 ? <tr><td colSpan="5" className="px-4 py-8 text-center text-gray-500">No entries</td></tr> :
                            rows.map(r => (
                                <tr key={r.id}>
                                    <td className="px-4 py-3">{r.workDate}</td>
                                    <td className="px-4 py-3">{r.employeeName}</td>
                                    <td className="px-4 py-3">{label(r.entryType)}</td>
                                    <td className="px-4 py-3">{r.hours}</td>
                                    <td className="px-4 py-3 text-right">
                                        {canEdit && <button onClick={() => del(r.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={16} /></button>}
                                    </td>
                                </tr>
                            ))}
                    </tbody>
                </table>
            </div>
            <p className="text-xs text-gray-500">Entries dated inside a payroll run's period are picked up automatically when the run is created or regenerated.</p>
        </div>
    );
};

export default OvertimeEntries;