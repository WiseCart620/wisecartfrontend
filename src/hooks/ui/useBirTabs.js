import { useCallback, useState } from 'react';

export const BIR_TABS = [
  { id: 'summary', label: 'Summary' },
  { id: 'sales', label: 'Sales (output tax)' },
    { id: 'recovered', label: 'Recovered receivables' },
  { id: 'purchases', label: 'Purchases (input tax)' },
  { id: 'credits', label: 'Creditable VAT' },
  { id: 'adjustments', label: 'Adjustments' },
  { id: 'taxpayer', label: 'Taxpayer' },
  { id: 'filing', label: 'Filing' },
];

const KEY = 'bir2550q.tab';

/** Remembers the active tab for the browser session. */
export default function useBirTabs() {
  const [tab, setTabState] = useState(() => {
    try {
      const saved = sessionStorage.getItem(KEY);
      return BIR_TABS.some((t) => t.id === saved) ? saved : 'summary';
    } catch {
      return 'summary';
    }
  });
  const setTab = useCallback((id) => {
    setTabState(id);
    try {
      sessionStorage.setItem(KEY, id);
    } catch {
      /* storage can be blocked; the tab still works */
    }
  }, []);
  return { tab, setTab, tabs: BIR_TABS };
}
