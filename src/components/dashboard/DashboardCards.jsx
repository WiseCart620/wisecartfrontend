import React from 'react';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';
import PesoIcon from '../common/PesoIcon';
const DashboardCards = ({ stats, totalAlerts }) => {
    const cards = [
        {
            title: 'Active Sales',
            value: formatNumber(stats?.activeSales),
            color: 'blue',
            description: `Total: ${formatNumber(stats?.totalSales)} sales`,
            trend: stats?.salesVelocity,
            trendLabel: 'sales/day'
        },
        {
            title: 'Active Revenue',
            value: formatCurrency(stats?.activeRevenue),
            color: 'blue',
            description: `Growth: ${stats?.revenueGrowth > 0 ? '+' : ''}${stats?.revenueGrowth || 0}%`,
            trend: stats?.revenueGrowth
        },
        {
            title: 'Avg. Order Value',
            value: formatCurrency(stats?.averageOrderValue),
            color: 'blue',
            description: 'Based on active sales'
        },
        {
            title: 'Sales Velocity',
            value: `${stats?.salesVelocity?.toFixed(1) || '0.0'}/day`,
            color: 'blue',
            description: 'Last 30 days average'
        },
    ];

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            {cards.map((card, i) => {
                const bgColor = {
                    blue: 'bg-blue-500',
                    yellow: 'bg-yellow-500',
                    red: 'bg-red-500',
                    green: 'bg-green-500',
                    orange: 'bg-orange-500',
                    purple: 'bg-purple-500',
                }[card.color];

                const trendIcon = card.trend > 0 ?
                    <ArrowUpRight className="text-green-500" size={16} /> :
                    card.trend < 0 ? <ArrowDownRight className="text-red-500" size={16} /> : null;

                return (
                    <div key={i} className="bg-blue-50 bg-opacity-60 rounded-xl shadow-md hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 p-5 border border-blue-200">
                        <div className="flex-1">
                            <div className="flex items-center justify-between mb-2">
                                <p className="text-sm text-blue-600 font-medium">{card.title}</p>
                                {card.trend !== undefined && trendIcon && (
                                    <div className="flex items-center gap-1">
                                        {trendIcon}
                                        <span className={`text-xs font-medium ${card.trend > 0 ? 'text-green-600' : 'text-red-500'}`}>
                                            {card.trendLabel ? `${Math.abs(card.trend)} ${card.trendLabel}` : `${Math.abs(card.trend)}%`}
                                        </span>
                                    </div>
                                )}
                            </div>
                            <p className="text-2xl font-bold text-blue-800">{card.value}</p>
                            <p className="text-xs text-blue-400 mt-2">{card.description}</p>
                        </div>
                        <div className="mt-4 h-1 rounded-full bg-blue-100">
                            <div className="h-full rounded-full bg-blue-400" style={{ width: '100%' }}></div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

const formatCurrency = (amount) => {
    if (amount === null || amount === undefined) return '₱0.00';
    return `₱${Number(amount).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const formatNumber = (num) => {
    if (num === null || num === undefined) return '0';
    return Number(num).toLocaleString('en-PH');
};

export default DashboardCards;