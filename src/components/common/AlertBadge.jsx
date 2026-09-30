import React from 'react';
import { Bell } from 'lucide-react';

const AlertBadge = ({ count, type = 'warning' }) => {
  if (!count || count === 0) return null;

  const colors = {
    warning: { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-200', icon: 'text-yellow-600' },
    danger: { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-200', icon: 'text-red-600' },
    info: { bg: 'bg-orange-100', text: 'text-orange-800', border: 'border-orange-200', icon: 'text-orange-600' },
    success: { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-200', icon: 'text-green-600' },
  };

  const colorConfig = colors[type];

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${colorConfig.bg} ${colorConfig.text} ${colorConfig.border}`}>
      <Bell size={12} className={`mr-1 ${colorConfig.icon}`} />
      {count} alert{count !== 1 ? 's' : ''}
    </span>
  );
};

export default AlertBadge;