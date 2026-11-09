import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { ChevronRight, LayoutDashboard, Bell, ShoppingCart, Truck, Boxes, ClipboardList, FileText, MapPin, Building2, Package, Store } from 'lucide-react';

const ICONS = {
  dashboard: LayoutDashboard, alerts: Bell, sales: ShoppingCart, deliveries: Truck,
  warehouse_inventory: Boxes, inventory: ClipboardList, procurement: FileText,
  warehouse: MapPin, branches: Building2, products: Package, supplier: Store,
};

// Page buttons per module. "needs" = the module action that opens that page.
const UI_EXTRAS = {
  warehouse_inventory: { group: 'whinv_ui', sections: [{ title: 'Inventory Records page buttons', needs: 'view', items: [['whi_new', 'New Inventory Record'], ['whi_edit', 'Edit'], ['whi_delete', 'Delete'], ['whi_confirm', 'Confirm']] }] },
  branches: { group: 'branches_ui', sections: [{ title: 'Branches & Companies tabs', needs: 'view', items: [['tab_branches', 'Branches'], ['tab_companies', 'Companies']] }] },
  procurement: {
    group: 'procurement_ui',
    sections: [
      { title: 'Procurement tabs', needs: 'view', items: [['tab_irr', 'IRR'], ['tab_rpq', 'RPQ'], ['tab_po', 'PO / Payments'], ['tab_costing', 'Costing']] },
      { title: 'IRR buttons', needs: 'view', items: [['irr_new', 'New request'], ['irr_view', 'View (eye)'], ['irr_edit', 'Edit'], ['irr_delete', 'Delete'], ['irr_proceed', 'Proceed to RPQ']] },
      { title: 'RPQ buttons', needs: 'view', items: [['rpq_view', 'View (eye)'], ['rpq_edit', 'Edit'], ['rpq_delete', 'Delete'], ['rpq_print', 'Print'], ['rpq_confirm', 'Confirm product']] },
      { title: 'PO / Payments buttons', needs: 'view', items: [['po_products', 'View products'], ['po_payments', 'View payments'], ['po_shipping', 'Shipping cost'], ['po_pay', 'Product cost (pay)'], ['po_other', 'Other charges'], ['po_submit', 'Submit order'], ['po_edit_payment', 'Edit payment']] },
    ],
  },
  alerts: {
    group: 'alerts_ui',
    sections: [
      { title: 'Alert buttons', needs: 'view', items: [['al_download', 'Download & Clear'], ['al_resolve_all', 'Resolve All'], ['al_clear_resolved', 'Clear Resolved'], ['al_resolve', 'Resolve (per alert)']] },
    ],
  },
  inventory: {
    group: 'inventory_ui',
    sections: [
      { title: 'Inventory Record tabs', needs: 'view', items: [['tab_products', 'Product Summary'], ['tab_warehouse', 'Warehouse Stocks'], ['tab_branch', 'Consigned Stocks'], ['tab_rebuild', 'Stock Rebuild']] },
      { title: 'Product Summary buttons', needs: 'view', items: [['ps_generate', 'Generate Report'], ['ps_view', 'View History (eye)']] },
      { title: 'Warehouse Stocks buttons', needs: 'view', items: [['ws_audit', 'Audit Delivered'], ['ws_movements', 'Movements'], ['ws_view', 'View Transactions (eye)'], ['ws_adjust', 'Manual Adjustment']] },
      { title: 'Consigned Stocks buttons', needs: 'view', items: [['cs_csv', 'Export CSV'], ['cs_print', 'Print / PDF'], ['cs_view', 'View Transactions (eye)']] },
      { title: 'Stock Rebuild buttons', needs: 'view', items: [['sr_rebuild', 'Rebuild stock'], ['sr_scan', 'Scan'], ['sr_fix', 'Fix duplicates'], ['sr_purge', 'Purge permanently'], ['sr_lock', 'Lock']] },
    ],
  },
  sales: {
    group: 'sales_ui',
    sections: [
      { title: 'Sales Journal buttons', needs: 'invoice', items: [['jr_record_payment', 'Record payment'], ['jr_dv_payment', 'Record DV payment'], ['jr_delete_invoice', 'Delete invoice'], ['jr_print_receipt', 'Print invoice receipt']] },
      { title: 'Sales Report buttons', needs: 'report', items: [['rp_generate', 'Generate report'], ['rp_export', 'Export CSV'], ['rp_print', 'Print']] },
    ],
  },
  deliveries: {
    group: 'deliveries_ui',
    sections: [
      { title: 'Transmittal buttons', needs: 'transmittal', items: [['tr_new', 'New transmittal'], ['tr_open', 'Open / edit'], ['tr_print', 'Print'], ['tr_delete', 'Delete']] },
    ],
  },
};

