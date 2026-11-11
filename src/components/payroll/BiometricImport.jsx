import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import toast from 'react-hot-toast';
import { api } from '../../services/api';
import { Modal } from './Shared';

const pad = (n) => String(n).padStart(2, '0');
const RANGE = /Attendance date:\s*(\d{4})-(\d{2})-(\d{2})/;
const toTime = (v) => {
  if (v == null || v === '') return null;
  if (typeof v === 'number' && v > 0 && v < 1) { const m = Math.round(v * 1440); return `${pad(Math.floor(m / 60))}:${pad(m % 60)}`; }
  const s = String(v).trim();
  return /^\d{1,2}:\d{2}$/.test(s) ? s : null;
};

// Each sheet holds up to 3 employee blocks side by side (15 columns apart).
const parseWorkbook = (wb) => {
  const out = [];
  wb.SheetNames.forEach((sn) => {
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[sn], { header: 1, defval: '', raw: true });
    const head = rows[3] || [];
    const cols = [];
    head.forEach((c, i) => { if (String(c).trim() === 'Dept.') cols.push(i); });
    if (!cols.length) return;
    let start = null;
    for (let r = 0; r < 5 && !start; r++) {
      (rows[r] || []).forEach((c) => {
        const m = String(c).match(RANGE);
        if (m && !start) start = { y: +m[1], m: +m[2], d: +m[3] };
      });
    }
    if (!start) return;
    cols.forEach((c) => {
      const name = String(head[c + 9] || '').trim();
      const userId = String((rows[4] || [])[c + 9] || '').trim();
      if (!name && !userId) return;
      for (let r = 8; r < rows.length; r++) {
        const row = rows[r] || [];
        const m = String(row[c]).trim().match(/^(\d{1,2})\s+[A-Za-z]{2}$/);
        if (!m) continue;
        const punches = [];
        for (let k = 1; k <= 13; k++) { const t = toTime(row[c + k]); if (t) punches.push(t); }
        if (!punches.length) continue;
        const day = +m[1];
        let y = start.y, mo = start.m;
        if (day < start.d) { mo += 1; if (mo > 12) { mo = 1; y += 1; } }
        out.push({ userId, name, date: `${y}-${pad(mo)}-${pad(day)}`, punches });
      }
    });
  });
  return out;
};

const List = ({ title, items, tone }) => !items || items.length === 0 ? null : (
  <div className={`mt-3 text-sm rounded p-3 ${tone}`}>
    <div className="font-semibold mb-1">{title} ({items.length})</div>
    <ul className="list-disc ml-5 max-h-40 overflow-auto">{items.map((x, i) => <li key={i}>{x}</li>)}</ul>
  </div>
);

const BiometricImport = ({ onClose, onDone }) => {
  const [records, setRecords] = useState([]);
  const [fileName, setFileName] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);

  const pick = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      const wb = XLSX.read(await f.arrayBuffer(), { type: 'array' });
      const recs = parseWorkbook(wb);
      if (!recs.length) toast.error('No attendance records found in this file');
      setRecords(recs); setFileName(f.name); setResult(null);
    } catch { toast.error('Could not read the file'); }
  };

  const send = async () => {
    setBusy(true);
    try {
      const r = await api.post('/dtr/import-biometric', { records });
      setResult(r.data);
      toast.success(r.data?.message || 'Imported');
    } catch (err) { toast.error(err.message || 'Import failed'); } finally { setBusy(false); }
  };

  const people = new Set(records.map((r) => r.userId || r.name)).size;

  return (
    <Modal title="Import Biometrics" subtitle="Biometric attendance report (.xls) for office workers" onClose={result ? onDone : onClose} maxW="max-w-2xl">
      <input type="file" accept=".xls,.xlsx" onChange={pick}
        className="block w-full text-sm border border-gray-300 rounded px-3 py-2" />
      {records.length > 0 && !result && (
        <p className="mt-3 text-sm text-gray-700">
          {fileName}: <b>{records.length}</b> day(s) with punches for <b>{people}</b> employee(s).
          Earliest punch = Time in, latest punch = Time out. Late and undertime are computed per date.
        </p>
      )}
      {result && (
        <div>
          <p className="mt-3 text-sm font-medium text-green-700">{result.message}</p>
          <List title="No employee record found, skipped (e.g. interns)" items={result.unmatched} tone="bg-gray-100 text-gray-700" />
          <List title="Only one punch: missing time-out, please fix in Edit day" items={result.incomplete} tone="bg-amber-50 text-amber-800" />
          <List title="Skipped" items={result.skipped} tone="bg-gray-100 text-gray-700" />
        </div>
      )}
      <div className="flex justify-end gap-2 pt-4 mt-4 border-t">
        <button onClick={result ? onDone : onClose} className="px-4 py-2 border border-gray-300 rounded text-sm">{result ? 'Close' : 'Cancel'}</button>
        {!result && (
          <button onClick={send} disabled={busy || !records.length}
            className="px-4 py-2 bg-orange-600 text-white rounded text-sm hover:bg-orange-700 disabled:opacity-50">
            {busy ? 'Importing...' : 'Import to DTR'}
          </button>
        )}
      </div>
    </Modal>
  );
};

export default BiometricImport;