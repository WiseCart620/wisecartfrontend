import React from 'react';
import { Clock, ShoppingCart } from 'lucide-react';
import StatusBadge from '../common/StatusBadge';
import { formatCurrency } from '../../utils/currencyUtils';

const RecentSales = ({ recentSales, sales, isLoading = false }) => {
  return (
    <div className="bg-white rounded-2xl shadow-md p-6 border border-gray-200">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Clock className="text-gray-600" size={20} />
          Recent Sales Activity
        </h3>
        <span className="text-sm text-gray-500">
          {sales.length} total sales
        </span>
      </div>
      <div className="space-y-3 max-h-80 overflow-y-auto">
        {isLoading ? (
          <>
            {[...Array(4)].map((_, i) => (
              <div key={i} className="animate-pulse flex items-center justify-between p-3 border border-gray-100 rounded-lg">
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-gray-200 rounded w-1/2" />
                  <div className="h-2 bg-gray-100 rounded w-1/3" />
                </div>
                <div className="ml-4 space-y-2 text-right">
                  <div className="h-3 bg-gray-200 rounded w-16" />
                  <div className="h-2 bg-gray-100 rounded w-10" />
                </div>
              </div>
            ))}
          </>
        ) : recentSales.length > 0 ? (
          recentSales.map((sale, index) => {
            let dateStr = 'No date';
            try {
              if (sale.createdAt) {
                const parsedDate = new Date(sale.createdAt);
                if (!isNaN(parsedDate.getTime())) {
                  dateStr = parsedDate.toLocaleDateString('en-PH', {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  });
                }
              } else if (sale.month && sale.year) {
                const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                dateStr = `${monthNames[sale.month - 1]} ${sale.year}`;
              }
            } catch (e) {
              console.error('Error parsing date for sale:', sale.id, e);
              if (sale.month && sale.year) {
                const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                dateStr = `${monthNames[sale.month - 1]} ${sale.year}`;
              }
            }

            return (
              <div key={index} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors border border-gray-100">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-medium text-gray-900 truncate">
                      {sale.company?.companyName || 'Unknown Company'}
                    </p>
                    <StatusBadge
                      status={
                        (sale.status === 'CONFIRMED' || sale.status === 'INVOICED')
                          ? 'ACTIVE'
                          : sale.status || 'PENDING'
                      }
                    />
                  </div>
                  <p className="text-xs text-gray-500">
                    {dateStr}
                    {sale.branch?.branchName && ` • ${sale.branch.branchName}`}
                  </p>
                </div>
                <div className="text-right ml-4">
                  <p className="font-semibold text-gray-900">{formatCurrency(sale.totalAmount || 0)}</p>
                  <p className="text-xs text-gray-500">
                    {sale.items?.length || 0} item{(sale.items?.length || 0) !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-center py-8 text-gray-400">
            <ShoppingCart size={32} className="mx-auto mb-3 opacity-50" />
            <p>No recent sales</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default RecentSales;