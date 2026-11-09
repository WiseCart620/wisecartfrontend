import React, { useState } from 'react';

const LEVELS = [
  ['none', 'No access'],
  ['view', 'View only'],
  ['full', 'Full access'],
  ['custom', 'Custom'],
];

const ModuleAccess = ({ features = [], filters = {}, labels = {}, permissions = [], onChange }) => {
  const [forced, setForced] = useState(() => new Set());
  const has = (k) => permissions.includes(k);
  const actionKeys = (f) => f.actions.map((a) => `${f.key}:${a}`);
  const filterKeys = (f) => (filters[f.key] || []).map((fl) => `${f.key}:filter_${fl.key}`);
  const allKeys = (f) => [...actionKeys(f), ...filterKeys(f)];

  const keysFor = (f, level) => {
    if (level === 'none') return [];
    if (level === 'view') return [`${f.key}:view`, ...filterKeys(f)];
    return allKeys(f);
  };

  const modeOf = (f) => {
    const a = actionKeys(f).filter(has);
    const fl = filterKeys(f).filter(has);
    if (a.length === 0 && fl.length === 0) return 'none';
    const allFilters = fl.length === filterKeys(f).length;
    if (a.length === f.actions.length && allFilters) return 'full';
    if (a.length === 1 && a[0] === `${f.key}:view` && allFilters && f.actions.length > 1) return 'view';
    return 'custom';
  };

  const write = (f, keys) => {
    const mine = new Set(allKeys(f));
    onChange([...permissions.filter((p) => !mine.has(p)), ...keys]);
  };

  const setLevel = (f, level) => {
    if (level === 'custom') {
      setForced((prev) => new Set(prev).add(f.key));
      if (modeOf(f) === 'none') write(f, keysFor(f, 'view'));
      return;
    }
    setForced((prev) => {
      const n = new Set(prev);
      n.delete(f.key);
      return n;
    });
    write(f, keysFor(f, level));
  };

  const applyAll = (level) => {
    const mine = new Set(features.flatMap(allKeys));
    const added = features.flatMap((f) => keysFor(f, level));
    onChange([...permissions.filter((p) => !mine.has(p)), ...added]);
    setForced(new Set());
  };

  const toggle = (f, key) => {
    const current = allKeys(f).filter(has);
    write(f, current.includes(key) ? current.filter((k) => k !== key) : [...current, key]);
  };

  const toggleFilters = (f) => {
    const fk = filterKeys(f);
    const current = allKeys(f).filter(has);
    const all = fk.every(has);
    write(f, all ? current.filter((k) => !fk.includes(k)) : [...new Set([...current, ...fk])]);
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 bg-gray-50 border-b border-gray-200">
        <span className="text-xs text-gray-600">Pick one level per module. Use <b>Custom</b> only when you need exact actions.</span>
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-gray-500 mr-1">Set all:</span>
          {[['none', 'No access'], ['view', 'View only'], ['full', 'Full access']].map(([k, l]) => (
            <button key={k} type="button" onClick={() => applyAll(k)}
              className="px-2.5 py-1 text-xs font-medium border border-gray-300 rounded hover:bg-white text-gray-700">{l}</button>
          ))}
        </div>
      </div>

      <div className="divide-y divide-gray-100">
        {features.map((f) => {
          const derived = modeOf(f);
          const mode = forced.has(f.key) ? 'custom' : derived;
          const single = f.actions.length === 1;
          const levels = single ? [['none', 'No access'], ['full', 'Allowed']] : LEVELS;
          const fk = filterKeys(f);
          const selActions = actionKeys(f).filter(has).length;
          return (
            <div key={f.key} className={mode === 'none' ? 'bg-white' : 'bg-orange-50/30'}>
              <div className="flex flex-wrap items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1 basis-56">
                  <div className="text-sm font-semibold text-gray-900">{f.label}</div>
                  {f.description && <div className="text-xs text-gray-500 truncate" title={f.description}>{f.description}</div>}
                </div>
                {mode === 'custom' && (
                  <span className="text-xs font-medium text-orange-700 bg-orange-50 px-2.5 py-1 rounded-full">
                    {selActions} of {f.actions.length} actions
                  </span>
                )}
                <div className="inline-flex rounded border border-gray-200 p-0.5 bg-white">
                  {levels.map(([k, l]) => (
                    <button key={k} type="button" onClick={() => setLevel(f, k)}
                      className={`px-3 py-1 text-xs font-medium rounded whitespace-nowrap ${mode === k
                        ? (k === 'none' ? 'bg-gray-700 text-white' : 'bg-orange-600 text-white')
                        : 'text-gray-600 hover:bg-gray-100'}`}>{l}</button>
                  ))}
                </div>
              </div>

              {mode === 'custom' && (
                <div className="px-4 pb-4 pt-1 space-y-3">
                  <div className="flex flex-wrap gap-x-5 gap-y-2">
                    {f.actions.map((a) => {
                      const k = `${f.key}:${a}`;
                      return (
                        <label key={k} className="inline-flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                          <input type="checkbox" className="accent-orange-600 w-4 h-4" checked={has(k)} onChange={() => toggle(f, k)} />
                          {labels[a] || a}
                        </label>
                      );
                    })}
                  </div>
                  {fk.length > 0 && (
                    <div className="border-t border-gray-200 pt-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Visible filters</span>
                        <button type="button" onClick={() => toggleFilters(f)}
                          className="text-xs font-medium text-orange-600 hover:text-orange-800">
                          {fk.every(has) ? 'Clear all' : 'Select all'}
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-x-5 gap-y-2">
                        {(filters[f.key] || []).map((fl) => {
                          const k = `${f.key}:filter_${fl.key}`;
                          return (
                            <label key={k} className="inline-flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                              <input type="checkbox" className="accent-orange-600 w-4 h-4" checked={has(k)} onChange={() => toggle(f, k)} />
                              {fl.label}
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ModuleAccess;