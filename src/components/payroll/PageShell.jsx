import React, { useRef, useState, useLayoutEffect } from 'react';

const PageShell = ({
  title, subtitle, action, tabs, tab, onTab,
  navH = 81, // use the same value as --nav-h in PayrollRunManagement.jsx
  maxW = 'max-w-7xl', children,
}) => {
  const headRef = useRef(null);
  const [headH, setHeadH] = useState(120);
  useLayoutEffect(() => {
    if (headRef.current && headRef.current.offsetHeight !== headH) setHeadH(headRef.current.offsetHeight);
  });

  return (
    <div className={`p-6 pt-0 ${maxW} mx-auto`}
      style={{ '--nav-h': `${navH}px`, '--head-h': `${headH}px` }}>
      <div ref={headRef} className="sticky top-[var(--nav-h)] z-20 bg-gray-50 pt-6 pb-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">{title}</h1>
            {subtitle && <p className="text-gray-500 mt-1 text-sm">{subtitle}</p>}
          </div>
          {action}
        </div>
        {tabs && (
          <div className="flex gap-6 border-b border-gray-200 mt-3 overflow-x-auto overflow-y-hidden">
            {tabs.map(t => (
              <button key={t.key} onClick={() => onTab(t.key)}
                className={`pb-3 text-sm font-medium border-b-2 -mb-px whitespace-nowrap transition-colors ${tab === t.key
                  ? 'border-orange-600 text-orange-700' : 'border-transparent text-gray-500 hover:text-gray-800'}`}>
                {t.label}
              </button>
            ))}
          </div>
        )}
      </div>
      {children}
    </div>
  );
};

export default PageShell;