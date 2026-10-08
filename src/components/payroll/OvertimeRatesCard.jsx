import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../services/api';
import { useAuth, can } from '../../context/AuthContext';
import { inputCls, Field, MoneyInput } from './Shared';

const OT_FIELDS = [
    ['regularOt', 'Overtime - Regular'],
    ['restDay', 'Overtime - Rest Day'],
    ['specialHoliday', 'Overtime - Special Holiday'],
    ['regularHolidayFirst', 'Regular Holiday (first hours)'],
    ['regularHolidayExcess', 'Regular Holiday (excess hours)'],
    ['restDayHolidayFirst', 'Rest Day + Regular Holiday (first hours)'],
    ['restDayHolidayExcess', 'Rest Day + Regular Holiday (excess hours)'],
    ['nightDiff', 'Night Differential (extra per hour)'],
];
const DED_FIELDS = [
    ['lateMultiplier', 'Late (× hourly rate)'],
    ['undertimeMultiplier', 'Undertime (× hourly rate)'],
    ['absenceMultiplier', 'Absence (× daily rate)'],
];

const toForm = (o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, String(v)]));
const pct = (v) => `${Math.round(Number(v) * 10000) / 100}%`;

const SAMPLE = { basic: 15000, allowance: 3000, split: 0.5, days: 11, hours: 8 };
const VARIABLES = [
    ['basic', 'Monthly basic salary'],
    ['allowance', 'Monthly allowance total'],
    ['split', '12 ÷ pays per year (0.5 on twice a month)'],
    ['days', 'Days of work entered on the run'],
    ['hours', 'Hours per day (set above)'],
    ['daily', 'Result of the daily formula (hourly formula only)'],
];
const FORMULA_GROUPS = [
    { title: 'Overtime & night differential', dailyKey: 'OT_DAILY', hourlyKey: 'OT_HOURLY' },
    { title: 'Late, undertime & absence', dailyKey: 'DED_DAILY', hourlyKey: 'DED_HOURLY' },
];
const peso = (n) => `₱${n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// evaluates a formula with example values, only after checking it contains nothing but safe tokens
const evalFormula = (expr, vars) => {
    if (!expr || !expr.trim()) return { error: 'Formula is required' };
    if (!/^[a-zA-Z0-9_+\-*/().\s]+$/.test(expr) || expr.includes('**')) {
        return { error: 'Use only variables, numbers, + - * / and parentheses' };
    }
    let bad = null;
    const replaced = expr.replace(/[a-zA-Z_]\w*/g, (name) => {
        const v = vars[name.toLowerCase()];
        if (v === undefined) { bad = name; return '0'; }
        return `(${v})`;
    });
    if (bad) return { error: `Unknown variable "${bad}"` };
    try {
        const val = Function(`"use strict"; return (${replaced});`)();
        if (!Number.isFinite(val)) return { error: 'Formula does not give a valid number' };
        if (val <= 0) return { error: 'Result must be greater than zero' };
        return { value: val };
    } catch { return { error: 'Formula is not valid' }; }
};
const groupResult = (g, formulas, hoursPerDay) => {
    const vars = { ...SAMPLE, hours: Number(hoursPerDay) || SAMPLE.hours };
    const d = evalFormula(formulas[g.dailyKey], vars);
    const h = evalFormula(formulas[g.hourlyKey], { ...vars, daily: d.value ?? 1 });
    return { d, h };
};

const FormulaGroup = ({ group, formulas, setFormulas, disabled, hoursPerDay }) => {
    const { d, h } = groupResult(group, formulas, hoursPerDay);
    const field = (key, res, label) => (
        <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">{label}</label>
            <input
                className={`${inputCls} font-mono text-sm ${res.error ? 'border-red-400' : ''}`}
                disabled={disabled}
                value={formulas[key] ?? ''}
                onChange={(e) => setFormulas(p => ({ ...p, [key]: e.target.value }))}
            />
            {res.error && <p className="text-xs text-red-600 mt-1">{res.error}</p>}
        </div>
    );
    return (
        <div className="border border-gray-200 rounded-xl overflow-hidden">
            <div className="px-4 py-3 bg-white border-b border-gray-200 text-sm font-semibold text-gray-900">
                {group.title}
            </div>
            <div className="p-4 space-y-4">
                {field(group.dailyKey, d, 'Daily rate')}
                {field(group.hourlyKey, h, 'Hourly rate')}
                <div className="flex items-center justify-between rounded bg-orange-50 border border-orange-100 px-3 py-2 text-xs">
                    <span className="text-orange-800 font-medium">Example result</span>
                    <span className="text-orange-900">
                        {d.error || h.error ? '—' : `${peso(d.value)} per day · ${peso(h.value)} per hour`}
                    </span>
                </div>
            </div>
        </div>
    );
};

// finds { current, defaults } wherever it sits in the response
const dig = (o, depth = 0) => {
    if (!o || typeof o !== 'object' || depth > 4) return null;
    if (o.current && o.current.regularOt !== undefined) return o;
    if (o.regularOt !== undefined) return { current: o };
    for (const v of Object.values(o)) {
        const f = dig(v, depth + 1);
        if (f) return f;
    }
    return null;
};

const OvertimeRatesCard = () => {
    const { user } = useAuth();
    const canFormula = can(user, 'payroll', 'formula');
    const [open, setOpen] = useState(false);
    const [form, setForm] = useState(null);
    const [defaults, setDefaults] = useState(null);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [formulas, setFormulas] = useState(null);
    const [formulaDefaults, setFormulaDefaults] = useState(null);
    const [savingF, setSavingF] = useState(false);
    const formulaInvalid = !!formulas && FORMULA_GROUPS.some(g => {
        const r = groupResult(g, formulas, form?.hoursPerDay);
        return r.d.error || r.h.error;
    });

    const load = async () => {
        try {
            const r = await api.get('/payroll/settings/overtime-rates');
            console.log('OvertimeRatesCard v3 response:', r);
            const found = dig(typeof r === 'string' ? JSON.parse(r) : r);
            if (found) {
                setForm(toForm(found.current));
                setDefaults(found.defaults || null);
                setError('');
            } else {
                setError('v3: unexpected response shape, see console');
            }
        } catch (e) { setError(e.message || 'Could not load rates'); }
    };
    const loadFormulas = async () => {
        try {
            const r = await api.get('/payroll/settings/formulas');
            if (r.success && r.data?.current) {
                setFormulas(r.data.current);
                setFormulaDefaults(r.data.defaults || null);
            }
        } catch (e) { /* formulas section stays hidden */ }
    };
    useEffect(() => { load(); loadFormulas(); }, []);

    const saveFormulas = async () => {
        setSavingF(true);
        try {
            const r = await api.put('/payroll/settings/formulas', formulas);
            if (r.success) setFormulas(r.data?.current || formulas);
            return !!r.success;
        } catch (err) {
            toast.error(err.message || 'Failed to save formulas');
            return false;
        } finally { setSavingF(false); }
    };

    const saveAll = async () => {
        if (formulas && !(await saveFormulas())) return; // stop if a formula is rejected
        await save();
    };

    const set = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));

    const save = async () => {
        setSaving(true);
        try {
            await api.put('/payroll/settings/overtime-rates',
                Object.fromEntries(Object.entries(form).map(([k, v]) => [k, Number(v)])));
            toast.success('Changes saved. Regenerate draft runs to apply them.');
            load();
        } catch (err) { toast.error(err.message || 'Failed to save rates'); }
        finally { setSaving(false); }
    };

    const numField = ([k, l]) => (
        <Field key={k} label={l}>
            <MoneyInput className={inputCls}
                value={form[k] ?? ''} onChange={set(k)} disabled={!canFormula} />
            {form[k] !== '' && <span className="text-xs text-gray-500">{pct(form[k])}</span>}
        </Field>
    );

    return (
        <div className="bg-white rounded-xl shadow-sm mb-6">
            <button type="button" onClick={() => setOpen(o => !o)}
                className="w-full flex items-center justify-between px-5 py-3 text-sm font-semibold text-gray-900">
                <span>
                    Payroll Rates
                    <span className="ml-2 text-xs font-normal text-gray-500">Overtime, holiday, late, undertime, absence</span>
                </span>
                {open ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </button>

            {open && (
                <div className="border-t border-gray-100 p-5 space-y-6">
                    {error && <div className="text-sm text-red-600">{error}</div>}
                    {!form ? (!error && <div className="text-sm text-gray-500">Loading...</div>) : (
                        <>
                            <div>
                                <div className="text-sm font-semibold text-gray-900 mb-3">Overtime &amp; holiday</div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    {OT_FIELDS.map(numField)}
                                    <Field label="Holiday threshold (hours)">
                                        <MoneyInput className={inputCls}
                                            value={form.holidayThresholdHours ?? ''} onChange={set('holidayThresholdHours')}
                                            disabled={!canFormula} />
                                    </Field>
                                </div>
                                <p className="text-xs text-gray-500 mt-2">
                                    1.30 = 130%, 2.00 = 200%. Night differential is the extra amount per night hour (0.10 = +10%).
                                </p>
                            </div>

                            <div>
                                <div className="text-sm font-semibold text-gray-900 mb-1">Late, Undertime &amp; Absence</div>
                                <p className="text-xs text-gray-600 mb-3">
                                    The daily and hourly rates come from the formulas below. Keep the multiplier at 1.00 to deduct exactly the rate.
                                </p>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    {DED_FIELDS.map(numField)}
                                    <Field label="Hours per day">
                                        <MoneyInput className={inputCls}
                                            value={form.hoursPerDay ?? ''} onChange={set('hoursPerDay')} disabled={!canFormula} />
                                    </Field>
                                </div>
                            </div>
                            {formulas && (
                                <div className="border-t border-gray-100 pt-6">
                                    <div className="mb-4">
                                        <div className="text-sm font-semibold text-gray-900">Rate formulas</div>
                                        <p className="text-xs text-gray-500 mt-0.5">
                                            Define how the daily and hourly rates are computed. Each card shows an example result as you type.
                                        </p>
                                    </div>

                                    <div className="rounded-xl bg-white border border-gray-200 p-4 mb-4">
                                        <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-2">
                                            Available variables
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-2">
                                            {VARIABLES.map(([name, desc]) => (
                                                <div key={name} className="flex items-start gap-2">
                                                    <code className="px-1.5 py-0.5 rounded bg-white border border-gray-200 text-xs font-mono text-orange-700">{name}</code>
                                                    <span className="text-xs text-gray-600">{desc}</span>
                                                </div>
                                            ))}
                                        </div>
                                        <p className="text-xs text-gray-500 mt-3">
                                            Operators: + - * / and parentheses. Example values: basic 15,000 · allowance 3,000 · split 0.5 · days 11.
                                        </p>
                                    </div>

                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                        {FORMULA_GROUPS.map(g => (
                                            <FormulaGroup key={g.title} group={g} formulas={formulas}
                                                setFormulas={setFormulas} disabled={!canFormula}
                                                hoursPerDay={form?.hoursPerDay} />
                                        ))}
                                    </div>
                                </div>
                            )}

                            {canFormula ? (
                                <div className="flex justify-end gap-2 pt-3 border-t">
                                    {defaults && (
                                        <button type="button"
                                            onClick={() => { setForm(toForm(defaults)); if (formulaDefaults) setFormulas({ ...formulaDefaults }); }}
                                            className="px-4 py-2 border border-gray-300 rounded text-sm">Reset to default</button>
                                    )}
                                    <button onClick={saveAll} disabled={saving || savingF || formulaInvalid}
                                        title={formulaInvalid ? 'Fix the formula errors first' : ''}
                                        className="px-4 py-2 bg-orange-600 text-white rounded text-sm hover:bg-orange-700 disabled:opacity-50">
                                        {saving || savingF ? 'Saving...' : 'Save Changes'}
                                    </button>
                                </div>
                            ) : (
                                <p className="text-xs text-gray-500 pt-3 border-t">You have view-only access to payroll rates.</p>
                            )}
                        </>
                    )}
                </div>
            )}
        </div>
    );
};

export default OvertimeRatesCard;