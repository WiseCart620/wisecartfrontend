import React, { useRef, useState, useLayoutEffect } from 'react';

const PageShell = ({
  title, subtitle, action, tabs, tab, onTab,
  maxW = 'max-w-[1500px]', children,
}) => {
  const headRef = useRef(null);
  const [headH, setHeadH] = useState(120);
  useLayoutEffect(() => {
    if (headRef.current && headRef.current.offsetHeight !== headH) setHeadH(headRef.current.offsetHeight);
  });

  return (
    <div className={`w-full ${maxW} mx-auto px-4 sm:px-6 lg:px-8 pb-10`}
      style={{ '--nav-h': 'var(--layout-nav-h, 0px)', '--head-h': `${headH}px` }}>
      <div ref={headRef} className="sticky top-[var(--nav-h)] z-20 bg-white pt-6 pb-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">{title}</h1>
            {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
          </div>
          {action && <div className="flex items-center gap-2">{action}</div>}
        </div>
        {tabs && (
          <div className="flex gap-1 border-b border-gray-200 mt-4 overflow-x-auto overflow-y-hidden">
            {tabs.map(t => (
              <button key={t.key} onClick={() => onTab(t.key)}
                className={`px-3 pb-2.5 pt-1 text-sm font-medium border-b-2 -mb-px whitespace-nowrap transition-colors ${tab === t.key
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