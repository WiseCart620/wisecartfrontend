import React, { useState, useEffect } from 'react';
import { X, Pencil } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../services/api';
import { useAuth, can } from '../../context/AuthContext';
import { inputCls, Field } from './Shared';

const FIELDS = [
    ['regularOt', 'Regular overtime'],
    ['restDay', 'Rest day overtime'],
    ['specialHoliday', 'Special holiday'],
    ['regularHolidayFirst', 'Regular holiday (first hours)'],
    ['regularHolidayExcess', 'Regular holiday (excess)'],
    ['restDayHolidayFirst', 'Rest day + regular holiday (first hours)'],
    ['restDayHolidayExcess', 'Rest day + regular holiday (excess)'],
    ['nightDiff', 'Night differential (extra)'],
];

const FALLBACK = {
    regularOt: 1.3, restDay: 1.3, specialHoliday: 1.3,
    regularHolidayFirst: 2, regularHolidayExcess: 2.6,
    restDayHolidayFirst: 2.6, restDayHolidayExcess: 3.2,
    nightDiff: 0.1, holidayThresholdHours: 8,
};

const toForm = (o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, String(v)]));
const pct = (v) => `${Math.round(Number(v) * 10000) / 100}%`;

const OvertimeRatesCard = () => {
    const { user } = useAuth();
    const canFormula = can(user, 'payroll', 'formula');
    const [current, setCurrent] = useState(FALLBACK);
    const [defaults, setDefaults] = useState(FALLBACK);
    const [show, setShow] = useState(false);
    const [form, setForm] = useState(toForm(FALLBACK));
    const [saving, setSaving] = useState(false);

    const load = async () => {
        try {
            const r = await api.get('/payroll/settings/overtime-rates');
            if (r.success && r.data && r.data.current && r.data.defaults) {
                setCurrent(r.data.current);
                setDefaults(r.data.defaults);
            }
        } catch { /* ignore */ }
    };
    useEffect(() => { load(); }, []);

    const set = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));

    const save = async () => {
        setSaving(true);
        try {
            const payload = Object.fromEntries(Object.entries(form).map(([k, v]) => [k, Number(v)]));
            await api.put('/payroll/settings/overtime-rates', payload);
            toast.success('Overtime rates updated. Regenerate draft runs to apply them.');
            setShow(false);
            load();
        } catch (err) {
            toast.error(err.message || 'Failed to save rates');
        } finally {
            setSaving(false);
        }
    };

    return (
        <>
            <div className="flex items-center justify-between gap-4 px-5 py-3 border-t border-gray-100">
                <span className="text-sm text-gray-800">Overtime &amp; holiday rates</span>
                {canFormula && (
                    <button onClick={() => { setForm(toForm(current)); setShow(true); }}
                        className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">
                        <Pencil size={16} /> Edit Rates
                    </button>
                )}
            </div>

            {show && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl max-w-xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
                            <h2 className="font-bold text-gray-900">Edit Overtime &amp; Holiday Rates</h2>
                            <button onClick={() => setShow(false)}><X size={20} /></button>
                        </div>
                        <div className="p-6 space-y-5">
                            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="font-semibold text-gray-900">Default rates</span>
                                    <button type="button" onClick={() => setForm(toForm(defaults))}
                                        className="text-xs font-medium text-blue-600 hover:text-blue-800">Reset to default</button>
                                </div>
                                {FIELDS.map(([k, l]) => (
                                    <div key={k}>{l} = <span className="font-mono">{defaults[k]}</span> ({pct(defaults[k])})</div>
                                ))}
                                <div>Holiday threshold = <span className="font-mono">{defaults.holidayThresholdHours}</span> hours</div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                {FIELDS.map(([k, l]) => (
                                    <Field key={k} label={l} required>
                                        <input type="number" min="0" max="10" step="0.01" className={inputCls}
                                            value={form[k]} onChange={set(k)} />
                                    </Field>
                                ))}
                                <Field label="Holiday threshold (hours)" required>
                                    <input type="number" min="1" max="24" step="0.25" className={inputCls}
                                        value={form.holidayThresholdHours} onChange={set('holidayThresholdHours')} />
                                </Field>
                            </div>

                            <div className="text-xs text-gray-500">
                                Enter multipliers as decimals: 1.30 = 130%, 2.00 = 200%. Night differential is the
                                extra amount per night hour (0.10 = +10%).
                            </div>

                            <div className="flex justify-end gap-2 pt-4 border-t">
                                <button onClick={() => setShow(false)} className="px-4 py-2 border rounded-lg text-sm">Cancel</button>
                                <button onClick={save} disabled={saving}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">
                                    {saving ? 'Saving...' : 'Save Rates'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default OvertimeRatesCard;