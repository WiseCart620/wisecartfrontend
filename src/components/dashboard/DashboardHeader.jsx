import React from 'react';
import { Info, Bell, RefreshCw } from 'lucide-react';

const DashboardHeader = ({
  showInsights,
  setShowInsights,
  showNotifications,
  setShowNotifications,
  businessInsights,
  alerts,
  loadStats
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
          className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <RefreshCw size={18} />
          Refresh Data
        </button>

        <button
          onClick={() => setShowNotifications(!showNotifications)}
          className="relative flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <Bell size={18} />
          Alerts
          {alerts.filter(a => !a.isResolved).length > 0 && (
            <>
              <span className="bg-red-500 text-white text-xs rounded-full px-2 py-1">
                {alerts.filter(a => !a.isResolved).length}
              </span>
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse"></span>
            </>
          )}
        </button>
      </div>
    </>
  );
};

export default DashboardHeader;