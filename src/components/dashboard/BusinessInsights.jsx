import React from 'react';
import { Info, TrendingUpIcon, AlertTriangle, Clock } from 'lucide-react';
import { formatCurrency } from '../../utils/currencyUtils';

const BusinessInsights = ({ insights, showInsights, setShowInsights }) => {
  if (!showInsights || insights.length === 0) return null;

  return (
    <div className="bg-white rounded-2xl shadow-md p-6 border border-gray-200">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Info className="text-gray-500" size={20} />
          Business Insights
        </h3>
        <button
          onClick={() => setShowInsights(false)}
          className="text-gray-400 hover:text-gray-600"
        >
          ✕
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {insights.map((insight, idx) => {
          const Icon = insight.icon;
          const typeColors = {
            positive: 'bg-white border-gray-200 text-green-700',
            warning: 'bg-white border-gray-200 text-amber-700',
            info: 'bg-white border-gray-200 text-gray-700',
          };

          return (
            <div key={idx} className={`p-4 rounded-lg border ${typeColors[insight.type]}`}>
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-lg ${insight.type === 'positive' ? 'bg-green-50' :
                  insight.type === 'warning' ? 'bg-amber-50' : 'bg-gray-100'
                  }`}>
                  <Icon size={20} />
                </div>
                <div>
                  <h4 className="font-semibold">{insight.title}</h4>
                  <p className="text-sm mt-1">{insight.message}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default BusinessInsights;