import React, { useMemo } from 'react';
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
  const filteredTopProducts = useMemo(() => {
    let products = performanceData.topProducts || [];

    if (selectedCategory !== 'all') {
      products = products.filter(product =>
        product.category === selectedCategory
      );
    }

    return products;
  }, [performanceData.topProducts, selectedCategory]);

  const getSelectedProductStats = () => {
    if (!selectedProductId) return null;

    const product = productSalesData.find(p => p.id === selectedProductId);
    if (!product) return null;

    const filteredSales = sales.filter(sale => {
      const statusMatch = sale.status === 'CONFIRMED' || sale.status === 'INVOICED' || sale.status === 'PENDING';

      if (performanceView === 'overall') {
        return statusMatch;
      }

      const saleYear = sale.year || new Date(sale.createdAt || sale.date).getFullYear();
      const saleMonth = sale.month || (new Date(sale.createdAt || sale.date).getMonth() + 1);

      const yearMatch = saleYear === performanceYear;
      const monthMatch = performanceView === 'month' ? saleMonth === performanceMonth : true;

      return statusMatch && yearMatch && monthMatch;
    });

    const transactionsWithProduct = new Set();
    let totalRevenue = 0;
    let totalQuantity = 0;

    filteredSales.forEach(sale => {
      const hasProduct = sale.items?.some(item => {
        const itemVariationId = item.variation?.id || 'base';
        const itemKey = `${item.product?.id}_${itemVariationId}`;
        return itemKey === selectedProductId;
      });

      if (hasProduct) {
        transactionsWithProduct.add(sale.id);

        sale.items?.forEach(item => {
          const itemVariationId = item.variation?.id || 'base';
          const itemKey = `${item.product?.id}_${itemVariationId}`;
          if (itemKey === selectedProductId) {
            totalRevenue += item.amount || 0;
            totalQuantity += item.quantity || 0;
          }
        });
      }
    });

    return {
      totalRevenue,
      totalQuantity,
      transactions: transactionsWithProduct.size,
      avgPerUnit: totalQuantity > 0 ? totalRevenue / totalQuantity : 0
    };
  };

  const getProductChartData = (productKey) => {
    if (!productKey) return null;

    const [productId, variationIdStr] = productKey.split('_');
    const variationId = variationIdStr !== 'base' ? variationIdStr : null;

    const filteredSales = sales.filter(sale => {
      const statusMatch = sale.status === 'CONFIRMED' || sale.status === 'INVOICED' || sale.status === 'PENDING';

      if (performanceView === 'overall') {
        return statusMatch;
      }

      const saleYear = sale.year || new Date(sale.createdAt || sale.date).getFullYear();
      const saleMonth = sale.month || (new Date(sale.createdAt || sale.date).getMonth() + 1);

      const yearMatch = saleYear === performanceYear;
      const monthMatch = performanceView === 'month' ? saleMonth === performanceMonth : true;

      return statusMatch && yearMatch && monthMatch;
    });

    const companyData = {};

    filteredSales.forEach(sale => {
      const companyName = sale.company?.companyName || 'Unknown Company';
      sale.items?.forEach(item => {
        const itemVariationId = item.variation?.id || 'base';
        const itemKey = `${item.product?.id}_${itemVariationId}`;

        if (itemKey === productKey) {
          if (!companyData[companyName]) {
            companyData[companyName] = {
              revenue: 0,
              quantity: 0
            };
          }
          companyData[companyName].revenue += item.amount || 0;
          companyData[companyName].quantity += item.quantity || 0;
        }
      });
    });

    const companies = Object.keys(companyData).sort((a, b) =>
      companyData[b].revenue - companyData[a].revenue
    );

    if (companies.length === 0) return null;

    const labels = companies;
    const salesData = companies.map(company => companyData[company].revenue);
    const quantityData = companies.map(company => companyData[company].quantity);

    return {
      labels,
      datasets: [
        {
          label: 'Sales',
          data: salesData,
          backgroundColor: 'rgba(59, 130, 246, 0.8)',
          borderColor: '#3B82F6',
          borderWidth: 2,
          yAxisID: 'y',
        },
        {
          label: 'Quantity Sold',
          data: quantityData,
          backgroundColor: 'rgba(16, 185, 129, 0.8)',
          borderColor: '#10B981',
          borderWidth: 2,
          yAxisID: 'y1',
        }
      ]
    };
  };

  const getCompanyBranchBreakdown = (companyName) => {
    const product = productSalesData.find(p => p.id === selectedProductId);
    if (!product) return [];

    const [selectedProductIdNum, selectedVariationIdStr] = selectedProductId.split('_');
    const selectedVariationId = selectedVariationIdStr !== 'base' ? selectedVariationIdStr : null;

    const companySales = sales.filter(sale => {
      const statusMatch = sale.status === 'CONFIRMED' || sale.status === 'INVOICED' || sale.status === 'PENDING';
      const companyMatch = sale.company?.companyName === companyName;

      const hasProduct = sale.items?.some(item => {
        const itemProductId = item.product?.id;
        const itemVariationId = item.variation?.id || null;

        if (selectedVariationId) {
          return itemProductId == selectedProductIdNum &&
            itemVariationId == selectedVariationId;
        } else {
          return itemProductId == selectedProductIdNum;
        }
      });
      if (!hasProduct) return false;

      if (performanceView === 'overall') {
        return statusMatch && companyMatch;
      }

      const saleYear = sale.year || new Date(sale.createdAt || sale.date).getFullYear();
      const saleMonth = sale.month || (new Date(sale.createdAt || sale.date).getMonth() + 1);

      const yearMatch = saleYear === performanceYear;
      const monthMatch = performanceView === 'month' ? saleMonth === performanceMonth : true;

      return statusMatch && companyMatch && yearMatch && monthMatch;
    });

    const branchData = {};
    const salesByBranch = {};

    companySales.forEach(sale => {
      const branchName = sale.branch?.branchName || 'Unknown Branch';

      sale.items?.forEach(item => {
        const itemProductId = item.product?.id;
        const itemVariationId = item.variation?.id || null;

        let matches = false;
        if (selectedVariationId) {
          matches = itemProductId == selectedProductIdNum &&
            itemVariationId == selectedVariationId;
        } else {
          matches = itemProductId == selectedProductIdNum;
        }

        if (matches) {
          if (!branchData[branchName]) {
            branchData[branchName] = {
              branchName: branchName,
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
        }
      });
    });

    Object.keys(branchData).forEach(branchName => {
      branchData[branchName].salesCount = salesByBranch[branchName].size;
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
                <Target className="text-green-600" size={18} />
                Top Performing Products
              </h3>

              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
                  <button
                    onClick={() => setPerformanceView('overall')}
                    className={`px-3 py-1 text-xs rounded ${performanceView === 'overall'
                      ? 'bg-white text-blue-600 font-semibold shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                      }`}
                  >
                    Overall
                  </button>
                  <button
                    onClick={() => setPerformanceView('year')}
                    className={`px-3 py-1 text-xs rounded ${performanceView === 'year'
                      ? 'bg-white text-blue-600 font-semibold shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                      }`}
                  >
                    Year
                  </button>
                  <button
                    onClick={() => setPerformanceView('month')}
                    className={`px-3 py-1 text-xs rounded ${performanceView === 'month'
                      ? 'bg-white text-blue-600 font-semibold shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                      }`}
                  >
                    Month
                  </button>
                </div>

                {performanceView !== 'overall' && (
                  <select
                    value={performanceYear}
                    onChange={(e) => setPerformanceYear(parseInt(e.target.value))}
                    className="px-2 py-1 text-xs border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                    className="px-2 py-1 text-xs border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                      className="px-2 py-1 text-xs border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none pr-6"
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
            <div className="mb-3 p-2 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-blue-700">
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
                <div className="mb-3 p-2 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-blue-700">{selectedCategory}</span>
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
                    className={`p-3 rounded-lg transition-all cursor-pointer border ${selectedProductId === product.id
                      ? 'bg-blue-50 border-blue-500 shadow-sm'
                      : 'bg-gray-50 border-gray-200 hover:bg-gray-100 hover:border-gray-300'
                      }`}
                    onClick={() => {
                      setSelectedProductId(product.id);
                      setSelectedCompanyForBranches(null);
                    }}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`text-xl font-bold flex-shrink-0 ${idx === 0 ? 'text-yellow-600' :
                        idx === 1 ? 'text-gray-400' :
                          idx === 2 ? 'text-amber-800' : 'text-gray-400'
                        }`}>
                        #{idx + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium ${selectedProductId === product.id ? 'text-blue-700' : 'text-gray-900'
                          }`}>
                          {product.name}
                        </p>
                        {product.category && product.category !== 'Uncategorized' && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-gray-100 text-gray-600 mt-1">
                            {product.category}
                          </span>
                        )}
                        <p className="text-xs text-gray-500 mt-1">
                          Ranked by quantity sold
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mt-3">
                      <div>
                        <div className="flex items-baseline gap-1">
                          <h4 className="text-green-600 font-bold text-m">₱</h4>
                          <span className="text-xs text-gray-600">Sales</span>
                        </div>
                        <p className="text-sm font-bold text-green-600 mt-1">
                          {formatCurrency(product.revenue)}
                        </p>
                      </div>
                      <div>
                        <div className="flex items-baseline gap-1">
                          <Package size={12} className="text-purple-500" />
                          <span className="text-xs text-gray-600">Quantity</span>
                        </div>
                        <p className="text-sm font-bold text-purple-600 mt-1">
                          {product.quantity} units
                        </p>
                      </div>
                    </div>

                    <div className="mt-2 pt-2 border-t border-gray-200">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500">Avg/Unit</span>
                        <span className="text-xs font-semibold text-blue-600">
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
                      className="mt-2 text-xs text-blue-600 hover:text-blue-700"
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
                              className="flex items-center justify-between p-2 hover:bg-gray-50 rounded cursor-pointer"
                              onClick={() => setSelectedCategory(category)}
                            >
                              <span className="text-xs text-gray-600">{category}</span>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-semibold text-green-600">
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
                <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                  <BarChart2 className="text-blue-600" size={18} />
                  Product Analysis
                  {selectedProductId && (
                    <>
                      <span className="text-xs text-gray-500">
                        - {productSalesData.find(p => p.id === selectedProductId)?.name}
                      </span>
                      <span className="text-xs text-blue-600">
                        ({performanceView === 'overall'
                          ? 'All Time'
                          : performanceView === 'year'
                            ? performanceYear
                            : `${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][performanceMonth - 1]} ${performanceYear}`
                        })
                      </span>
                    </>
                  )}
                </h3>
              </div>
            </div>

            {selectedProductId ? (
              <>
                {/* Product Summary */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-3 mb-3 border border-blue-200">
                  <div className="text-xs font-semibold text-blue-700 mb-2 text-center">
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
                            <p className="text-sm font-bold text-blue-700">
                              {formatCurrency(stats.totalRevenue)}
                            </p>
                          </div>
                          <div className="text-center">
                            <p className="text-xs text-gray-600">Total Quantity</p>
                            <p className="text-sm font-bold text-green-700">
                              {formatNumber(stats.totalQuantity)}
                            </p>
                          </div>
                          <div className="text-center">
                            <p className="text-xs text-gray-600">Transactions</p>
                            <p className="text-sm font-bold text-purple-700">
                              {formatNumber(stats.transactions)}
                            </p>
                          </div>
                          <div className="text-center">
                            <p className="text-xs text-gray-600">Avg/Unit</p>
                            <p className="text-sm font-bold text-amber-700">
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
                      const chartData = getProductChartData(selectedProductId);
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
                                  color: '#3B82F6',
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
                                  color: '#10B981',
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
                    <div className="flex items-center justify-between bg-gradient-to-r from-purple-50 to-blue-50 p-2 rounded-lg border border-purple-200">
                      <div className="flex items-center gap-2">
                        <Building className="text-purple-600" size={16} />
                        <div>
                          <h4 className="text-sm font-bold text-gray-900">{selectedCompanyForBranches}</h4>
                          <p className="text-xs text-gray-600">Branch Breakdown</p>
                        </div>
                      </div>
                      <button
                        onClick={() => setSelectedCompanyForBranches(null)}
                        className="px-2 py-1 bg-white border border-gray-300 rounded text-xs hover:bg-gray-50 transition-colors flex items-center gap-1"
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
                            <div key={idx} className="bg-gray-50 rounded-lg p-2 border border-gray-200">
                              <div className="flex items-center gap-2 mb-2">
                                <span className={`text-base font-bold flex-shrink-0 ${idx === 0 ? 'text-yellow-600' :
                                  idx === 1 ? 'text-gray-400' :
                                    idx === 2 ? 'text-amber-800' : 'text-gray-400'
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
                                      className="bg-gradient-to-r from-green-500 to-green-600 h-3 rounded-full transition-all duration-500"
                                      style={{ width: `${salesBarWidth}%` }}
                                    ></div>
                                  </div>
                                  <span className="text-xs font-bold text-green-600 w-16 text-right">{formatCurrency(branch.sales)}</span>
                                </div>
                              </div>

                              <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-600 w-10 flex-shrink-0">Qty</span>
                                <div className="flex-1 flex items-center gap-1">
                                  <div className="flex-1 bg-gray-200 rounded-full h-3">
                                    <div
                                      className="bg-gradient-to-r from-purple-500 to-purple-600 h-3 rounded-full transition-all duration-500"
                                      style={{ width: `${quantityBarWidth}%` }}
                                    ></div>
                                  </div>
                                  <span className="text-xs font-bold text-purple-600 w-16 text-right">{formatNumber(branch.quantity)}</span>
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
                    <Users size={16} className="text-blue-600" />
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
                            className={`p-3 rounded-lg border transition-all cursor-pointer ${selectedCompanyForTopBranches === company.name
                              ? 'bg-blue-50 border-blue-500 shadow-md'
                              : 'bg-gray-50 border-gray-200 hover:border-blue-300'
                              }`}
                            onClick={() => setSelectedCompanyForTopBranches(
                              selectedCompanyForTopBranches === company.name ? null : company.name
                            )}
                          >
                            <div className="flex items-center gap-2 mb-2">
                              <span className={`text-lg font-bold ${idx === 0 ? 'text-yellow-600' :
                                idx === 1 ? 'text-gray-400' :
                                  idx === 2 ? 'text-amber-800' : 'text-gray-400'
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
                                <span className="font-bold text-green-600">{formatCurrency(company.revenue)}</span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div
                                  className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full transition-all duration-500"
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
                    <Building size={16} className="text-purple-600" />
                    Top Branches ({performanceView === 'overall'
                      ? 'All Time'
                      : performanceView === 'year'
                        ? performanceYear
                        : `${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][performanceMonth - 1]} ${performanceYear}`
                    })
                    {selectedCompanyForTopBranches && (
                      <span className="text-xs font-normal text-blue-600">
                        - {selectedCompanyForTopBranches}
                      </span>
                    )}
                  </h4>
                  <div className="space-y-2 max-h-[400px] overflow-y-auto">
                    {(() => {
                      let branchesToShow = performanceData.topBranches || [];

                      if (selectedCompanyForTopBranches) {
                        let selectedProductIdNum = null;
                        let selectedVariationId = null;

                        if (selectedProductId) {
                          const [productIdNum, variationIdStr] = selectedProductId.split('_');
                          selectedProductIdNum = productIdNum;
                          selectedVariationId = variationIdStr !== 'base' ? variationIdStr : null;
                        }

                        const companySales = sales.filter(sale => {
                          const statusMatch = sale.status === 'CONFIRMED' || sale.status === 'INVOICED' || sale.status === 'PENDING';
                          const companyMatch = sale.company?.companyName === selectedCompanyForTopBranches;

                          if (selectedProductId) {
                            const hasProduct = sale.items?.some(item => {
                              const itemProductId = item.product?.id;
                              const itemVariationId = item.variation?.id || null;

                              if (selectedVariationId) {
                                return itemProductId == selectedProductIdNum &&
                                  itemVariationId == selectedVariationId;
                              } else {
                                return itemProductId == selectedProductIdNum;
                              }
                            });
                            if (!hasProduct) return false;
                          }

                          if (performanceView === 'overall') {
                            return statusMatch && companyMatch;
                          }

                          const saleYear = sale.year || new Date(sale.createdAt || sale.date).getFullYear();
                          const saleMonth = sale.month || (new Date(sale.createdAt || sale.date).getMonth() + 1);

                          const yearMatch = saleYear === performanceYear;
                          const monthMatch = performanceView === 'month' ? saleMonth === performanceMonth : true;

                          return statusMatch && companyMatch && yearMatch && monthMatch;
                        });

                        const branchRevenue = {};
                        const salesByBranch = {};

                        companySales.forEach(sale => {
                          const branchId = sale.branch?.id;
                          const branchName = sale.branch?.branchName || 'Unknown Branch';
                          const branchCode = sale.branch?.branchCode || 'N/A';

                          if (!branchRevenue[branchId]) {
                            branchRevenue[branchId] = {
                              id: branchId,
                              name: branchName,
                              code: branchCode,
                              revenue: 0,
                              salesCount: 0,
                              quantity: 0,
                              averageOrderValue: 0
                            };
                            salesByBranch[branchId] = new Set();
                          }

                          if (selectedProductId) {
                            sale.items?.forEach(item => {
                              const itemProductId = item.product?.id;
                              const itemVariationId = item.variation?.id || null;

                              let matches = false;
                              if (selectedVariationId) {
                                matches = itemProductId == selectedProductIdNum &&
                                  itemVariationId == selectedVariationId;
                              } else {
                                matches = itemProductId == selectedProductIdNum;
                              }

                              if (matches) {
                                branchRevenue[branchId].revenue += item.amount || 0;
                                branchRevenue[branchId].quantity += item.quantity || 0;
                              }
                            });
                            salesByBranch[branchId].add(sale.id);
                          } else {
                            branchRevenue[branchId].revenue += sale.totalAmount || 0;
                            sale.items?.forEach(item => {
                              branchRevenue[branchId].quantity += item.quantity || 0;
                            });
                            salesByBranch[branchId].add(sale.id);
                          }
                        });

                        Object.keys(branchRevenue).forEach(branchId => {
                          branchRevenue[branchId].salesCount = salesByBranch[branchId].size;
                          branchRevenue[branchId].averageOrderValue =
                            branchRevenue[branchId].salesCount > 0
                              ? branchRevenue[branchId].revenue / branchRevenue[branchId].salesCount
                              : 0;
                        });

                        branchesToShow = Object.values(branchRevenue)
                          .sort((a, b) => b.revenue - a.revenue);
                      }

                      return branchesToShow.length > 0 ? (
                        branchesToShow.map((branch, idx) => {
                          const maxRevenue = branchesToShow.length > 0 ? branchesToShow[0]?.revenue || 1 : 1;
                          const barWidth = (branch.revenue / maxRevenue) * 100;

                          return (
                            <div key={branch.id || idx} className="p-3 bg-gray-50 rounded-lg border border-gray-200 hover:border-purple-300 transition-all">
                              <div className="flex items-center gap-2 mb-2">
                                <span className={`text-lg font-bold ${idx === 0 ? 'text-yellow-600' :
                                  idx === 1 ? 'text-gray-400' :
                                    idx === 2 ? 'text-amber-800' : 'text-gray-400'
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
                                    <span className="font-bold text-green-600">{formatCurrency(branch.revenue)}</span>
                                  </div>
                                  <div className="w-full bg-gray-200 rounded-full h-2">
                                    <div
                                      className="bg-gradient-to-r from-green-500 to-green-600 h-2 rounded-full transition-all duration-500"
                                      style={{ width: `${barWidth}%` }}
                                    ></div>
                                  </div>
                                </div>

                                <div>
                                  <div className="flex justify-between items-center text-xs mb-1">
                                    <span className="text-gray-600">Quantity</span>
                                    <span className="font-bold text-purple-600">{formatNumber(branch.quantity || 0)} units</span>
                                  </div>
                                  <div className="w-full bg-gray-200 rounded-full h-2">
                                    <div
                                      className="bg-gradient-to-r from-purple-500 to-purple-600 h-2 rounded-full transition-all duration-500"
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