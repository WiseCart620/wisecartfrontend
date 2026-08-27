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
          className="flex items-center gap-2 px-4 py-2.5 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
        >
          <Info size={18} />
          Business Insights
          {businessInsights.length > 0 && (
            <span className="bg-white text-gray-900 text-xs rounded-full px-2 py-1">
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
          <Bell size={18} className="text-gray-600" />
          <span className="text-sm text-gray-700 font-medium">Alerts</span>
          {alerts.some(a => !a.isResolved) && (
            <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full ring-2 ring-white"></span>
          )}
        </button>
      </div>
    </>
  );
};

export default DashboardHeader;