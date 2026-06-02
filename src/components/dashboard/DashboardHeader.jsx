import React from 'react';
import { Info, Bell, RefreshCw } from 'lucide-react';

const DashboardHeader = ({
  showInsights,
  setShowInsights,
  showNotifications,
  setShowNotifications,
  businessInsights,
  alerts,
  loadStats,
  isLoading = false
}) => {
  return (
    <>

      <div className="flex flex-wrap items-center gap-4">
        <button
          onClick={() => setShowInsights(!showInsights)}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-lg hover:opacity-90 transition-all"
        >
          <Info size={18} />
          Business Insights
          {businessInsights.length > 0 && (
            <span className="bg-white text-purple-700 text-xs rounded-full px-2 py-1">
              {businessInsights.length}
            </span>
          )}
        </button>
        <button
          onClick={() => loadStats()}
          disabled={isLoading}
          className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-60"
        >
          <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
          {isLoading ? 'Refreshing...' : 'Refresh Data'}
        </button>

        <button
          onClick={() => setShowNotifications(!showNotifications)}
          className="relative flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <Bell size={18} className={alerts.some(a => !a.isResolved) ? 'text-red-500' : 'text-gray-600'} />
          <span className="text-sm text-gray-700 font-medium">Alerts</span>
          {alerts.filter(a => !a.isResolved).length > 0 && (
            <span className="min-w-[20px] h-5 px-1 bg-red-500 text-white text-[11px] font-bold rounded-full flex items-center justify-center">
              {alerts.filter(a => !a.isResolved).length > 99 ? '99+' : alerts.filter(a => !a.isResolved).length}
            </span>
          )}
        </button>
      </div>
    </>
  );
};

export default DashboardHeader;