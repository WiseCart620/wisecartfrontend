import React, { useState, useEffect } from 'react';
import { Send } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../services/api';
import { inputCls, money, Field, Modal } from './Shared';

const CHANNELS = ['BANK_TRANSFER', 'PAYROLL_CARD', 'CASH', 'CHECK'];

const DisbursementTab = ({ approvedRuns, canManage }) => {
  const [runId, setRunId] = useState('');
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [show, setShow] = useState(false);
  const [form, setForm] = useState({ channel: 'BANK_TRANSFER', sourceAccount: '', remarks: '' });
  const [creating, setCreating] = useState(false);
  const [expandedId, setExpandedId] = useState(null);

  const loadForRun = async (id) => {
    if (!id) return;
    setLoading(true);
    setSearched(true);
    try {
      const res = await api.get(`/payroll/disbursements?runId=${id}`);
      setBatches(res.success ? res.data || [] : []);
    } catch (e) {
      toast.error('Failed to load disbursement batches');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (runId) loadForRun(runId); }, [runId]);

  const set = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (!runId) { toast.error('Select a payroll run first'); return; }
    setCreating(true);
    try {
      await api.post('/payroll/disbursements', { payrollRunId: Number(runId), ...form });
      toast.success('Disbursement batch generated');
      setShow(false);
      setForm({ channel: 'BANK_TRANSFER', sourceAccount: '', remarks: '' });
      loadForRun(runId);
    } catch (err) {
      toast.error(err.message || 'Failed to generate batch');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div>
      <div className="bg-gray-50 border border-gray-100 rounded-xl p-5 mb-6 flex flex-col md:flex-row gap-4 md:items-end">
        <Field label="Payroll Run" required className="flex-1">
          <select className={inputCls} value={runId} onChange={(e) => setRunId(e.target.value)}>
            <option value="">Select an approved or paid run...</option>
            {approvedRuns.map(r => (
              <option key={r.payRollRunId} value={r.payRollRunId}>
                {r.scheduleName} · {r.periodStart} to {r.periodEnd} ({r.status})
              </option>
            ))}
          </select>
        </Field>
        {canManage && (
          <button onClick={() => setShow(true)} disabled={!runId}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 whitespace-nowrap">
            <Send size={18} /> Generate Batch
          </button>
        )}
      </div>

      <div className="space-y-4">
        {!searched ? (
          <p className="text-center text-gray-500 py-8">Select a payroll run to view its disbursement batches</p>
        ) : loading ? (
          <p className="text-center text-gray-500 py-8">Loading...</p>
        ) : batches.length === 0 ? (
          <p className="text-center text-gray-500 py-8">No disbursement batches for this run yet</p>
        ) : batches.map(b => (
          <div key={b.disbursementId} className="bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="p-4 flex items-center justify-between cursor-pointer" onClick={() => setExpandedId(expandedId === b.disbursementId ? null : b.disbursementId)}>
              <div>
                <p className="font-medium text-gray-900">{b.channel.replaceAll('_', ' ')}</p>
                <p className="text-xs text-gray-500">{new Date(b.generatedAt).toLocaleString()} {b.sourceAccount ? `· ${b.sourceAccount}` : ''}</p>
              </div>
              <div className="text-right">
                <p className="font-bold text-gray-900">{money(b.totalAmount)}</p>
                <p className="text-xs text-gray-500">{b.lines.length} beneficiaries</p>
              </div>
            </div>
            {expandedId === b.disbursementId && (
              <div className="border-t border-gray-100 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Beneficiary</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Account</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Net Pay</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {b.lines.map(l => (
                      <tr key={l.lineId}>
                        <td className="px-4 py-2">{l.beneficiaryName}</td>
                        <td className="px-4 py-2 text-gray-500">{l.beneficiaryAccountNumber || '—'}</td>
                        <td className="px-4 py-2 text-right font-medium">{money(l.netPayAmount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ))}
      </div>

      {show && (
        <Modal title="Generate Disbursement Batch" onClose={() => setShow(false)}>
          <form onSubmit={submit} className="grid grid-cols-1 gap-4">
            <Field label="Channel" required>
              <select className={inputCls} value={form.channel} onChange={set('channel')}>
                {CHANNELS.map(c => <option key={c} value={c}>{c.replaceAll('_', ' ')}</option>)}
              </select>
            </Field>
            <Field label="Source Account"><input className={inputCls} value={form.sourceAccount} onChange={set('sourceAccount')} placeholder="Optional" /></Field>
            <Field label="Remarks"><input className={inputCls} value={form.remarks} onChange={set('remarks')} placeholder="Optional" /></Field>
            <div className="flex justify-end gap-2 pt-2 border-t">
              <button type="button" onClick={() => setShow(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm">Cancel</button>
              <button type="submit" disabled={creating} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">
                {creating ? 'Generating...' : 'Generate'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default DisbursementTab;