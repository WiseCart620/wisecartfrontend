import React, { useState, useEffect } from 'react';
import { Edit2, Trash2, Copy } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../services/api';
import { inputCls, money, Field, MoneyInput } from './Shared';
import Pagination from '../common/Pagination';
import usePagination from './usePagination';

const AGENCIES = [
    { code: 'SSS', label: 'SSS' },
    { code: 'PHILHEALTH', label: 'PhilHealth' },
    { code: 'PAGIBIG', label: 'Pag-IBIG' },
];
const EMPTY = { salaryFrom: '', salaryTo: '', employeeRate: '', employerRate: '', employeeFixed: '', employerFixed: '', baseMin: '', baseMax: '' };
const pct = (v) => (v == null ? '' : String(Number((v * 100).toFixed(4))));
const num = (v) => (v === '' || v == null ? null : Number(v));
const rate = (v) => (v === '' || v == null ? null : Number((Number(v) / 100).toFixed(6)));

const StatutoryBracketsTab = ({ canCreate, canEdit, canDelete }) => {
    const [agency, setAgency] = useState('SSS');
    const [years, setYears] = useState([]);
    const [year, setYear] = useState(new Date().getFullYear());
    const [rows, setRows] = useState([]);
    const [form, setForm] = useState(EMPTY);
    const [editing, setEditing] = useState(null);
    const [copyTo, setCopyTo] = useState('');

    const loadYears = async () => {
        try {
            const res = await api.get(`/payroll/statutory-brackets/years?agency=${agency}`);
            const ys = res.success ? res.data || [] : [];
            setYears(ys);
            if (ys.length && !ys.includes(year)) setYear(ys[0]);
        } catch (e) { /* ignore */ }
    };
    const load = async () => {
        try {
            const res = await api.get(`/payroll/statutory-brackets?agency=${agency}&year=${year}`);
            setRows(res.success ? res.data || [] : []);
        } catch (e) { toast.error('Failed to load brackets'); }
    };

    useEffect(() => { loadYears(); }, [agency]);
    useEffect(() => { load(); setEditing(null); setForm(EMPTY); }, [agency, year]);

    const set = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));

    const submit = async (e) => {
        e.preventDefault();
        if (form.salaryFrom === '') { toast.error('Salary from is required'); return; }
        const payload = {
            agencyCode: agency, effectiveYear: Number(year),
            salaryFrom: num(form.salaryFrom), salaryTo: num(form.salaryTo),
            employeeRate: rate(form.employeeRate), employerRate: rate(form.employerRate),
            employeeFixed: num(form.employeeFixed), employerFixed: num(form.employerFixed),
            baseMin: num(form.baseMin), baseMax: num(form.baseMax),
        };
        try {
            if (editing) await api.put(`/payroll/statutory-brackets/${editing.statutoryBracketId}`, payload);
            else await api.post('/payroll/statutory-brackets', payload);
            toast.success('Saved');
            setForm(EMPTY); setEditing(null);
            load(); loadYears();
        } catch (err) { toast.error(err.message || 'Failed to save'); }
    };

    const startEdit = (b) => {
        setEditing(b);
        setForm({
            salaryFrom: b.salaryFrom ?? '', salaryTo: b.salaryTo ?? '',
            employeeRate: pct(b.employeeRate), employerRate: pct(b.employerRate),
            employeeFixed: b.employeeFixed ?? '', employerFixed: b.employerFixed ?? '',
            baseMin: b.baseMin ?? '', baseMax: b.baseMax ?? '',
        });
    };

    const remove = async (b) => {
        if (!window.confirm('Delete this bracket?')) return;
        try {
            await api.delete(`/payroll/statutory-brackets/${b.statutoryBracketId}`);
            toast.success('Deleted'); load(); loadYears();
        } catch (err) { toast.error(err.message || 'Failed to delete'); }
    };

    const copyYear = async () => {
        if (!copyTo) { toast.error('Enter the new year'); return; }
        try {
            await api.post(`/payroll/statutory-brackets/copy?agency=${agency}&fromYear=${year}&toYear=${copyTo}`);
            toast.success(`Copied to ${copyTo}`);
            setYear(Number(copyTo)); setCopyTo(''); loadYears();
        } catch (err) { toast.error(err.message || 'Failed to copy'); }
    };

    const share = (fixed, r) => (fixed != null ? money(fixed) : r != null ? `${pct(r)}%` : '—');

    const { pageItems, paginationProps, totalItems } = usePagination(rows, `${agency}|${year}`);

    return (
        <div>
            <div className="sticky top-[calc(var(--nav-h)+var(--head-h))] z-30 bg-white pb-4">
                <div className="bg-white border border-gray-200 shadow-sm rounded-xl p-4 flex flex-wrap gap-4 items-end">
                    <Field label="Agency">
                        <select className={inputCls} value={agency} onChange={(e) => setAgency(e.target.value)}>
                            {AGENCIES.map(a => <option key={a.code} value={a.code}>{a.label}</option>)}
                        </select>
                    </Field>
                    <Field label="Effective year">
                        <input type="number" className={inputCls} value={year} onChange={(e) => setYear(Number(e.target.value))} list="bracket-years" />
                        <datalist id="bracket-years">{years.map(y => <option key={y} value={y} />)}</datalist>
                    </Field>
                    {canCreate && (
                        <div className="flex items-end gap-2 ml-auto">
                            <Field label="Copy this year to">
                                <input type="number" className={inputCls} placeholder="e.g. 2027" value={copyTo} onChange={(e) => setCopyTo(e.target.value)} />
                            </Field>
                            <button onClick={copyYear} className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded text-sm hover:bg-gray-100">
                                <Copy size={15} /> Copy
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm overflow-hidden w-full tbl-card mb-4">
                <div className="overflow-auto w-full tbl-scroll">
                    <table className="w-full min-w-[800px] text-sm">
                        <thead className="bg-white">
                            <tr>
                                {['Salary From', 'Salary To', 'Employee', 'Employer', 'Base Min', 'Base Max', ''].map(h => (
                                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="[&>tr>td]:border-b [&>tr>td]:border-gray-200">
                            {rows.length === 0 ? (
                                <tr><td colSpan="7" className="px-4 py-8 text-center text-gray-500">No brackets for {year}. The latest earlier year is used until you add some.</td></tr>
                            ) : pageItems.map(b => (
                                <tr key={b.statutoryBracketId} className="hover:bg-white">
                                    <td className="px-4 py-3">{money(b.salaryFrom)}</td>
                                    <td className="px-4 py-3">{b.salaryTo != null ? money(b.salaryTo) : 'and over'}</td>
                                    <td className="px-4 py-3">{share(b.employeeFixed, b.employeeRate)}</td>
                                    <td className="px-4 py-3">{share(b.employerFixed, b.employerRate)}</td>
                                    <td className="px-4 py-3">{b.baseMin != null ? money(b.baseMin) : '—'}</td>
                                    <td className="px-4 py-3">{b.baseMax != null ? money(b.baseMax) : '—'}</td>
                                    <td className="px-4 py-3 text-right">
                                        <div className="flex justify-end gap-1">
                                            {canEdit && <button onClick={() => startEdit(b)} className="p-2 text-orange-600 hover:bg-orange-50 rounded"><Edit2 size={16} /></button>}
                                            {canDelete && <button onClick={() => remove(b)} className="p-2 text-red-600 hover:bg-red-50 rounded"><Trash2 size={16} /></button>}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {totalItems > 0 && <Pagination {...paginationProps} />}
            </div>

            {(canCreate || canEdit) && (
                <form onSubmit={submit} className="bg-white rounded-xl shadow-sm p-5 grid grid-cols-2 md:grid-cols-4 gap-4 items-end">
                    <div className="col-span-full text-sm font-semibold text-gray-900">
                        {editing ? 'Edit bracket' : `New ${agency} bracket for ${year}`}
                    </div>
                    <Field label="Salary From" required><MoneyInput className={inputCls} value={form.salaryFrom} onChange={set('salaryFrom')} /></Field>
                    <Field label="Salary To (blank = and over)"><MoneyInput className={inputCls} value={form.salaryTo} onChange={set('salaryTo')} /></Field>
                    <Field label="Employee %"><MoneyInput decimals={4} className={inputCls} value={form.employeeRate} onChange={set('employeeRate')} /></Field>
                    <Field label="Employer %"><MoneyInput decimals={4} className={inputCls} value={form.employerRate} onChange={set('employerRate')} /></Field>
                    <Field label="Employee fixed ₱"><MoneyInput className={inputCls} value={form.employeeFixed} onChange={set('employeeFixed')} /></Field>
                    <Field label="Employer fixed ₱"><MoneyInput className={inputCls} value={form.employerFixed} onChange={set('employerFixed')} /></Field>
                    <Field label="Base Min (floor)"><MoneyInput className={inputCls} value={form.baseMin} onChange={set('baseMin')} /></Field>
                    <Field label="Base Max (ceiling)"><MoneyInput className={inputCls} value={form.baseMax} onChange={set('baseMax')} /></Field>
                    <div className="col-span-full flex justify-end gap-2">
                        {editing && <button type="button" onClick={() => { setEditing(null); setForm(EMPTY); }} className="px-4 py-2 border border-gray-300 rounded text-sm">Cancel edit</button>}
                        <button type="submit" className="px-4 py-2 bg-orange-600 text-white rounded text-sm hover:bg-orange-700">{editing ? 'Update' : 'Add'}</button>
                    </div>
                </form>
            )}
            <p className="text-xs text-gray-500 mt-3">
                A fixed amount overrides the percentage. With a percentage, the salary is first limited to Base Min / Base Max (PhilHealth 10,000 to 100,000, Pag-IBIG cap 10,000). The bracket used is the one with the highest "Salary From" that is not above the monthly salary.
            </p>
        </div>
    );
};

export default StatutoryBracketsTab;