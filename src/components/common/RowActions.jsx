import React, { useState, useEffect } from 'react';
import { MoreVertical, Loader2 } from 'lucide-react';

const RowActions = ({ onView, items = [], loading = false }) => {
  const [menu, setMenu] = useState(null);

  useEffect(() => {
    if (!menu) return;
    const close = () => setMenu(null);
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    return () => {
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
    };
  }, [menu]);

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={onView}
        disabled={loading}
        className="px-2.5 h-7 inline-flex items-center gap-1 text-xs font-medium text-gray-800 bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-60"
      >
        {loading && <Loader2 size={12} className="animate-spin" />}
        View
      </button>

      {items.length > 0 && (
        <>
          <button
            disabled={loading}
            onClick={(e) => {
              const r = e.currentTarget.getBoundingClientRect();
              setMenu(menu ? null : { top: r.bottom + 4, right: window.innerWidth - r.right });
            }}
            className="w-7 h-7 inline-flex items-center justify-center rounded text-gray-500 hover:bg-gray-100 disabled:opacity-60"
          >
            <MoreVertical size={16} />
          </button>

          {menu && (
            <>
              <div className="fixed inset-0 z-[60]" onClick={() => setMenu(null)} />
              <div
                className="fixed z-[70] w-48 bg-white border border-gray-200 rounded-lg shadow-lg py-1"
                style={{ top: menu.top, right: menu.right }}
              >
                {items.map((it) => (
                  <button
                    key={it.label}
                    onClick={() => { setMenu(null); it.onClick(); }}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-gray-50 ${it.danger ? 'text-red-600' : 'text-gray-700'}`}
                  >
                    <it.icon size={15} />
                    {it.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
};

export default RowActions;