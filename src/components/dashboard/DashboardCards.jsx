import React from 'react';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

const DashboardCards = ({ stats, totalAlerts, isLoading = false }) => {
    const formatCurrency = (amount) => {
        if (amount === null || amount === undefined) return '₱0';
        if (amount >= 1000000) {
            return `₱${(amount / 1000000).toFixed(1)}M`;
        }
        if (amount >= 1000) {
            return `₱${(amount / 1000).toFixed(1)}K`;
        }
        return `₱${Math.round(amount).toLocaleString('en-PH')}`;
    };

    const formatNumber = (num) => {
        if (num === null || num === undefined) return '0';
        if (num >= 1000000) {
            return `${(num / 1000000).toFixed(1)}M`;
        }
        if (num >= 1000) {
            return `${(num / 1000).toFixed(1)}K`;
        }
        return num.toLocaleString('en-PH');
    };

    const formatVelocity = (velocity) => {
        if (velocity === null || velocity === undefined) return '0.0';
        return velocity.toFixed(1);
    };

    const cards = [
        {
            title: 'Active Sales',
            mainValue: formatNumber(stats?.activeSales),
            subValue: `${formatVelocity(stats?.salesVelocity)}/day`,
            description: `Total: ${formatNumber(stats?.totalSales)} sales`,
            trend: stats?.salesVelocity
        },
        {
            title: 'Active Revenue',
            mainValue: formatCurrency(stats?.activeRevenue),
            description: `Growth: ${stats?.revenueGrowth > 0 ? '+' : ''}${stats?.revenueGrowth || 0}%`,
            trend: stats?.revenueGrowth
        },
        {
            title: 'Avg Order Value',
            mainValue: formatCurrency(stats?.averageOrderValue),
            description: 'Based on active sales'
        },
        {
            title: 'Sales Velocity',
            mainValue: `${formatVelocity(stats?.salesVelocity)}/day`,
            description: 'Last 30 days'
        },
    ];

    if (isLoading) {
        return (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-1.5 w-full overflow-hidden">
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="bg-white rounded-lg shadow-sm p-2 border border-gray-200 animate-pulse">
                        <div className="h-3 bg-gray-200 rounded w-2/3 mb-2" />
                        <div className="h-6 bg-gray-200 rounded w-3/4 mb-1" />
                        <div className="h-2 bg-gray-100 rounded w-1/2" />
                    </div>
                ))}
            </div>
        );
    }

    return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-1.5 w-full overflow-hidden">
            {cards.map((card, i) => {
                const trendIcon = card.trend > 0 ?
                    <ArrowUpRight className="text-green-500" size={10} /> :
                    card.trend < 0 ? <ArrowDownRight className="text-red-500" size={10} /> : null;

                return (
                    <div key={i} className="bg-white rounded-lg shadow-sm p-2 border border-gray-200 w-full min-w-0">
                        <div className="flex items-center justify-between mb-1">
                            <p className="text-[9px] sm:text-xs text-gray-500 font-medium uppercase tracking-wide truncate">{card.title}</p>
                            {card.trend !== undefined && trendIcon && (
                                <div className="flex items-center gap-0.5 flex-shrink-0">
                                    {trendIcon}
                                    <span className={`text-[9px] sm:text-[10px] font-medium ${card.trend > 0 ? 'text-green-600' : 'text-red-500'}`}>
                                        {Math.abs(card.trend).toFixed(0)}%
                                    </span>
                                </div>
                            )}
                        </div>

                        <div className="mb-0.5">
                            <p className="text-sm sm:text-lg md:text-xl font-bold text-gray-900 truncate">{card.mainValue}</p>
                            {card.subValue && (
                                <p className="text-[8px] sm:text-[10px] text-gray-500 mt-0.5 truncate">≈ {card.subValue}</p>
                            )}
                        </div>

                        <p className="text-[8px] sm:text-[10px] text-gray-400 truncate leading-tight">{card.description}</p>
                    </div>
                );
            })}
        </div>
    );
};

export default DashboardCards;