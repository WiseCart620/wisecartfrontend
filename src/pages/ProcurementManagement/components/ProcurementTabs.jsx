import React from 'react';
import { FileText, Package, ShoppingCart, BarChart2 } from 'lucide-react';

const ProcurementTabs = ({ tabs, activeTab, onTabChange }) => {
    const getIcon = (iconName) => {
        if (iconName === ShoppingCart) {
            return <ShoppingCart size={20} />;
        }

        switch (iconName) {
            case 'FileText':
                return <FileText size={20} />;
            case 'Package':
                return <Package size={20} />;
            case 'BarChart2':
                return <BarChart2 size={20} />;
            default:
                return null;
        }
    };

    return (
        <div className="border-b border-gray-200 tabs-fit">
            <nav className="flex gap-4 flex-nowrap">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => onTabChange(tab.id)}
                        className={`flex items-center gap-2 px-4 py-3 border-b-2 font-medium transition-colors whitespace-nowrap shrink-0 ${activeTab === tab.id
                            ? 'border-blue-600 text-blue-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                    >
                        {getIcon(tab.icon)}
                        {tab.label}

                        {/* Total Count */}
                        {tab.count !== undefined && (
                            <span
                                className={`px-2 py-0.5 rounded-full text-xs font-semibold badge-nowrap ${activeTab === tab.id
                                    ? 'bg-blue-100 text-blue-600'
                                    : 'bg-gray-100 text-gray-600'
                                    }`}
                            >
                                {tab.count}
                            </span>
                        )}

                        {/* Pending Count Badge */}
                        {tab.pendingCount !== undefined && tab.pendingCount > 0 && (
                            <span
                                className={`px-2 py-0.5 rounded-full text-xs font-semibold badge-nowrap ${activeTab === tab.id
                                    ? 'bg-amber-100 text-amber-700'
                                    : 'bg-amber-50 text-amber-600'
                                    } border border-amber-300`}
                            >
                                {tab.pendingCount} pending
                            </span>
                        )}
                    </button>
                ))}
            </nav>
        </div>
    );
};

export default ProcurementTabs;