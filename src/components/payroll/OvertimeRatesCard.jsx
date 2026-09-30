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
    useEffect(() => { load(); }, []);

    const set = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));

    const save = async () => {
        setSaving(true);
        try {
            await api.put('/payroll/settings/overtime-rates',
                Object.fromEntries(Object.entries(form).map(([k, v]) => [k, Number(v)])));
            toast.success('Rates saved. Regenerate draft runs to apply them.');
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
                                    Daily rate = monthly salary ÷ days of work (entered on each payroll run).
                                    Hourly rate = daily rate ÷ hours per day. Keep the multiplier at 1.00 to deduct exactly the rate.
                                </p>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    {DED_FIELDS.map(numField)}
                                    <Field label="Hours per day">
                                        <MoneyInput className={inputCls}
                                            value={form.hoursPerDay ?? ''} onChange={set('hoursPerDay')} disabled={!canFormula} />
                                    </Field>
                                </div>
                            </div>

                            {canFormula ? (
                                <div className="flex justify-end gap-2 pt-3 border-t">
                                    {defaults && (
                                        <button type="button" onClick={() => setForm(toForm(defaults))}
                                            className="px-4 py-2 border border-gray-300 rounded-lg text-sm">Reset to default</button>
                                    )}
                                    <button onClick={save} disabled={saving}
                                        className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">
                                        {saving ? 'Saving...' : 'Save Rates'}
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