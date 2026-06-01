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
          className="relative p-2 text-gray-600 hover:text-gray-900 transition-colors rounded-full hover:bg-gray-100"
        >
          <Bell size={20} />
          {alerts.some(alert => !alert.isResolved) && (
            <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-600 rounded-full ring-2 ring-white"></span>
          )}
        </button>
      </div>
    </>
  );
};

export default DashboardHeader;