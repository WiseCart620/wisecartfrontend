import React from 'react';

const POS = {
  left:   'left-0 top-1/2 -translate-y-1/2',
  center: 'left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2',
  right:  'right-0 top-1/2 -translate-y-1/2',
};

const HeaderIcon = ({ Icon, icon, label, align = 'center' }) => {
  const iconEl = icon ?? <Icon className="w-4 h-4 shrink-0" />;
  return (
    <span
      className="group/hdr relative inline-flex h-6 items-center cursor-pointer text-black"
      aria-label={label}
    >
      {iconEl}
      <span
        className={`pointer-events-none absolute ${POS[align] || POS.center} z-50 flex items-center gap-1.5
                   max-w-0 overflow-hidden whitespace-nowrap rounded-md border border-orange-200 bg-orange-50 px-0 py-1
                   text-xs font-medium normal-case text-orange-600 opacity-0 shadow
                   transition-all duration-300 ease-in-out
                   group-hover/hdr:max-w-[200px] group-hover/hdr:px-2 group-hover/hdr:opacity-100`}
      >
        {iconEl}
        {label}
      </span>
    </span>
  );
};

export default HeaderIcon;