import React from 'react';
import { PieChart, CheckCheck, Clock, AlertCircle, ShoppingCart, Users, Database } from 'lucide-react';
import StatusBadge from '../common/StatusBadge';
import { formatCurrency, formatNumber } from '../../utils/currencyUtils';

const StatusDistribution = ({ stats, sales, navigate, isLoading = false }) => {
  const getSalesByStatus = () => {
    const normalizedSales = sales.map(sale => ({
      ...sale,
      displayStatus: (sale.status === 'CONFIRMED' || sale.status === 'INVOICED') ? 'ACTIVE' : sale.status
    }));

    const statusCounts = normalizedSales.reduce((acc, sale) => {
      acc[sale.displayStatus] = (acc[sale.displayStatus] || 0) + 1;
      return acc;
    }, {});

    const statusRevenue = normalizedSales.reduce((acc, sale) => {
      const amount = sale.totalAmount || 0;
      acc[sale.displayStatus] = (acc[sale.displayStatus] || 0) + amount;
      return acc;
    }, {});

    return {
      counts: statusCounts,
      revenues: statusRevenue
    };
  };

  const salesByStatus = getSalesByStatus();

  return (
    <div className="bg-white rounded-2xl shadow-md p-6 border border-gray-200">
      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <PieChart className="text-blue-600" size={20} />
        Sales Status Overview
      </h3>
      {isLoading ? (
        <div className="space-y-3 animate-pulse">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex justify-between mb-3">
                <div className="h-4 bg-gray-200 rounded w-1/3" />
                <div className="h-6 bg-gray-200 rounded w-8" />
              </div>
              <div className="h-2 bg-gray-200 rounded w-full" />
            </div>
          ))}
        </div>
      ) : Object.keys(salesByStatus.counts).length > 0 ? (
        <>
          <div className="space-y-3 mb-6">
            {Object.entries(salesByStatus.counts).map(([status, count]) => {
              const revenue = salesByStatus.revenues[status] || 0;
              const percentage = stats.totalSales > 0 ? ((count / stats.totalSales) * 100).toFixed(1) : 0;

              const statusConfig = {
                ACTIVE: {
                  color: 'green',
                  bg: 'bg-green-50',
                  border: 'border-green-200',
                  text: 'text-green-700',
                  icon: CheckCheck
                },
                PENDING: {
                  color: 'yellow',
                  bg: 'bg-yellow-50',
                  border: 'border-yellow-200',
                  text: 'text-yellow-700',
                  icon: Clock
                },
                CANCELLED: {
                  color: 'red',
                  bg: 'bg-red-50',
                  border: 'border-red-200',
                  text: 'text-red-700',
                  icon: AlertCircle
                }
              };

              const config = statusConfig[status] || statusConfig.PENDING;
              const Icon = config.icon;

              return (
                <div key={status} className={`${config.bg} border ${config.border} rounded-lg p-4 transition-all hover:shadow-md`}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className={`p-2 rounded-lg bg-white border ${config.border}`}>
                        <Icon size={18} className={config.text} />
                      </div>
                      <div>
                        <StatusBadge status={status} />
                        <p className="text-xs text-gray-500 mt-1">{percentage}% of total</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-2xl font-bold ${config.text}`}>{count}</p>
                      <p className="text-xs text-gray-500">sales</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Sales</span>
                      <span className="text-sm font-semibold text-gray-900">{formatCurrency(revenue)}</span>
                    </div>
                    <div className="w-full bg-white rounded-full h-2 border border-gray-200">
                      <div
                        className={`h-full rounded-full bg-${config.color}-500`}
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                    {count > 0 && (
                      <div className="flex justify-between items-center text-xs text-gray-500">
                        <span>Avg: {formatCurrency(revenue / count)}</span>
                        <span>{((revenue / stats.activeRevenue) * 100).toFixed(1)}% of active Sales</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-3 gap-2 pt-4 border-t border-gray-200">
            <div className="text-center">
              <p className="text-xs text-gray-500">Total Sales</p>
              <p className="text-lg font-bold text-gray-900">{formatNumber(stats.totalSales)}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-500">Total Sales</p>
              <p className="text-lg font-bold text-blue-700">
                {formatCurrency(Object.values(salesByStatus.revenues).reduce((a, b) => a + b, 0))}
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-500">Conversion</p>
              <p className="text-lg font-bold text-green-700">
                {stats.totalSales > 0 ? ((stats.activeSales / stats.totalSales) * 100).toFixed(1) : 0}%
              </p>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex gap-2">
              <button
                onClick={() => {
                  navigate('/sales?status=PENDING');
                }}
                className="flex-1 px-3 py-2 text-xs bg-yellow-100 text-yellow-700 rounded-lg hover:bg-yellow-200 transition-colors font-medium"
              >
                View Pending ({salesByStatus.counts.PENDING || 0})
              </button>
              <button
                onClick={() => {
                  navigate('/sales?status=ACTIVE');
                }}
                className="flex-1 px-3 py-2 text-xs bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors font-medium"
              >
                View Active ({salesByStatus.counts.ACTIVE || 0})
              </button>
            </div>
          </div>
        </>
      ) : (
        <div className="h-48 flex items-center justify-center text-gray-400">
          <div className="text-center">
            <Database size={32} className="opacity-50 mx-auto mb-3" />
            <p>No sales data</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default StatusDistribution;