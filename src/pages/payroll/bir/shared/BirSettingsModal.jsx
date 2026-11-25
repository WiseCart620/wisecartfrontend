import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { api } from '../../../../services/api';
import { inputCls, Modal, money } from '../../../../components/payroll/Shared';
import { fullName, n } from './birReportFormat';
import { th, thL } from './birReportStyles';

// "BIR settings" dialog shared by 1601-C, 1604-C and Salary Monitoring (QB).
// Tabs: MWE threshold + per-employee override, and non-employee contributions.
const sv = (v) => (v === null || v === undefined ? '' : String(v));
const pct = (r) => String(Number((n(r) * 100).toFixed(4)));
const toTaxRow = (t) => ({ lower: sv(t.lower), rate: pct(t.rate), fixed: sv(t.fixed) });
const TABS = [['mwe', 'MWE or NOT'], ['non', 'Non-employees']];

const BirSettingsModal = ({ canEdit, onClose, onSaved }) => {
  const [data, setData] = useState(null);
  const [tab, setTab] = useState('mwe');
  const [threshold, setThreshold] = useState('');
  const [ov, setOv] = useState({});
  const [tax, setTax] = useState([]); // kept so saving does not wipe the stored tax table
  const [people, setPeople] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get('/payroll/bir/mwe').then((r) => {
      if (!r.success) return;
      const d = r.data;
      setData(d);
      setThreshold(sv(d.threshold));
      setOv(Object.fromEntries((d.employees || []).map((e) => [e.employeeId, e.override || ''])));
      setTax((d.taxTable || []).map(toTaxRow));
      setPeople((d.nonEmployees || []).map((p) => ({ name: p.name || '', sss: sv(p.sss), phic: sv(p.phic), hdmf: sv(p.hdmf), hmo: sv(p.hmo) })));
    }).catch(() => toast.error('Failed to load settings'));
  }, []);

  const setPerson = (i, k, v) => setPeople((p) => p.map((x, j) => (j === i ? { ...x, [k]: v } : x)));
  const cellCls = `${inputCls} !w-full`;

  const save = async () => {
    if (threshold === '') { toast.error('Enter the MWE threshold first'); return; }
    setSaving(true);
    try {
      await api.put('/payroll/bir/mwe', {
        threshold: Number(threshold),
        overrides: Object.fromEntries(Object.entries(ov).map(([k, v]) => [String(k), v])),
        taxTable: tax.filter((t) => t.lower !== '').map((t) => ({
          lower: Number(t.lower || 0), rate: Number((Number(t.rate || 0) / 100).toFixed(6)), fixed: Number(t.fixed || 0),
        })),
        nonEmployees: people.filter((p) => String(p.name || '').trim()).map((p) => ({
          name: p.name.trim(), sss: Number(p.sss || 0), phic: Number(p.phic || 0), hdmf: Number(p.hdmf || 0), hmo: Number(p.hmo || 0),
        })),
        sssEc: {},
      });
      toast.success('Saved');
      onSaved();
    } catch (e) { toast.error(e.message || 'Failed to save'); } finally { setSaving(false); }
  };

  return (
    <Modal title="BIR settings" subtitle="Values the BIR files use that are not payroll data" onClose={onClose} maxW="max-w-4xl">
      {!data ? <p className="text-gray-500">Loading...</p> : (
        <div className="space-y-4">
          <div className="flex gap-1 border-b border-gray-200">
            {TABS.map(([k, label]) => (
              <button key={k} onClick={() => setTab(k)}
                className={`px-3 py-2 text-sm -mb-px border-b-2 ${tab === k ? 'border-orange-600 text-orange-700 font-medium' : 'border-transparent text-gray-600 hover:text-gray-900'}`}>
                {label}
              </button>
            ))}
          </div>

          {tab === 'mwe' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-end gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Monthly basic salary at or below this amount is MWE</label>
                  <input type="number" className={`${inputCls} !w-48`} value={threshold} disabled={!canEdit}
                    onChange={(e) => setThreshold(e.target.value)} />
                </div>
                <p className="text-xs text-gray-500 pb-2">Required. Use your region's minimum wage. Choose MWE or NOT on an employee to override.</p>
              </div>
              <div className="border border-gray-200 rounded-lg overflow-auto max-h-[45vh]">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr><th className={thL}>Employee</th><th className={th}>Monthly basic</th><th className={th}>Current</th><th className={th}>Override</th></tr>
                  </thead>
                  <tbody className="[&>tr>td]:border-t [&>tr>td]:border-gray-100">
                    {(data.employees || []).map((e) => (
                      <tr key={e.employeeId}>
                        <td className="px-4 py-2">{fullName(e)}{e.status === 'INACTIVE' && <span className="ml-2 text-xs text-gray-400">inactive</span>}</td>
                        <td className="px-4 py-2 text-right tabular-nums">{money(e.monthlyBasic)}</td>
                        <td className="px-4 py-2 text-center">{e.mwe ? 'MWE' : 'NOT'}</td>
                        <td className="px-4 py-2">
                          <select className={`${inputCls} !w-28`} value={ov[e.employeeId] || ''} disabled={!canEdit}
                            onChange={(x) => setOv((p) => ({ ...p, [e.employeeId]: x.target.value }))}>
                            <option value="">Auto</option><option value="MWE">MWE</option><option value="NOT">NOT</option>
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {tab === 'non' && (
            <div className="space-y-3">
              <p className="text-xs text-gray-500">
                People who pay government contributions through the company but are not employees (for example investors). Enter their monthly amounts.
                They appear in the "Non-Employee Contributions" sheet of the Salary Monitoring file. Leave the list empty to leave that sheet out.
              </p>
              {canEdit && <button onClick={() => setPeople((p) => [...p, { name: '', sss: '', phic: '', hdmf: '', hmo: '' }])} className="px-3 py-1.5 border border-gray-300 rounded text-sm hover:bg-gray-100">Add person</button>}
              <div className="border border-gray-200 rounded-lg overflow-auto max-h-[45vh]">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50"><tr><th className={thL}>Name</th><th className={th}>SSS</th><th className={th}>PhilHealth</th><th className={th}>Pag-IBIG</th><th className={th}>HMO</th><th className={th} /></tr></thead>
                  <tbody>
                    {people.length === 0
                      ? <tr><td colSpan="6" className="px-4 py-6 text-center text-gray-500">No one added</td></tr>
                      : people.map((p, i) => (
                        <tr key={i}>
                          <td className="px-2 py-1"><input className={cellCls} value={p.name} disabled={!canEdit} onChange={(e) => setPerson(i, 'name', e.target.value)} /></td>
                          {['sss', 'phic', 'hdmf', 'hmo'].map((k) => (
                            <td key={k} className="px-2 py-1"><input type="number" min="0" step="0.01" className={cellCls} value={p[k]} disabled={!canEdit} onChange={(e) => setPerson(i, k, e.target.value)} /></td>
                          ))}
                          <td className="px-2 py-1">{canEdit && <button onClick={() => setPeople((x) => x.filter((_, j) => j !== i))} className="text-xs text-red-600 hover:underline">Remove</button>}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-3 border-t">
            <button onClick={onClose} className="px-4 py-2 border border-gray-300 rounded text-sm">Close</button>
            {canEdit && <button onClick={save} disabled={saving} className="px-4 py-2 bg-orange-600 text-white rounded text-sm hover:bg-orange-700 disabled:opacity-50">{saving ? 'Saving...' : 'Save'}</button>}
          </div>
        </div>
      )}
    </Modal>
  );
};

export default BirSettingsModal;