const Chip = ({ checked, disabled, onChange, label, strong }) => (
  <label
    className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm select-none transition-colors
      ${disabled ? 'bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed'
        : checked ? 'bg-orange-50 border-orange-300 text-orange-900 cursor-pointer'
          : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300 cursor-pointer'}
      ${strong ? 'font-medium' : ''}`}>
    <input type="checkbox" className="w-4 h-4 accent-orange-600" checked={checked} disabled={disabled} onChange={onChange} />
    {label}
  </label>
);

const Section = ({ title, right, children }) => (
  <div>
    <div className="flex items-center justify-between mb-2">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">{title}</div>
      {right}
    </div>
    {children}
  </div>
);

const FeatureAccessMatrix = ({ features, filters = {}, labels = {}, permissions, onChange }) => {
  const [open, setOpen] = useState(() => new Set());
  const has = (k) => permissions.includes(k);
  const keyOf = (f, a) => `${f.key}:${a}`;
  const filterKeys = (f) => (filters[f.key] || []).map((fl) => `${f.key}:filter_${fl.key}`);
  const groupKeys = (f) => {
    const ex = UI_EXTRAS[f.key];
    return ex ? ex.sections.flatMap((s) => s.items.map((i) => `${ex.group}:${i[0]}`)) : [];
  };
  const restricted = (f) => groupKeys(f).some(has);
  const ownKeys = (f) => new Set([...f.actions.map((a) => keyOf(f, a)), ...filterKeys(f), ...groupKeys(f)]);
  const flip = (id) => setOpen((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const setLevel = (list, level) => {
    let next = [...permissions];
    list.forEach((f) => {
      const own = ownKeys(f);
      next = next.filter((p) => !own.has(p));
      if (level === 'view') next.push(keyOf(f, 'view'), ...filterKeys(f));
      if (level === 'full') next.push(...f.actions.map((a) => keyOf(f, a)), ...filterKeys(f));
    });
    onChange(next);
  };

  const toggleAction = (f, a) => {
    const key = keyOf(f, a);
    if (a === 'view') {
      if (has(key)) {
        const gk = groupKeys(f);
        onChange(permissions.filter((p) => !p.startsWith(`${f.key}:`) && !gk.includes(p)));
        return;
      }
      const fk = filterKeys(f);
      onChange([...permissions, key, ...(fk.length && !fk.some(has) ? fk : [])]);
      return;
    }
    onChange(has(key) ? permissions.filter((p) => p !== key) : [...permissions, key]);
  };

  const toggleGroupKey = (f, key) => {
    const all = groupKeys(f);
    const next = new Set(restricted(f) ? all.filter(has) : all);
    next.has(key) ? next.delete(key) : next.add(key);
    if (next.size === 0) {
      toast.error('At least one button must stay ticked. Use "Reset buttons to full access" instead.');
      return;
    }
    const rest = permissions.filter((p) => !all.includes(p));
    onChange(next.size === all.length ? rest : [...rest, ...next]);
  };

  const resetGroup = (f) => { const all = groupKeys(f); onChange(permissions.filter((p) => !all.includes(p))); };
  const toggleFilter = (key) => onChange(has(key) ? permissions.filter((p) => p !== key) : [...permissions, key]);
  const setFilters = (f, all) => {
    const fk = filterKeys(f);
    const rest = permissions.filter((p) => !fk.includes(p));
    onChange(all ? [...rest, ...fk] : rest);
  };

  const status = (f) => {
    const n = f.actions.filter((a) => has(keyOf(f, a))).length;
    if (n === 0) return { text: 'No access', cls: 'bg-gray-100 text-gray-600' };
    if (n === f.actions.length && !restricted(f)) return { text: 'Full access', cls: 'bg-green-50 text-green-700' };
    if (n === 1 && has(keyOf(f, 'view'))) return { text: 'View only', cls: 'bg-blue-50 text-blue-700' };
    return { text: 'Restricted', cls: 'bg-orange-50 text-orange-700' };
  };

  return (
    <div className="space-y-3 mb-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-xs text-gray-500">Open a module, tick View to show it in the menu, then choose the buttons and filters allowed.</p>
        <div className="flex items-center gap-2 text-xs">
          <span className="text-gray-500">Set all:</span>
          {[['none', 'No access'], ['view', 'View only'], ['full', 'Full access']].map(([lv, text]) => (
            <button key={lv} type="button" onClick={() => setLevel(features, lv)}
              className="px-3 py-1.5 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50">{text}</button>
          ))}
        </div>
      </div>

      {features.map((f) => {
        const isOpen = open.has(f.key);
        const viewOn = has(keyOf(f, 'view'));
        const allowed = f.actions.filter((a) => has(keyOf(f, a))).length;
        const st = status(f);
        const fk = filterKeys(f);
        const fOn = fk.filter(has).length;
        const extra = UI_EXTRAS[f.key];
        const gRestricted = restricted(f);
        const Icon = ICONS[f.key] || Package;
        return (
          <div key={f.key} className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm">
            <button type="button" onClick={() => flip(f.key)}
              className="w-full flex items-center justify-between gap-3 px-4 py-3 bg-gray-50 hover:bg-gray-100 text-left transition-colors">
              <span className="flex items-center gap-3 min-w-0">
                <span className="w-9 h-9 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-orange-600 flex-shrink-0"><Icon size={18} /></span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-gray-900">{f.label}</span>
                  <span className="block text-xs text-gray-500 truncate">{f.description}</span>
                </span>
              </span>
              <span className="flex items-center gap-3 flex-shrink-0">
                <span className="text-xs text-gray-500">{allowed} of {f.actions.length} allowed</span>
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${st.cls}`}>{st.text}</span>
                <ChevronRight size={16} className={`text-gray-400 transition-transform ${isOpen ? 'rotate-90' : ''}`} />
              </span>
            </button>

            {isOpen && (
              <div className="p-4 space-y-5">
                <Section title="Access"
                  right={
                    <div className="flex items-center gap-3 text-xs font-medium text-orange-700">
                      <button type="button" onClick={() => setLevel([f], 'none')} className="hover:underline">No access</button>
                      <button type="button" onClick={() => setLevel([f], 'view')} className="hover:underline">View only</button>
                      <button type="button" onClick={() => setLevel([f], 'full')} className="hover:underline">Full access</button>
                    </div>
                  }>
                  <div className="flex flex-wrap gap-2">
                    {f.actions.map((a) => (
                      <Chip key={a} strong={a === 'view'}
                        label={a === 'view' ? `${labels.view || 'View'} (shows in menu)` : (labels[a] || a)}
                        checked={has(keyOf(f, a))}
                        disabled={a !== 'view' && !viewOn}
                        onChange={() => toggleAction(f, a)} />
                    ))}
                  </div>
                </Section>

                {extra && extra.sections.map((s) => {
                  const pageOn = viewOn && has(keyOf(f, s.needs));
                  return (
                    <div key={s.title} className={`rounded-lg border border-gray-200 ${pageOn ? 'bg-white' : 'bg-gray-50'}`}>
                      <div className="px-3 py-2 border-b border-gray-100 flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-900">{s.title}</span>
                        {!pageOn && <span className="text-xs text-gray-400">Page hidden (needs {labels[s.needs] || s.needs})</span>}
                      </div>
                      <div className="p-3 flex flex-wrap gap-2">
                        {s.items.map(([k, label]) => {
                          const key = `${extra.group}:${k}`;
                          return <Chip key={key} label={label} checked={!gRestricted || has(key)} disabled={!pageOn} onChange={() => toggleGroupKey(f, key)} />;
                        })}
                      </div>
                    </div>
                  );
                })}

                {extra && gRestricted && (
                  <div className="text-right">
                    <button type="button" onClick={() => resetGroup(f)} className="text-xs font-medium text-orange-700 hover:underline">Reset buttons to full access</button>
                  </div>
                )}

                {fk.length > 0 && (
                  <Section title={`Visible filters (${fOn}/${fk.length})`}
                    right={
                      <button type="button" disabled={!viewOn} onClick={() => setFilters(f, fOn !== fk.length)}
                        className="text-xs font-medium text-orange-700 hover:underline disabled:text-gray-400 disabled:no-underline">
                        {fOn === fk.length ? 'Clear all' : 'Select all'}
                      </button>
                    }>
                    <div className="flex flex-wrap gap-2">
                      {filters[f.key].map((fl) => {
                        const k = `${f.key}:filter_${fl.key}`;
                        return <Chip key={k} label={fl.label} checked={has(k)} disabled={!viewOn} onChange={() => toggleFilter(k)} />;
                      })}
                    </div>
                  </Section>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default FeatureAccessMatrix;