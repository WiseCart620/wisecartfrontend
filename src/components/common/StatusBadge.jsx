import React from 'react';
import { CheckCheck, Clock, AlertCircle } from 'lucide-react';

const StatusBadge = ({ status }) => {
  const getStatusConfig = (status) => {
    const configs = {
      ACTIVE: {
        bg: 'bg-gray-900',
        text: 'text-white',
        border: 'border-gray-900',
        icon: CheckCheck,
        label: 'Active'
      },
      PENDING: {
        bg: 'bg-gray-100',
        text: 'text-gray-800',
        border: 'border-gray-300',
        icon: Clock,
        label: 'Pending'
      },
      CANCELLED: {
        bg: 'bg-white',
        text: 'text-gray-500',
        border: 'border-gray-300',
        icon: AlertCircle,
        label: 'Cancelled'
      }
    };

    return configs[status] || {
      bg: 'bg-gray-100',
      text: 'text-gray-800',
      border: 'border-gray-200',
      icon: Clock,
      label: status
    };
  };

  const config = getStatusConfig(status);
  const Icon = config.icon;

  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${config.bg} ${config.text} ${config.border}`}>
      <Icon size={12} />
      {config.label}
    </span>
  );
};

export default StatusBadge;