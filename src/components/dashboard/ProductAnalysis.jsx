import React, { useMemo, useState } from 'react';
import { BarChart2, Package, Users, Building, ChevronDown, ChevronRight, X, Target, BarChart, TrendingUpIcon } from 'lucide-react';
import { Bar } from 'react-chartjs-2';
import { formatCurrency, formatNumber } from '../../utils/currencyUtils';

const ProductAnalysis = ({
  performanceData,
  productSalesData,
  selectedProductId,
  setSelectedProductId,
  selectedCategory,
  setSelectedCategory,
  productCategories,
  performanceYear,
  setPerformanceYear,
  performanceView,
  setPerformanceView,
  performanceMonth,
  setPerformanceMonth,
  availableYears,
  products,
  sales,
  selectedCompanyForBranches,
  setSelectedCompanyForBranches,
  selectedCompanyForTopBranches,
  setSelectedCompanyForTopBranches
}) => {

  const [rankBy, setRankBy] = useState('quantity');

  const filteredTopProducts = useMemo(() => {
    let list = [...(performanceData.topProducts || [])];

    if (selectedCategory !== 'all') {
      list = list.filter(product => product.category === selectedCategory);
    }

    list.sort((a, b) =>
      rankBy === 'revenue'
        ? b.revenue - a.revenue
        : b.quantity - a.quantity
    );

    return list;
  }, [performanceData.topProducts, selectedCategory, rankBy]);

  const getItemKey = (item) => `${item.product?.id}_${item.variation?.id || 'base'}`;

  const itemMatchesSelection = (item) => {
    if (selectedProductId) return getItemKey(item) === selectedProductId;
    if (selectedCategory === 'all') return true;
    const fullProduct = products.find(p => String(p.id) === String(item.product?.id));
    const category = fullProduct?.category || item.product?.category || 'Uncategorized';
    return category === selectedCategory;
  };

  const isSaleInPeriod = (sale) => {
    const statusMatch = sale.status === 'CONFIRMED' || sale.status === 'INVOICED' || sale.status === 'PENDING';
    if (!statusMatch) return false;
    if (performanceView === 'overall') return true;

    const saleYear = sale.year || new Date(sale.createdAt || sale.date).getFullYear();
    const saleMonth = sale.month || (new Date(sale.createdAt || sale.date).getMonth() + 1);
    const yearMatch = saleYear === performanceYear;
    const monthMatch = performanceView === 'month' ? saleMonth === performanceMonth : true;
    return yearMatch && monthMatch;
  };

  const getSelectedProductStats = () => {
    const transactions = new Set();
    let totalRevenue = 0;
    let totalQuantity = 0;

    sales.filter(isSaleInPeriod).forEach(sale => {
      sale.items?.forEach(item => {
        if (!itemMatchesSelection(item)) return;
        transactions.add(sale.id);
        totalRevenue += item.amount || 0;
        totalQuantity += item.quantity || 0;
      });
    });

    if (transactions.size === 0) return null;

    return {
      totalRevenue,
      totalQuantity,
      transactions: transactions.size,
      avgPerUnit: totalQuantity > 0 ? totalRevenue / totalQuantity : 0
    };
  };

  const getProductChartData = () => {
    const companyData = {};

    sales.filter(isSaleInPeriod).forEach(sale => {
      const companyName = sale.company?.companyName || 'Unknown Company';
      sale.items?.forEach(item => {
        if (!itemMatchesSelection(item)) return;
        if (!companyData[companyName]) {
          companyData[companyName] = { revenue: 0, quantity: 0 };
        }
        companyData[companyName].revenue += item.amount || 0;
        companyData[companyName].quantity += item.quantity || 0;
      });
    });

    const companies = Object.keys(companyData).sort((a, b) =>
      companyData[b].revenue - companyData[a].revenue
    );

    if (companies.length === 0) return null;

    return {
      labels: companies,
      datasets: [
        {
          label: 'Sales',
          data: companies.map(c => companyData[c].revenue),
          backgroundColor: 'rgba(255, 109, 0, 0.85)',
          borderColor: '#FF6D00',
          borderWidth: 2,
          yAxisID: 'y',
        },
        {
          label: 'Quantity Sold',
          data: companies.map(c => companyData[c].quantity),
          backgroundColor: 'rgba(255, 182, 0, 0.85)',
          borderColor: '#FFB600',
          borderWidth: 2,
          yAxisID: 'y1',
        }
      ]
    };
  };

  const getCompanyBranchBreakdown = (companyName) => {
    const branchData = {};
    const salesByBranch = {};

    sales
      .filter(sale => isSaleInPeriod(sale) && sale.company?.companyName === companyName)
      .forEach(sale => {
        const branchName = sale.branch?.branchName || 'Unknown Branch';

        sale.items?.forEach(item => {
          if (!itemMatchesSelection(item)) return;

          if (!branchData[branchName]) {
            branchData[branchName] = {
              branchName,
              branchCode: sale.branch?.branchCode || 'N/A',
              sales: 0,
              quantity: 0,
              salesCount: 0
            };
            salesByBranch[branchName] = new Set();
          }
          branchData[branchName].sales += item.amount || 0;
          branchData[branchName].quantity += item.quantity || 0;
          salesByBranch[branchName].add(sale.id);
        });
      });

    Object.keys(branchData).forEach(name => {
      branchData[name].salesCount = salesByBranch[name].size;
    });

    return Object.values(branchData).sort((a, b) => b.sales - a.sales);
  };




  return (
    <div className="grid grid-cols-1 gap-4">
      <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200">
        <div className="flex flex-col lg:grid lg:grid-cols-12 gap-4">
          <div className="lg:col-span-4">
            <div className="flex flex-col gap-2 mb-3">
              <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                <Target className="text-gray-900" size={18} />
                Top Performing Products
              </h3>

              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1 bg-gray-100 rounded p-1">
                  <button
                    onClick={() => setPerformanceView('overall')}
                    className={`px-3 py-1 text-xs rounded ${performanceView === 'overall'
                      ? 'bg-white text-gray-900 font-semibold shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                      }`}
                  >
                    Overall
                  </button>
                  <button
                    onClick={() => setPerformanceView('year')}
                    className={`px-3 py-1 text-xs rounded ${performanceView === 'year'
                      ? 'bg-white text-gray-900 font-semibold shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                      }`}
                  >
                    Year
                  </button>
                  <button
                    onClick={() => setPerformanceView('month')}
                    className={`px-3 py-1 text-xs rounded ${performanceView === 'month'
                      ? 'bg-white text-gray-900 font-semibold shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                      }`}
                  >
                    Month
                  </button>
                </div>

                <div className="flex items-center gap-1 bg-gray-100 rounded p-1">
                  <button
                    onClick={() => setRankBy('quantity')}
                    className={`px-3 py-1 text-xs rounded ${rankBy === 'quantity'
                      ? 'bg-white text-gray-900 font-semibold shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                      }`}
                  >
                    By Quantity
                  </button>
                  <button
                    onClick={() => setRankBy('revenue')}
                    className={`px-3 py-1 text-xs rounded ${rankBy === 'revenue'
                      ? 'bg-white text-gray-900 font-semibold shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                      }`}
                  >
                    By Sales
                  </button>
                </div>

                {performanceView !== 'overall' && (
                  <select
                    value={performanceYear}
                    onChange={(e) => setPerformanceYear(parseInt(e.target.value))}
                    className="px-2 py-1 text-xs border border-gray-300 rounded bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  >
                    {availableYears.length > 0 ? (
                      availableYears.map(year => (
                        <option key={year} value={year}>{year}</option>
                      ))
                    ) : (
                      <option value={new Date().getFullYear()}>{new Date().getFullYear()}</option>
                    )}
                  </select>
                )}

                {performanceView === 'month' && (
                  <select
                    value={performanceMonth}
                    onChange={(e) => setPerformanceMonth(parseInt(e.target.value))}
                    className="px-2 py-1 text-xs border border-gray-300 rounded bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  >
                    {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((month, idx) => (
                      <option key={idx} value={idx + 1}>{month}</option>
                    ))}
                  </select>
                )}

                {productCategories.length > 0 && (
                  <div className="relative">
                    <select
                      value={selectedCategory}
                      onChange={(e) => {
                        setSelectedCategory(e.target.value);
                        setSelectedProductId(null);
                      }}
                      className="px-2 py-1 text-xs border border-gray-300 rounded bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 appearance-none pr-6"
                    >
                      <option value="all">All Categories</option>
                      {productCategories.map((category, idx) => (
                        <option key={idx} value={category}>
                          {category}
                        </option>
                      ))}
                    </select>
                    <ChevronDown size={12} className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" />
                  </div>
                )}
              </div>
            </div>

            {/* Period Indicator */}
            <div className="mb-3 p-2 bg-gray-50 rounded border border-gray-200">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-gray-900">
                  {performanceView === 'overall'
                    ? 'Showing all-time data'
                    : performanceView === 'year'
                      ? `Showing data for ${performanceYear}`
                      : `Showing data for ${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][performanceMonth - 1]} ${performanceYear}`
                  }
                </span>
                <span className="text-xs text-gray-500">
                  {filteredTopProducts.length} product{filteredTopProducts.length !== 1 ? 's' : ''}
                </span>
              </div>
            </div>

            <div className="space-y-2 max-h-[700px] overflow-y-auto">
              {selectedCategory !== 'all' && (
                <div className="mb-3 p-2 bg-gray-50 rounded border border-gray-200">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-gray-900">{selectedCategory}</span>
                    <span className="text-xs text-gray-500">
                      {(() => {
                        const productsInCategory = filteredTopProducts.length;
                        return `${productsInCategory} product${productsInCategory !== 1 ? 's' : ''}`;
                      })()}
                    </span>
                  </div>
                </div>
              )}

              {filteredTopProducts.length > 0 ? (
                filteredTopProducts.map((product, idx) => (
                  <div
                    key={product.id || idx}
                    className={`p-3 rounded transition-all cursor-pointer border ${selectedProductId === product.id
                      ? 'bg-gray-50 border-orange-500 shadow-sm'
                      : 'bg-white border-gray-200 hover:bg-gray-100 hover:border-gray-300'
                      }`}
                    onClick={() => {
                      setSelectedProductId(selectedProductId === product.id ? null : product.id);
                      setSelectedCompanyForBranches(null);
                    }}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`text-xl font-bold flex-shrink-0 ${idx === 0 ? 'text-gray-900' :
                        idx === 1 ? 'text-gray-400' :
                          idx === 2 ? 'text-gray-900' : 'text-gray-400'
                        }`}>
                        #{idx + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium ${selectedProductId === product.id ? 'text-gray-900' : 'text-gray-900'
                          }`}>
                          {product.name}
                        </p>
                        {product.category && product.category !== 'Uncategorized' && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-gray-100 text-gray-600 mt-1">
                            {product.category}
                          </span>
                        )}
                        <p className="text-xs text-gray-500 mt-1">
                          {rankBy === 'revenue' ? 'Ranked by sales' : 'Ranked by quantity sold'}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mt-3">
                      <div>
                        <div className="flex items-baseline gap-1">
                          <h4 className="text-gray-900 font-bold text-m">₱</h4>
                          <span className="text-xs text-gray-600">Sales</span>
                        </div>
                        <p className="text-sm font-bold text-gray-900 mt-1">
                          {formatCurrency(product.revenue)}
                        </p>
                      </div>
                      <div>
                        <div className="flex items-baseline gap-1">
                          <Package size={12} className="text-gray-500" />
                          <span className="text-xs text-gray-600">Quantity</span>
                        </div>
                        <p className="text-sm font-bold text-gray-900 mt-1">
                          {product.quantity} units
                        </p>
                      </div>
                    </div>

                    <div className="mt-2 pt-2 border-t border-gray-200">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500">Avg/Unit</span>
                        <span className="text-xs font-semibold text-gray-900">
                          {formatCurrency(product.revenue / product.quantity)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-6 text-gray-400">
                  <Package size={28} className="mx-auto mb-2 opacity-50" />
                  <p className="text-sm">
                    {selectedCategory === 'all'
                      ? 'No product data available'
                      : `No products found in "${selectedCategory}" category`}
                  </p>
                  {selectedCategory !== 'all' && (
                    <button
                      onClick={() => setSelectedCategory('all')}
                      className="mt-2 text-xs text-gray-900 hover:text-gray-900"
                    >
                      View all categories →
                    </button>
                  )}
                </div>
              )}
            </div>

            {selectedCategory === 'all' && productCategories.length > 0 && filteredTopProducts.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <h4 className="text-xs font-semibold text-gray-700 mb-2">Top Categories</h4>
                <div className="space-y-2">
                  {(() => {
                    const categoryRevenue = {};
                    filteredTopProducts.forEach(product => {
                      const category = product.category || 'Uncategorized';
                      if (!categoryRevenue[category]) {
                        categoryRevenue[category] = { revenue: 0, count: 0 };
                      }
                      categoryRevenue[category].revenue += product.revenue;
                      categoryRevenue[category].count += 1;
                    });

                    const topCategories = Object.entries(categoryRevenue)
                      .sort((a, b) => b[1].revenue - a[1].revenue)
                      .slice(0, 3);

                    if (topCategories.length === 0) return null;

                    const totalRevenue = filteredTopProducts.reduce((sum, p) => sum + p.revenue, 0);

                    return (
                      <>
                        {topCategories.map(([category, data]) => {
                          const percentage = totalRevenue > 0 ? ((data.revenue / totalRevenue) * 100).toFixed(1) : 0;
                          return (
                            <div
                              key={category}
                              className="flex items-center justify-between p-2 hover:bg-white rounded cursor-pointer"
                              onClick={() => setSelectedCategory(category)}
                            >
                              <span className="text-xs text-gray-600">{category}</span>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-semibold text-gray-900">
                                  {formatCurrency(data.revenue)}
                                </span>
                                <span className="text-xs text-gray-400">({percentage}%)</span>
                                <ChevronRight size={12} className="text-gray-300" />
                              </div>
                            </div>
                          );
                        })}
                      </>
                    );
                  })()}
                </div>
              </div>
            )}
          </div>

          {/* Product Analysis Detail */}
          <div className="lg:col-span-8 border-t lg:border-t-0 lg:border-l border-gray-200 pt-4 lg:pt-0 lg:pl-4">
            <div className="flex justify-between items-center mb-3">
              <div>
                <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2 flex-wrap">
                  <BarChart2 className="text-gray-900" size={18} />
                  Product Analysis
                  <span className="text-xs text-gray-500">
                    - {selectedProductId
                      ? productSalesData.find(p => p.id === selectedProductId)?.name
                      : selectedCategory !== 'all'
                        ? `All ${selectedCategory}`
                        : 'All Products'}
                  </span>
                  <span className="text-xs text-gray-900">
                    ({performanceView === 'overall'
                      ? 'All Time'
                      : performanceView === 'year'
                        ? performanceYear
                        : `${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][performanceMonth - 1]} ${performanceYear}`
                    })
                  </span>
                  {selectedProductId && (
                    <button
                      onClick={() => {
                        setSelectedProductId(null);
                        setSelectedCompanyForBranches(null);
                      }}
                      className="ml-1 px-2 py-0.5 text-[10px] bg-gray-100 text-gray-700 rounded hover:bg-gray-200 flex items-center gap-1"
                    >
                      <X size={10} /> Show all products
                    </button>
                  )}
                </h3>
              </div>
            </div>

            {true ? (
              <>
                {/* Product Summary */}
                <div className="bg-gradient-to-r from-gray-50 to-gray-50 rounded p-3 mb-3 border border-gray-200">
                  <div className="text-xs font-semibold text-gray-900 mb-2 text-center">
                    {performanceView === 'overall'
                      ? 'All-Time Performance'
                      : performanceView === 'year'
                        ? `${performanceYear} Performance`
                        : `${['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][performanceMonth - 1]} ${performanceYear} Performance`
                    }
                  </div>

                  <div className="grid grid-cols-4 gap-2">
                    {(() => {
                      const stats = getSelectedProductStats();
                      return stats ? (
                        <>
                          <div className="text-center">
                            <p className="text-xs text-gray-600">Total Sales</p>
                            <p className="text-sm font-bold text-gray-900">
                              {formatCurrency(stats.totalRevenue)}
                            </p>
                          </div>
                          <div className="text-center">
                            <p className="text-xs text-gray-600">Total Quantity</p>
                            <p className="text-sm font-bold text-gray-900">
                              {formatNumber(stats.totalQuantity)}
                            </p>
                          </div>
                          <div className="text-center">
                            <p className="text-xs text-gray-600">Transactions</p>
                            <p className="text-sm font-bold text-gray-900">
                              {formatNumber(stats.transactions)}
                            </p>
                          </div>
                          <div className="text-center">
                            <p className="text-xs text-gray-600">Avg/Unit</p>
                            <p className="text-sm font-bold text-gray-900">
                              {formatCurrency(stats.avgPerUnit)}
                            </p>
                          </div>
                        </>
                      ) : (
                        <div className="col-span-4 text-center text-gray-400">
                          <p className="text-xs">No data available</p>
                        </div>
                      );
                    })()}
                  </div>
                </div>

                {/* Product Chart or Company Branch Breakdown */}
                {!selectedCompanyForBranches ? (
                  <div style={{ height: '250px' }}>
                    {(() => {
                      const chartData = getProductChartData();
                      return chartData ? (
                        <Bar
                          data={chartData}
                          options={{
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: {
                              legend: {
                                display: true,
                                position: 'top',
                                labels: {
                                  font: { size: 10 },
                                  padding: 8
                                }
                              },
                              tooltip: {
                                callbacks: {
                                  label: function (context) {
                                    if (context.dataset.label === 'Sales') {
                                      return `${context.dataset.label}: ${formatCurrency(context.parsed.y)}`;
                                    } else {
                                      return `${context.dataset.label}: ${context.parsed.y} units`;
                                    }
                                  }
                                }
                              }
                            },
                            scales: {
                              y: {
                                type: 'linear',
                                display: true,
                                position: 'left',
                                title: {
                                  display: true,
                                  text: 'Sales (₱)',
                                  color: '#FF6D00',
                                  font: { size: 10 }
                                },
                                ticks: {
                                  font: { size: 9 },
                                  callback: function (value) {
                                    if (value >= 1000000) return '₱' + (value / 1000000).toFixed(1) + 'M';
                                    if (value >= 1000) return '₱' + (value / 1000).toFixed(0) + 'K';
                                    return '₱' + value;
                                  }
                                }
                              },
                              y1: {
                                type: 'linear',
                                display: true,
                                position: 'right',
                                title: {
                                  display: true,
                                  text: 'Quantity',
                                  color: '#FFB600',
                                  font: { size: 10 }
                                },
                                ticks: {
                                  font: { size: 9 }
                                },
                                grid: {
                                  drawOnChartArea: false,
                                },
                              },
                              x: {
                                ticks: {
                                  maxRotation: 45,
                                  minRotation: 45,
                                  font: { size: 8 },
                                  autoSkip: true,
                                  maxTicksLimit: 20
                                }
                              }
                            }
                          }}
                        />
                      ) : (
                        <div className="h-full flex flex-col items-center justify-center text-gray-400">
                          <BarChart size={36} className="mb-2 opacity-50" />
                          <p className="text-sm">No sales data for this product</p>
                        </div>
                      );
                    })()}
                  </div>
                ) : (
                  /* Company Branch Breakdown */
                  <div className="space-y-2">
                    <div className="flex items-center justify-between bg-gradient-to-r from-gray-50 to-gray-50 p-2 rounded border border-gray-200">
                      <div className="flex items-center gap-2">
                        <Building className="text-gray-900" size={16} />
                        <div>
                          <h4 className="text-sm font-bold text-gray-900">{selectedCompanyForBranches}</h4>
                          <p className="text-xs text-gray-600">Branch Breakdown</p>
                        </div>
                      </div>
                      <button
                        onClick={() => setSelectedCompanyForBranches(null)}
                        className="px-2 py-1 bg-white border border-gray-300 rounded text-xs hover:bg-white transition-colors flex items-center gap-1"
                      >
                        <X size={12} />
                        Back
                      </button>
                    </div>

                    <div className="space-y-2 max-h-[300px] overflow-y-auto">
                      {(() => {
                        const branches = getCompanyBranchBreakdown(selectedCompanyForBranches);
                        if (branches.length === 0) {
                          return (
                            <div className="text-center py-6 text-gray-400">
                              <Building size={28} className="mx-auto mb-2 opacity-50" />
                              <p className="text-sm">No branch data available</p>
                            </div>
                          );
                        }

                        const maxSales = Math.max(...branches.map(b => b.sales));
                        const maxQuantity = Math.max(...branches.map(b => b.quantity));

                        return branches.map((branch, idx) => {
                          const salesBarWidth = maxSales > 0 ? (branch.sales / maxSales * 100) : 0;
                          const quantityBarWidth = maxQuantity > 0 ? (branch.quantity / maxQuantity * 100) : 0;

                          return (
                            <div key={idx} className="bg-white rounded p-2 border border-gray-200">
                              <div className="flex items-center gap-2 mb-2">
                                <span className={`text-base font-bold flex-shrink-0 ${idx === 0 ? 'text-gray-900' :
                                  idx === 1 ? 'text-gray-400' :
                                    idx === 2 ? 'text-gray-900' : 'text-gray-400'
                                  }`}>
                                  #{idx + 1}
                                </span>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-semibold text-gray-900">{branch.branchName}</p>
                                  <p className="text-xs text-gray-500">{branch.branchCode} • {branch.salesCount} trans</p>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs text-gray-600 w-10 flex-shrink-0">Sales</span>
                                <div className="flex-1 flex items-center gap-1">
                                  <div className="flex-1 bg-gray-200 rounded-full h-3">
                                    <div
                                      className="bg-gradient-to-r from-orange-500 to-orange-600 h-3 rounded-full transition-all duration-500"
                                      style={{ width: `${salesBarWidth}%` }}
                                    ></div>
                                  </div>
                                  <span className="text-xs font-bold text-gray-900 w-16 text-right">{formatCurrency(branch.sales)}</span>
                                </div>
                              </div>

                              <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-600 w-10 flex-shrink-0">Qty</span>
                                <div className="flex-1 flex items-center gap-1">
                                  <div className="flex-1 bg-gray-200 rounded-full h-3">
                                    <div
                                      className="bg-gradient-to-r from-orange-500 to-orange-600 h-3 rounded-full transition-all duration-500"
                                      style={{ width: `${quantityBarWidth}%` }}
                                    ></div>
                                  </div>
                                  <span className="text-xs font-bold text-gray-900 w-16 text-right">{formatNumber(branch.quantity)}</span>
                                </div>
                              </div>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="h-64 flex flex-col items-center justify-center text-gray-400">
                <Package size={36} className="mb-3 opacity-50" />
                <p className="text-sm">Select a product to view analysis</p>
                <p className="text-xs mt-1">Click on any product from the list</p>
              </div>
            )}
            {/* Top Companies & Branches Section */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Top Companies */}
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                    <Users size={16} className="text-gray-900" />
                    Top Companies ({performanceView === 'overall'
                      ? 'All Time'
                      : performanceView === 'year'
                        ? performanceYear
                        : `${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][performanceMonth - 1]} ${performanceYear}`
                    })
                  </h4>
                  <div className="space-y-2 max-h-[400px] overflow-y-auto">
                    {performanceData.topCompanies && performanceData.topCompanies.length > 0 ? (
                      performanceData.topCompanies.map((company, idx) => {
                        const maxRevenue = performanceData.topCompanies[0]?.revenue || 1;
                        const barWidth = (company.revenue / maxRevenue) * 100;

                        return (
                          <div
                            key={company.id || idx}
                            className={`p-3 rounded border transition-all cursor-pointer ${selectedCompanyForTopBranches === company.name
                              ? 'bg-gray-50 border-orange-500 shadow-md'
                              : 'bg-white border-gray-200 hover:border-gray-300'
                              }`}
                            onClick={() => setSelectedCompanyForTopBranches(
                              selectedCompanyForTopBranches === company.name ? null : company.name
                            )}
                          >
                            <div className="flex items-center gap-2 mb-2">
                              <span className={`text-lg font-bold ${idx === 0 ? 'text-gray-900' :
                                idx === 1 ? 'text-gray-400' :
                                  idx === 2 ? 'text-gray-900' : 'text-gray-400'
                                }`}>
                                #{idx + 1}
                              </span>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-gray-900 truncate">{company.name}</p>
                              </div>
                            </div>
                            <div className="space-y-1">
                              <div className="flex justify-between items-center text-xs">
                                <span className="text-gray-600">Sales</span>
                                <span className="font-bold text-gray-900">{formatCurrency(company.revenue)}</span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div
                                  className="bg-gradient-to-r from-orange-500 to-orange-600 h-2 rounded-full transition-all duration-500"
                                  style={{ width: `${barWidth}%` }}
                                ></div>
                              </div>
                              <div className="flex justify-between items-center text-xs text-gray-500">
                                <span>{company.salesCount} sales</span>
                                <span>Avg/Sale: {formatCurrency(company.averageOrderValue)}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="text-center py-6 text-gray-400">
                        <Users size={24} className="mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No company data for this period</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Top Branches */}
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <Building size={16} className="text-gray-900" />
                    Top Branches ({performanceView === 'overall'
                      ? 'All Time'
                      : performanceView === 'year'
                        ? performanceYear
                        : `${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][performanceMonth - 1]} ${performanceYear}`
                    })
                    {selectedCompanyForTopBranches && (
                      <span className="text-xs font-normal text-gray-900">
                        - {selectedCompanyForTopBranches}
                      </span>
                    )}
                  </h4>
                  <div className="space-y-2 max-h-[400px] overflow-y-auto">
                    {(() => {
                      let branchesToShow = performanceData.topBranches || [];

                      if (selectedCompanyForTopBranches) {
                        const branchRevenue = {};
                        const salesByBranch = {};

                        sales
                          .filter(sale => isSaleInPeriod(sale) && sale.company?.companyName === selectedCompanyForTopBranches)
                          .forEach(sale => {
                            const scopedItems = (sale.items || []).filter(itemMatchesSelection);
                            if (scopedItems.length === 0) return;

                            const branchId = sale.branch?.id;
                            if (!branchRevenue[branchId]) {
                              branchRevenue[branchId] = {
                                id: branchId,
                                name: sale.branch?.branchName || 'Unknown Branch',
                                code: sale.branch?.branchCode || 'N/A',
                                revenue: 0,
                                salesCount: 0,
                                quantity: 0,
                                averageOrderValue: 0
                              };
                              salesByBranch[branchId] = new Set();
                            }

                            scopedItems.forEach(item => {
                              branchRevenue[branchId].revenue += item.amount || 0;
                              branchRevenue[branchId].quantity += item.quantity || 0;
                            });
                            salesByBranch[branchId].add(sale.id);
                          });

                        Object.keys(branchRevenue).forEach(branchId => {
                          const b = branchRevenue[branchId];
                          b.salesCount = salesByBranch[branchId].size;
                          b.averageOrderValue = b.salesCount > 0 ? b.revenue / b.salesCount : 0;
                        });

                        branchesToShow = Object.values(branchRevenue)
                          .sort((a, b) => b.revenue - a.revenue);
                      }

                      return branchesToShow.length > 0 ? (
                        branchesToShow.map((branch, idx) => {
                          const maxRevenue = branchesToShow.length > 0 ? branchesToShow[0]?.revenue || 1 : 1;
                          const barWidth = (branch.revenue / maxRevenue) * 100;

                          return (
                            <div key={branch.id || idx} className="p-3 bg-white rounded border border-gray-200 hover:border-gray-300 transition-all">
                              <div className="flex items-center gap-2 mb-2">
                                <span className={`text-lg font-bold ${idx === 0 ? 'text-gray-900' :
                                  idx === 1 ? 'text-gray-400' :
                                    idx === 2 ? 'text-gray-900' : 'text-gray-400'
                                  }`}>
                                  #{idx + 1}
                                </span>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-semibold text-gray-900 truncate">{branch.name}</p>
                                  <p className="text-xs text-gray-500">{branch.code} • {branch.salesCount} sales</p>
                                </div>
                              </div>
                              <div className="space-y-2">
                                <div>
                                  <div className="flex justify-between items-center text-xs mb-1">
                                    <span className="text-gray-600">Sales</span>
                                    <span className="font-bold text-gray-900">{formatCurrency(branch.revenue)}</span>
                                  </div>
                                  <div className="w-full bg-gray-200 rounded-full h-2">
                                    <div
                                      className="bg-gradient-to-r from-orange-500 to-orange-600 h-2 rounded-full transition-all duration-500"
                                      style={{ width: `${barWidth}%` }}
                                    ></div>
                                  </div>
                                </div>

                                <div>
                                  <div className="flex justify-between items-center text-xs mb-1">
                                    <span className="text-gray-600">Quantity</span>
                                    <span className="font-bold text-gray-900">{formatNumber(branch.quantity || 0)} units</span>
                                  </div>
                                  <div className="w-full bg-gray-200 rounded-full h-2">
                                    <div
                                      className="bg-gradient-to-r from-orange-500 to-orange-600 h-2 rounded-full transition-all duration-500"
                                      style={{
                                        width: `${(() => {
                                          const maxQuantity = Math.max(...branchesToShow.map(b => b.quantity || 0));
                                          return maxQuantity > 0 ? ((branch.quantity || 0) / maxQuantity * 100) : 0;
                                        })()}%`
                                      }}
                                    ></div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div className="text-center py-6 text-gray-400">
                          <Building size={24} className="mx-auto mb-2 opacity-50" />
                          <p className="text-sm">No branch data for this period</p>
                          {selectedProductId && (
                            <p className="text-xs mt-1">No sales found for this product/variation</p>
                          )}
                        </div>
                      )
                    })()}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductAnalysis;