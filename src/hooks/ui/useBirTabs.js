import { useCallback, useState } from 'react';

export const BIR_TABS = [
  { id: 'sales', label: 'Sales (output tax)' },
  { id: 'purchases', label: 'Purchases (input tax)' },
  { id: 'recovered', label: 'Recovered receivables' },
  { id: 'filing', label: 'Filing' },
];

const KEY = 'bir2550q.tab';

/** Remembers the active tab for the browser session. */
export default function useBirTabs() {
  const [tab, setTabState] = useState(() => {
    try {
      const saved = sessionStorage.getItem(KEY);
      return BIR_TABS.some((t) => t.id === saved) ? saved : 'sales';
    } catch {
      return 'sales';
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