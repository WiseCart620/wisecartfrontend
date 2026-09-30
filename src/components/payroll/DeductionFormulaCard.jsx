import React, { useState, useEffect } from 'react';
import { X, Pencil } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../services/api';
import { useAuth, can } from '../../context/AuthContext';
import { inputCls, Field, MoneyInput } from './Shared';

const FALLBACK = {
    workDays: 21.75,
    hoursPerDay: 8,
    dailyFormula: 'monthly / workDays',
    hourlyFormula: 'daily / hoursPerDay',
};

const toForm = (f) => ({ ...f, workDays: String(f.workDays), hoursPerDay: String(f.hoursPerDay) });

const DeductionFormulaCard = () => {
    const { user } = useAuth();
    const canFormula = can(user, 'payroll', 'formula');

    const [current, setCurrent] = useState(FALLBACK);
    const [defaults, setDefaults] = useState(FALLBACK);
    const [show, setShow] = useState(false);
    const [form, setForm] = useState(toForm(FALLBACK));
    const [saving, setSaving] = useState(false);

    const load = async () => {
        try {
            const r = await api.get('/payroll/settings/deduction-formula');
            if (r.success && r.data && r.data.current && r.data.defaults) {
                setCurrent(r.data.current);
                setDefaults(r.data.defaults);
            }
        } catch { /* ignore */ }
    };
    useEffect(() => { load(); }, []);

    const set = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));
    const openEdit = () => { setForm(toForm(current)); setShow(true); };
    const resetToDefault = () => setForm(toForm(defaults));

    const save = async () => {
        setSaving(true);
        try {
            await api.put('/payroll/settings/deduction-formula', {
                workDays: Number(form.workDays),
                hoursPerDay: Number(form.hoursPerDay),
                dailyFormula: form.dailyFormula,
                hourlyFormula: form.hourlyFormula,
            });
            toast.success('Formula updated. Regenerate draft runs to apply it.');
            setShow(false);
            load();
        } catch (err) {
            toast.error(err.message || 'Failed to save formula');
        } finally {
            setSaving(false);
        }
    };

    return (
        <>
            <div className="flex items-center justify-between gap-4 px-5 py-3">
                <span className="text-sm text-gray-800">
                    Rate formula (overtime, night differential, lates, undertime, absences)
                </span>
                {canFormula && (
                    <button onClick={openEdit}
                        className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50">
                        <Pencil size={16} /> Edit Formula
                    </button>
                )}
            </div>

            {show && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl max-w-xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
                            <h2 className="font-bold text-gray-900">Edit Rate Formula</h2>
                            <button onClick={() => setShow(false)}><X size={20} /></button>
                        </div>

                        <div className="p-6 space-y-5">
                            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="font-semibold text-gray-900">Default formula</span>
                                    <button type="button" onClick={resetToDefault}
                                        className="text-xs font-medium text-blue-600 hover:text-blue-800">
                                        Reset to default
                                    </button>
                                </div>
                                <div>Daily rate = <span className="font-mono">{defaults.dailyFormula}</span></div>
                                <div>Hourly rate = <span className="font-mono">{defaults.hourlyFormula}</span></div>
                                <div className="text-xs text-gray-500 mt-1">
                                    Work days per month = {defaults.workDays} &middot; Hours per day = {defaults.hoursPerDay}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <Field label="Work days per month" required>
                                    <MoneyInput className={inputCls}
                                        value={form.workDays} onChange={set('workDays')} />
                                </Field>
                                <Field label="Hours per day" required>
                                    <MoneyInput className={inputCls}
                                        value={form.hoursPerDay} onChange={set('hoursPerDay')} />
                                </Field>
                            </div>

                            <Field label="Daily rate formula" required>
                                <input className={inputCls + ' font-mono'} value={form.dailyFormula}
                                    onChange={set('dailyFormula')} placeholder="monthly / workDays" />
                            </Field>

                            <Field label="Hourly rate formula" required>
                                <input className={inputCls + ' font-mono'} value={form.hourlyFormula}
                                    onChange={set('hourlyFormula')} placeholder="daily / hoursPerDay" />
                            </Field>

                            <div className="text-xs text-gray-500 leading-relaxed">
                                Variables: <span className="font-mono">monthly</span>, <span className="font-mono">workDays</span>,{' '}
                                <span className="font-mono">hoursPerDay</span>, and <span className="font-mono">daily</span> (hourly
                                formula only). Operators: <span className="font-mono">+ - * / ( )</span>.
                                Example: <span className="font-mono">monthly * 12 / 261</span>.
                                <br />
                                Lates and undertime by the minute use hourly rate &divide; 60. Absences
                                by the day use the daily rate.
                            </div>

                            <div className="flex justify-end gap-2 pt-4 border-t">
                                <button onClick={() => setShow(false)} className="px-4 py-2 border rounded-lg text-sm">Cancel</button>
                                <button onClick={save} disabled={saving}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">
                                    {saving ? 'Saving...' : 'Save Formula'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default DeductionFormulaCard;