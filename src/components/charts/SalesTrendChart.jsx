import React, { useEffect, useRef } from 'react';
import { Line } from 'react-chartjs-2';
import { TrendingUp } from 'lucide-react';
import { formatCurrency } from '../../utils/currencyUtils';

const SalesTrendChart = ({ chartData, sales, selectedYear }) => {
    const chartRef = useRef();
    
    // Get dynamic font size based on screen width
    const getFontSize = () => {
        if (typeof window !== 'undefined') {
            if (window.innerWidth < 640) return 8;
            if (window.innerWidth < 1024) return 10;
            return 11;
        }
        return 11;
    };

    const getTickLimit = () => {
        if (typeof window !== 'undefined') {
            if (window.innerWidth < 640) return 4;
            if (window.innerWidth < 1024) return 6;
            return 8;
        }
        return 8;
    };

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: typeof window !== 'undefined' ? window.innerWidth > 768 : true,
                position: 'top',
                align: 'start',
                labels: {
                    boxWidth: 10,
                    padding: 8,
                    font: {
                        size: getFontSize(),
                        weight: 'bold'
                    }
                }
            },
            tooltip: {
                enabled: true,
                mode: 'index',
                intersect: false,
                bodyFont: { size: getFontSize() },
                titleFont: { size: getFontSize() + 1 },
                callbacks: {
                    label: function (context) {
                        return `${context.dataset.label}: ${formatCurrency(context.parsed.y)}`;
                    }
                }
            }
        },
        scales: {
            y: {
                beginAtZero: true,
                grid: { color: 'rgba(229, 231, 235, 0.8)' },
                border: { display: false },
                ticks: {
                    color: '#6b7280',
                    padding: 4,
                    font: { size: getFontSize() },
                    callback: function (value) {
                        if (value >= 1000000) return (value / 1000000).toFixed(1) + 'M';
                        if (value >= 1000) return (value / 1000).toFixed(0) + 'K';
                        return value.toFixed(0);
                    },
                    maxTicksLimit: getTickLimit(),
                    stepSize: undefined
                },
                title: {
                    display: typeof window !== 'undefined' ? window.innerWidth > 768 : true,
                    text: 'Revenue (₱)',
                    color: '#4b5563',
                    font: { size: getFontSize(), weight: 'bold' },
                    padding: { top: 5, bottom: 5 }
                }
            },
            x: {
                grid: { display: typeof window !== 'undefined' ? window.innerWidth > 640 : false },
                border: { display: false },
                ticks: {
                    color: '#6b7280',
                    padding: 4,
                    font: { size: getFontSize() },
                    maxRotation: typeof window !== 'undefined' && window.innerWidth < 640 ? 90 : 45,
                    minRotation: typeof window !== 'undefined' && window.innerWidth < 640 ? 90 : 45,
                    autoSkip: true,
                    maxTicksLimit: getTickLimit()
                }
            }
        },
        interaction: {
            intersect: false,
            mode: 'index',
        },
        elements: {
            line: { tension: 0.4, borderWidth: typeof window !== 'undefined' && window.innerWidth < 640 ? 2 : 3 },
            point: { 
                radius: typeof window !== 'undefined' && window.innerWidth < 640 ? 2 : 4,
                hoverRadius: typeof window !== 'undefined' && window.innerWidth < 640 ? 4 : 6,
                borderWidth: 2,
                borderColor: '#ffffff'
            }
        }
    };

    // Update chart on resize
    useEffect(() => {
        const handleResize = () => {
            if (chartRef.current && chartRef.current.chart) {
                chartRef.current.chart.update();
            }
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    return (
        <div className="relative w-full h-full">
            {sales.length > 0 ? (
                <Line 
                    ref={chartRef}
                    data={chartData} 
                    options={chartOptions}
                />
            ) : (
                <div className="h-full flex flex-col items-center justify-center text-gray-400">
                    <TrendingUp size={40} className="mb-3 opacity-50" />
                    <p className="text-sm font-semibold">No sales data available</p>
                    <p className="text-xs mt-1">Try different filters</p>
                </div>
            )}
        </div>
    );
};

export default SalesTrendChart;