import React from 'react';
import { Line } from 'react-chartjs-2';
import { formatCurrency } from '../../utils/currencyUtils';

const ProductSalesChart = ({ productChartData, onPointClick, drillable = false, showAllTicks = false }) => {
  // Mobile-optimized chart options
  const mobileChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    onClick: (evt, elements) => {
      if (drillable && onPointClick && elements.length > 0) onPointClick(elements[0].index);
    },
    onHover: (evt, elements) => {
      const el = evt?.native?.target;
      if (el) el.style.cursor = drillable && elements.length > 0 ? 'pointer' : 'default';
    },
    plugins: {
      legend: {
        display: window.innerWidth > 640,
        position: 'top',
        labels: {
          boxWidth: 10,
          font: {
            size: window.innerWidth > 640 ? 11 : 9
          },
          generateLabels: (chart) => {
            const labels = chart.data.datasets.map((dataset, i) => ({
              text: dataset.label,
              fillStyle: dataset.borderColor,
              hidden: !chart.isDatasetVisible(i),
              lineCap: 'round',
              lineDash: dataset.lineDash,
              lineWidth: 2,
              strokeStyle: dataset.borderColor,
              pointStyle: 'circle',
              datasetIndex: i
            }));
            return labels;
          }
        }
      },
      tooltip: {
        callbacks: {
          footer: () => (drillable ? 'Click to view months' : ''),
          label: function (context) {
            return [context.dataset.label, `   ${formatCurrency(context.parsed.y)}`];
          },
          title: function (context) {
            return context[0].label;
          }
        },
        bodyFont: {
          size: window.innerWidth > 640 ? 11 : 9
        },
        titleFont: {
          size: window.innerWidth > 640 ? 11 : 9
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          font: {
            size: window.innerWidth > 640 ? 10 : 8
          },
          callback: function (value) {
            if (value >= 1000000) return '₱' + (value / 1000000).toFixed(1) + 'M';
            if (value >= 1000) return '₱' + (value / 1000).toFixed(0) + 'K';
            return '₱' + value;
          },
          maxTicksLimit: window.innerWidth > 640 ? 8 : 5
        },
        grid: {
          display: window.innerWidth > 640
        }
      },
      x: {
        ticks: {
          font: {
            size: window.innerWidth > 640 ? 10 : 8
          },
          maxRotation: window.innerWidth > 640 ? 45 : 90,
          minRotation: window.innerWidth > 640 ? 45 : 90,
          autoSkip: !showAllTicks,
          maxTicksLimit: window.innerWidth > 640 ? 12 : 6
        },
        grid: {
          display: false
        }
      }
    },
    elements: {
      line: {
        tension: 0.4,
        borderWidth: window.innerWidth > 640 ? 2 : 1.5
      },
      point: {
        radius: window.innerWidth > 640 ? 3 : 1.5,
        hoverRadius: window.innerWidth > 640 ? 5 : 3
      }
    }
  };

  return (
    <div className="w-full h-full">
      <Line
        data={productChartData}
        options={mobileChartOptions}
      />
    </div>
  );
};

export default ProductSalesChart; 