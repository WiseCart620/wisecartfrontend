import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import {
  ShoppingCart, Users, TrendingUpIcon,
  TrendingUp, Calendar, Building, UserIcon, Package, Clock, X, ChevronDown, Target, AlertTriangle,
} from 'lucide-react';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend, Filler } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend, Filler);

// Components
import LoadingOverlay from '../../components/common/LoadingOverlay';
import SearchableSelect from '../../components/common/SearchableSelect';
import DashboardHeader from '../../components/dashboard/DashboardHeader';
import DashboardCards from '../../components/dashboard/DashboardCards';
import BusinessInsights from '../../components/dashboard/BusinessInsights';
import SalesTrendChart from '../../components/charts/SalesTrendChart';
import ProductSalesChart from '../../components/charts/ProductSalesChart';
import ProductAnalysis from '../../components/dashboard/ProductAnalysis';
import AlertManagement from '../../components/dashboard/AlertManagement';
import RecentSales from '../../components/dashboard/RecentSales';
import StatusDistribution from '../../components/dashboard/StatusDistribution';

// Utils
import { formatCurrency, formatNumber } from '../../utils/currencyUtils';

const extractArray = (res) => {
  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.data)) return res.data;
  if (Array.isArray(res?.data?.content)) return res.data.content;
  if (Array.isArray(res?.content)) return res.content;
  return [];
};

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalSales: 0,
    activeSales: 0,
    activeRevenue: 0,
    pendingDeliveries: 0,
    lowStock: 0,
    totalCompanies: 0,
    averageOrderValue: 0,
    deliveredOrders: 0,
    conversionRate: 0,
    revenueGrowth: 0,
    topProduct: null,
    salesVelocity: 0,
  });

  const navigate = useNavigate();
  const [sales, setSales] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [branches, setBranches] = useState([]);
  const [products, setProducts] = useState([]);
  const [deliveries, setDeliveries] = useState([]);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedCompany, setSelectedCompany] = useState('all');
  const [selectedBranch, setSelectedBranch] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [recentSales, setRecentSales] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [alerts, setAlerts] = useState([]);
  const [performanceData, setPerformanceData] = useState({
    topProducts: [],
    topBranches: [],
    topCompanies: [],
  });
  const [showInsights, setShowInsights] = useState(false);
  const [businessInsights, setBusinessInsights] = useState([]);
  const [productSalesData, setProductSalesData] = useState([]);
  const [selectedProductId, setSelectedProductId] = useState(null);
  const [availableBranches, setAvailableBranches] = useState([]);
  const [actionLoading, setActionLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [selectedCompanyForBranches, setSelectedCompanyForBranches] = useState(null);
  const [selectedCompanyForTopBranches, setSelectedCompanyForTopBranches] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedCategoryForMonthly, setSelectedCategoryForMonthly] = useState('all');
  const [productCategories, setProductCategories] = useState([]);
  const [performanceYear, setPerformanceYear] = useState(new Date().getFullYear());
  const [performanceView, setPerformanceView] = useState('year');
  const [performanceMonth, setPerformanceMonth] = useState(new Date().getMonth() + 1);

  useEffect(() => {
    loadStats();
    loadAlerts();
  }, []);

  useEffect(() => {
    if (sales.length > 0) {
      loadPerformance();
      generateInsights();
      const productAnalysis = getProductSalesAnalysis(sales);
      setProductSalesData(productAnalysis);
      if (productAnalysis.length > 0 && !selectedProductId) {
        setSelectedProductId(productAnalysis[0].id);
      }
    }
  }, [sales, selectedYear, selectedCompany, selectedBranch, performanceYear, performanceView, performanceMonth, selectedProductId]);

  const loadStats = async () => {
    try {
      setDashboardLoading(true);

      const salesRes = await api.get('/sales/all?page=0&size=200&sort=createdAt,desc');
      const salesData = extractArray(salesRes);
      setSales(salesData);

      const sortedSales = [...salesData]
        .sort((a, b) => new Date(b.createdAt || b.date || 0) - new Date(a.createdAt || a.date || 0))
        .slice(0, 10);
      setRecentSales(sortedSales);

      // Step 2 — fast endpoints together (none are huge)
      const [productsRes, companiesRes, branchesRes] = await Promise.all([
        api.get('/products'),
        api.get('/companies'),
        api.get('/branches'),
      ]);

      const productsData = extractArray(productsRes);
      const companiesData = extractArray(companiesRes);
      const branchesData = extractArray(branchesRes);

      setProducts(productsData);
      setCompanies(companiesData);
      setBranches(branchesData);
      setDashboardLoading(false); // UI is ready now

      // Step 3 — deliveries loads in background, doesn't block UI
      api.get('/deliveries?page=0&size=50&sort=createdAt,desc')
        .then(res => {
          const deliveriesData = extractArray(res);
          setDeliveries(deliveriesData);
          const pendingDeliveries = deliveriesData.filter(d => d.status === 'PENDING').length;
          const deliveredOrders = deliveriesData.filter(d => d.status === 'DELIVERED').length;
          setStats(prev => ({ ...prev, pendingDeliveries, deliveredOrders }));
        })
        .catch(() => { });

      const activeSales = salesData.filter(s =>
        s.status === 'CONFIRMED' || s.status === 'INVOICED' || s.status === 'PENDING'
      );
      const activeRevenue = activeSales.reduce((sum, s) => sum + (s.totalAmount || 0), 0);
      const averageOrderValue = activeSales.length > 0 ? activeRevenue / activeSales.length : 0;

      const totalLeads = companiesData.length * 2;
      const conversionRate = salesData.length > 0
        ? (activeSales.length / totalLeads * 100) : 0;

      const currentMonth = new Date().getMonth();
      const thisMonthRevenue = salesData
        .filter(s => {
          const d = new Date(s.createdAt || s.date);
          return d.getMonth() === currentMonth && (s.status === 'CONFIRMED' || s.status === 'INVOICED');
        })
        .reduce((sum, s) => sum + (s.totalAmount || 0), 0);

      const prevMonthRevenue = salesData
        .filter(s => {
          const d = new Date(s.createdAt || s.date);
          return d.getMonth() === (currentMonth - 1 + 12) % 12 && (s.status === 'CONFIRMED' || s.status === 'INVOICED');
        })
        .reduce((sum, s) => sum + (s.totalAmount || 0), 0);

      const revenueGrowth = prevMonthRevenue > 0
        ? ((thisMonthRevenue - prevMonthRevenue) / prevMonthRevenue * 100)
        : thisMonthRevenue > 0 ? 100 : 0;

      const salesVelocity = salesData.filter(s => {
        const daysDiff = (new Date() - new Date(s.createdAt || s.date)) / (1000 * 60 * 60 * 24);
        return daysDiff <= 30 && (s.status === 'CONFIRMED' || s.status === 'INVOICED');
      }).length / 30;

      const productAnalysis = getProductSalesAnalysis(salesData);
      setProductSalesData(productAnalysis);

      let topProduct = null;
      if (productAnalysis.length > 0) {
        topProduct = {
          name: productAnalysis[0].name,
          revenue: productAnalysis[0].totalRevenue,
          quantity: productAnalysis[0].totalQuantity
        };
        setSelectedProductId(productAnalysis[0].id);
      }

      const availableYears = [...new Set(salesData.map(s => s.year || new Date(s.createdAt || s.date).getFullYear()))];
      if (availableYears.length > 0 && !availableYears.includes(performanceYear)) {
        setPerformanceYear(Math.max(...availableYears));
      }
      if (availableYears.length > 0 && !availableYears.includes(selectedYear)) {
        setSelectedYear(Math.max(...availableYears));
      }

      setStats(prev => ({
        ...prev,
        totalSales: salesData.length,
        activeSales: activeSales.length,
        activeRevenue,
        lowStock: productsData.filter(p => p.quantity < 10).length,
        totalCompanies: companiesData.length,
        averageOrderValue: parseFloat(averageOrderValue.toFixed(2)),
        conversionRate: parseFloat(conversionRate.toFixed(1)),
        revenueGrowth: parseFloat(revenueGrowth.toFixed(1)),
        topProduct,
        salesVelocity: parseFloat(salesVelocity.toFixed(2)),
      }));

    } catch (err) {
      console.error('Failed to load dashboard data', err);
    } finally {
      setDashboardLoading(false);
    }
  };

  const loadAlerts = async () => {
    try {
      const alertsRes = await api.get('/alerts');
      if (alertsRes.success && alertsRes.data) {
        setAlerts(alertsRes.data || []);
      } else {
        setAlerts([]);
      }
    } catch (err) {
      console.error('Failed to load alerts', err);
      setAlerts([]);
    }
  };

  const getMonthlySalesData = () => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthlyData = months.map((month, index) => ({
      month,
      monthNumber: index + 1,
      activeRevenue: 0,
      count: 0
    }));

    const filteredSales = sales.filter(sale => {
      const saleYear = sale.year || new Date(sale.createdAt || sale.date).getFullYear();
      const yearMatch = saleYear === selectedYear;
      const statusMatch = (sale.status === 'CONFIRMED' || sale.status === 'INVOICED' || sale.status === 'PENDING');
      const companyMatch = selectedCompany === 'all' || sale.company?.companyName === selectedCompany;
      const branchMatch = selectedBranch === 'all' || sale.branch?.branchName === selectedBranch;

      return yearMatch && statusMatch && companyMatch && branchMatch;
    });

    filteredSales.forEach(sale => {
      const monthIndex = sale.month ? sale.month - 1 : new Date(sale.createdAt || sale.date).getMonth();
      if (monthIndex >= 0 && monthIndex < 12) {
        const amount = sale.totalAmount || 0;
        monthlyData[monthIndex].count += 1;
        monthlyData[monthIndex].activeRevenue += amount;
      }
    });

    return monthlyData;
  };

  const chartData = useMemo(() => {
    const data = getMonthlySalesData();
    return {
      labels: data.map(d => d.month),
      datasets: [
        {
          label: 'Active Revenue',
          data: data.map(d => d.activeRevenue),
          borderColor: '#10B981',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          borderWidth: 3,
          tension: 0.4,
          fill: true,
          pointBackgroundColor: '#10B981',
          pointBorderColor: '#ffffff',
          pointBorderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 6,
        }
      ]
    };
  }, [sales, selectedYear, selectedCompany, selectedBranch]);

  const monthlySalesData = getMonthlySalesData();
  const totalAlerts = alerts.length;

  const loadPerformance = () => {
    try {
      const filteredSales = sales.filter(sale => {
        const statusMatch = sale.status === 'CONFIRMED' || sale.status === 'INVOICED' || sale.status === 'PENDING';
        if (performanceView === 'overall') {
          return statusMatch;
        }

        const saleYear = sale.year || new Date(sale.createdAt || sale.date).getFullYear();
        const saleMonth = sale.month || (new Date(sale.createdAt || sale.date).getMonth() + 1);

        const yearMatch = performanceView === 'overall' ? true : saleYear === performanceYear;
        const monthMatch = performanceView === 'month' ? saleMonth === performanceMonth : true;

        return yearMatch && monthMatch && statusMatch;
      });

      const productPerformance = {};
      filteredSales.forEach(sale => {
        if (sale.status === 'CONFIRMED' || sale.status === 'INVOICED' || sale.status === 'PENDING') {
          sale.items?.forEach(item => {
            const variationId = item.variation?.id || 'base';
            const uniqueKey = `${item.product?.id}_${variationId}`;

            const variationName = item.variation?.combinationDisplay ||
              item.variation?.variationValue ||
              (variationId !== 'base' ? 'Default Variation' : null);

            const displayName = variationId !== 'base' && variationName
              ? `${item.product?.productName || 'Unknown Product'} (${variationName})`
              : item.product?.productName || 'Unknown Product';

            if (!productPerformance[uniqueKey]) {
              const fullProduct = products.find(p => p.id === item.product?.id);
              productPerformance[uniqueKey] = {
                id: uniqueKey,
                productId: item.product?.id,
                variationId: variationId !== 'base' ? variationId : null,
                name: displayName,
                baseProductName: item.product?.productName || 'Unknown Product',
                variationName: variationName,
                category: fullProduct?.category || item.product?.category || 'Uncategorized',
                revenue: 0,
                quantity: 0,
                margin: item.product?.margin || 0,
              };
            }
            productPerformance[uniqueKey].revenue += item.amount || 0;
            productPerformance[uniqueKey].quantity += item.quantity || 0;
          });
        }
      });

      const topProducts = Object.values(productPerformance)
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 10);

      const branchPerformance = {};
      filteredSales.forEach(sale => {
        if (sale.status === 'CONFIRMED' || sale.status === 'INVOICED' || sale.status === 'PENDING') {
          let hasSelectedProduct = !selectedProductId;

          if (selectedProductId) {
            const [selectedProductIdNum, selectedVariationIdStr] = selectedProductId.split('_');
            const selectedVariationId = selectedVariationIdStr !== 'base' ? selectedVariationIdStr : null;

            hasSelectedProduct = sale.items?.some(item => {
              const itemProductId = item.product?.id;
              const itemVariationId = item.variation?.id || null;

              if (selectedVariationId) {
                return itemProductId == selectedProductIdNum &&
                  itemVariationId == selectedVariationId;
              } else {
                return itemProductId == selectedProductIdNum;
              }
            });
          }

          if (!hasSelectedProduct) return;

          const key = sale.branch?.id;
          if (!branchPerformance[key]) {
            branchPerformance[key] = {
              id: key,
              name: sale.branch?.branchName || 'Unknown Branch',
              code: sale.branch?.branchCode || 'N/A',
              revenue: 0,
              salesCount: 0,
              quantity: 0,
              averageOrderValue: 0,
            };
          }

          if (selectedProductId) {
            const [selectedProductIdNum, selectedVariationIdStr] = selectedProductId.split('_');
            const selectedVariationId = selectedVariationIdStr !== 'base' ? selectedVariationIdStr : null;

            sale.items?.forEach(item => {
              const itemProductId = item.product?.id;
              const itemVariationId = item.variation?.id || null;

              if (selectedVariationId) {
                if (itemProductId == selectedProductIdNum && itemVariationId == selectedVariationId) {
                  branchPerformance[key].revenue += item.amount || 0;
                  branchPerformance[key].quantity += item.quantity || 0;
                }
              } else {
                if (itemProductId == selectedProductIdNum) {
                  branchPerformance[key].revenue += item.amount || 0;
                  branchPerformance[key].quantity += item.quantity || 0;
                }
              }
            });
            branchPerformance[key].salesCount += 1;
          } else {
            branchPerformance[key].revenue += sale.totalAmount || 0;
            branchPerformance[key].salesCount += 1;
            sale.items?.forEach(item => {
              branchPerformance[key].quantity += item.quantity || 0;
            });
          }

          branchPerformance[key].averageOrderValue =
            branchPerformance[key].salesCount > 0
              ? branchPerformance[key].revenue / branchPerformance[key].salesCount
              : 0;
        }
      });

      const topBranches = Object.values(branchPerformance)
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10);

      const companyPerformance = {};
      filteredSales.forEach(sale => {
        if (sale.status === 'CONFIRMED' || sale.status === 'INVOICED' || sale.status === 'PENDING') {
          let hasSelectedProduct = !selectedProductId;

          if (selectedProductId) {
            const [selectedProductIdNum, selectedVariationIdStr] = selectedProductId.split('_');
            const selectedVariationId = selectedVariationIdStr !== 'base' ? selectedVariationIdStr : null;

            hasSelectedProduct = sale.items?.some(item => {
              const itemProductId = item.product?.id;
              const itemVariationId = item.variation?.id || null;

              if (selectedVariationId) {
                return itemProductId == selectedProductIdNum &&
                  itemVariationId == selectedVariationId;
              } else {
                return itemProductId == selectedProductIdNum;
              }
            });
          }

          if (!hasSelectedProduct) return;

          const key = sale.company?.id;
          if (!companyPerformance[key]) {
            companyPerformance[key] = {
              id: key,
              name: sale.company?.companyName || 'Unknown Company',
              revenue: 0,
              salesCount: 0,
              averageOrderValue: 0,
            };
          }

          if (selectedProductId) {
            const [selectedProductIdNum, selectedVariationIdStr] = selectedProductId.split('_');
            const selectedVariationId = selectedVariationIdStr !== 'base' ? selectedVariationIdStr : null;

            sale.items?.forEach(item => {
              const itemProductId = item.product?.id;
              const itemVariationId = item.variation?.id || null;

              if (selectedVariationId) {
                if (itemProductId == selectedProductIdNum && itemVariationId == selectedVariationId) {
                  companyPerformance[key].revenue += item.amount || 0;
                }
              } else {
                if (itemProductId == selectedProductIdNum) {
                  companyPerformance[key].revenue += item.amount || 0;
                }
              }
            });
            companyPerformance[key].salesCount += 1;
          } else {
            companyPerformance[key].revenue += sale.totalAmount || 0;
            companyPerformance[key].salesCount += 1;
          }

          companyPerformance[key].averageOrderValue =
            companyPerformance[key].salesCount > 0
              ? companyPerformance[key].revenue / companyPerformance[key].salesCount
              : 0;
        }
      });

      const topCompanies = Object.values(companyPerformance)
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10);

      setPerformanceData({ topProducts, topBranches, topCompanies });
    } catch (err) {
      console.error('Failed to load performance data', err);
    }
  };

  const getProductSalesAnalysis = (salesOverride) => {
    const productAnalysis = {};
    const salesSource = salesOverride || sales;

    const filteredSales = sales.filter(sale => {
      const statusMatch = sale.status === 'CONFIRMED' || sale.status === 'INVOICED' || sale.status === 'PENDING';

      if (performanceView === 'overall') {
        return statusMatch;
      }

      const saleYear = sale.year || new Date(sale.createdAt || sale.date).getFullYear();
      const saleMonth = sale.month || (new Date(sale.createdAt || sale.date).getMonth() + 1);

      const yearMatch = performanceView === 'overall' ? true : saleYear === performanceYear;
      const monthMatch = performanceView === 'month' ? saleMonth === performanceMonth : true;

      return yearMatch && monthMatch && statusMatch;
    });

    filteredSales.forEach(sale => {
      sale.items?.forEach(item => {
        const variationId = item.variation?.id || 'base';
        const productId = item.product?.id;
        const uniqueKey = `${productId}_${variationId}`;

        const productName = item.product?.productName || 'Unknown Product';
        const variationName = item.variation?.combinationDisplay ||
          item.variation?.variationValue ||
          (variationId !== 'base' ? 'Default Variation' : null);

        const displayName = variationId !== 'base' && variationName
          ? `${productName} (${variationName})`
          : productName;

        const branchName = sale.branch?.branchName || 'Unknown Branch';
        const companyName = sale.company?.companyName || 'Unknown Company';

        let month, year;
        if (sale.month && sale.year) {
          const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
          month = monthNames[sale.month - 1];
          year = sale.year;
        } else {
          const saleDate = new Date(sale.createdAt || sale.date);
          month = saleDate.toLocaleString('default', { month: 'short' });
          year = saleDate.getFullYear();
        }
        const monthYear = `${month} ${year}`;

        if (!productAnalysis[uniqueKey]) {
          const fullProduct = products.find(p => p.id === productId);
          productAnalysis[uniqueKey] = {
            id: uniqueKey,
            productId: productId,
            variationId: variationId !== 'base' ? variationId : null,
            name: displayName,
            baseProductName: productName,
            variationName: variationName,
            category: fullProduct?.category || 'Uncategorized',
            totalRevenue: 0,
            totalQuantity: 0,
            byMonth: {},
            byBranch: {},
            byCompany: {},
            salesCount: 0
          };
        }

        const product = productAnalysis[uniqueKey];
        product.totalRevenue += item.amount || 0;
        product.totalQuantity += item.quantity || 0;
        product.salesCount += 1;

        if (!product.byMonth[monthYear]) {
          product.byMonth[monthYear] = {
            revenue: 0,
            quantity: 0,
            count: 0
          };
        }
        product.byMonth[monthYear].revenue += item.amount || 0;
        product.byMonth[monthYear].quantity += item.quantity || 0;
        product.byMonth[monthYear].count += 1;

        if (!product.byBranch[branchName]) {
          product.byBranch[branchName] = {
            revenue: 0,
            quantity: 0,
            count: 0
          };
        }
        product.byBranch[branchName].revenue += item.amount || 0;
        product.byBranch[branchName].quantity += item.quantity || 0;
        product.byBranch[branchName].count += 1;

        if (!product.byCompany[companyName]) {
          product.byCompany[companyName] = {
            revenue: 0,
            quantity: 0,
            count: 0
          };
        }
        product.byCompany[companyName].revenue += item.amount || 0;
        product.byCompany[companyName].quantity += item.quantity || 0;
        product.byCompany[companyName].count += 1;
      });
    });

    return Object.values(productAnalysis)
      .sort((a, b) => b.totalRevenue - a.totalRevenue);
  };

  const generateInsights = () => {
    const insights = [];
    const now = new Date();
    const last7DaysSales = sales.filter(sale => {
      const saleDate = new Date(sale.createdAt || sale.date);
      const daysDiff = (now - saleDate) / (1000 * 60 * 60 * 24);
      return daysDiff <= 7 && (sale.status === 'CONFIRMED' || sale.status === 'INVOICED');
    });

    const salesPerDay = last7DaysSales.length / 7;
    if (salesPerDay > 5) {
      insights.push({
        type: 'positive',
        title: 'High Sales Velocity',
        message: `Averaging ${salesPerDay.toFixed(1)} sales per day last week`,
        icon: TrendingUpIcon,
      });
    }

    const topProduct = performanceData.topProducts[0];
    if (topProduct && topProduct.revenue > 10000) {
      insights.push({
        type: 'info',
        title: 'Best Selling Product',
        message: `${topProduct.name} generated ${formatCurrency(topProduct.revenue)}`,
        icon: Package,
      });
    }

    if (performanceData.topBranches.length > 0) {
      const bestBranch = performanceData.topBranches[0];
      const worstBranch = performanceData.topBranches[performanceData.topBranches.length - 1];

      if (bestBranch && worstBranch && bestBranch.revenue > worstBranch.revenue * 3) {
        insights.push({
          type: 'warning',
          title: 'Branch Performance Gap',
          message: `${bestBranch.name} is outperforming ${worstBranch.name} by ${formatCurrency(bestBranch.revenue - worstBranch.revenue)}`,
          icon: AlertTriangle,
        });
      }
    }

    const morningSales = sales.filter(sale => {
      const saleDate = new Date(sale.createdAt || sale.date);
      return saleDate.getHours() < 12;
    }).length;

    const afternoonSales = sales.filter(sale => {
      const saleDate = new Date(sale.createdAt || sale.date);
      return saleDate.getHours() >= 12;
    }).length;

    if (morningSales > afternoonSales * 1.5) {
      insights.push({
        type: 'info',
        title: 'Morning Sales Peak',
        message: `${morningSales} sales in AM vs ${afternoonSales} in PM`,
        icon: Clock,
      });
    }

    setBusinessInsights(insights);
  };

  useEffect(() => {
    if (selectedCompany === 'all') {
      setAvailableBranches(branches);
      setSelectedBranch('all');
    } else {
      const companyBranches = [...new Set(
        sales
          .filter(s => s.company?.companyName === selectedCompany)
          .map(s => s.branch?.branchName)
          .filter(Boolean)
      )];

      const filteredBranches = branches.filter(b =>
        companyBranches.includes(b.branchName)
      );

      setAvailableBranches(filteredBranches);
      setSelectedBranch('all');
    }
  }, [selectedCompany, branches, sales]);

  useEffect(() => {
    if (products.length > 0) {
      const categories = [...new Set(
        products
          .filter(p => p.category && p.category.trim() !== '')
          .map(p => p.category)
          .sort()
      )];
      setProductCategories(categories);
    }
  }, [products]);

  return (
    <>
      <LoadingOverlay show={actionLoading && !!loadingMessage} message={loadingMessage} />
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 overflow-x-hidden">
        <div className="w-full max-w-[1600px] mx-auto px-3 sm:px-4 md:px-6 py-3 sm:py-4 md:py-6">
          <div className="space-y-4 sm:space-y-6">
            {/* Header Section */}
            <div className="mb-3 sm:mb-6 flex items-center justify-between">
              <div>
                <h1 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-gray-900">Dashboard</h1>
                <p className="text-xs sm:text-sm text-gray-600 mt-0.5 sm:mt-1">Overview of your business performance</p>
              </div>
              {dashboardLoading && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  <span className="text-xs text-blue-600 font-medium">Loading data...</span>
                </div>
              )}
            </div>

            <DashboardHeader
              showInsights={showInsights}
              setShowInsights={setShowInsights}
              businessInsights={businessInsights}
              loadStats={loadStats}
              showNotifications={showNotifications}
              setShowNotifications={setShowNotifications}
              alerts={alerts}
              isLoading={dashboardLoading}
            />

            {/* Stats Cards */}
            <DashboardCards stats={stats} totalAlerts={totalAlerts} isLoading={dashboardLoading} />

            {/* Business Insights */}
            <BusinessInsights
              insights={businessInsights}
              showInsights={showInsights}
              setShowInsights={setShowInsights}
            />

            {/* Product Analysis Section */}
            <ProductAnalysis
              performanceData={performanceData}
              productSalesData={productSalesData}
              selectedProductId={selectedProductId}
              setSelectedProductId={setSelectedProductId}
              selectedCategory={selectedCategory}
              setSelectedCategory={setSelectedCategory}
              productCategories={productCategories}
              performanceYear={performanceYear}
              setPerformanceYear={setPerformanceYear}
              performanceView={performanceView}
              setPerformanceView={setPerformanceView}
              performanceMonth={performanceMonth}
              setPerformanceMonth={setPerformanceMonth}
              availableYears={[...new Set(sales.map(s => s.year || new Date(s.createdAt || s.date).getFullYear()))]}
              products={products}
              sales={sales}
              selectedCompanyForBranches={selectedCompanyForBranches}
              setSelectedCompanyForBranches={setSelectedCompanyForBranches}
              selectedCompanyForTopBranches={selectedCompanyForTopBranches}
              setSelectedCompanyForTopBranches={setSelectedCompanyForTopBranches}
            />

            {/* Sales Trend Section */}
            <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-x-auto">
              <div className="min-w-[300px] p-3 sm:p-4 md:p-6">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-4 sm:mb-6 gap-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm sm:text-base md:text-lg lg:text-xl font-bold text-gray-900 flex items-center gap-2">
                      <TrendingUp className="text-blue-600" size={16} />
                      Active Sales Trend ({selectedYear})
                    </h3>
                    <p className="text-xs text-gray-500 mt-0.5">Confirmed & Invoiced sales combined</p>
                    {(selectedCompany !== 'all' || selectedBranch !== 'all') && (
                      <div className="flex flex-wrap items-center gap-1.5 mt-2">
                        {selectedCompany !== 'all' && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-blue-100 text-blue-700 text-[10px] rounded-full">
                            <Users size={10} />
                            <span className="max-w-[100px] truncate">{selectedCompany}</span>
                          </span>
                        )}
                        {selectedBranch !== 'all' && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-green-100 text-green-700 text-[10px] rounded-full">
                            <Building size={10} />
                            <span className="max-w-[100px] truncate">{selectedBranch}</span>
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 bg-green-500 rounded-full"></div>
                      <span className="text-[10px] sm:text-xs font-medium text-gray-700">Active Sales</span>
                    </div>

                    {(selectedCompany !== 'all' || selectedBranch !== 'all') && (
                      <button
                        onClick={() => {
                          setSelectedCompany('all');
                          setSelectedBranch('all');
                        }}
                        className="px-2 py-1 text-[10px] bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors whitespace-nowrap flex items-center gap-1"
                      >
                        <X size={10} />
                        <span className="hidden sm:inline">Clear</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Chart Filters - Responsive */}
                <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2 sm:gap-3 mb-4 p-2 sm:p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex items-center gap-1.5">
                    <Calendar size={12} className="text-gray-400 flex-shrink-0" />
                    <select
                      value={selectedYear}
                      onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                      className="px-1.5 py-1 text-xs border border-gray-300 rounded bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {[...new Set(sales.map(s => s.year || new Date(s.createdAt || s.date).getFullYear()))].map(year => (
                        <option key={year} value={year}>{year}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex-1 min-w-[140px]">
                    <div className="flex items-center gap-1.5">
                      <UserIcon size={12} className="text-gray-400 flex-shrink-0" />
                      <div className="flex-1">
                        <SearchableSelect
                          value={selectedCompany}
                          onChange={setSelectedCompany}
                          options={[
                            { value: 'all', label: 'All Companies' },
                            ...companies.map(company => ({
                              value: company.companyName,
                              label: company.companyName
                            }))
                          ]}
                          placeholder="Filter by Company"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex-1 min-w-[140px]">
                    <div className="flex items-center gap-1.5">
                      <Building size={12} className="text-gray-400 flex-shrink-0" />
                      <div className="flex-1">
                        <SearchableSelect
                          value={selectedBranch}
                          onChange={setSelectedBranch}
                          options={[
                            { value: 'all', label: selectedCompany === 'all' ? 'All Branches' : 'All Branches' },
                            ...availableBranches.map(branch => ({
                              value: branch.branchName,
                              label: branch.branchName
                            }))
                          ]}
                          placeholder="Filter by Branch"
                          disabled={selectedCompany === 'all' && availableBranches.length === 0}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Chart Container */}
                <div className="w-full h-[280px] sm:h-[350px] md:h-[400px]">
                  <SalesTrendChart chartData={chartData} sales={sales} selectedYear={selectedYear} />
                </div>

                {/* Summary Stats - 2 columns on tablet/desktop, 1 column on mobile */}
                {sales.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Total Sales */}
                      <div className="bg-blue-50 p-2 sm:p-3 rounded-lg border border-blue-200">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-[9px] sm:text-[10px] font-medium text-blue-600 uppercase">Total Sales</p>
                            <p className="text-xs sm:text-sm font-bold text-blue-800 truncate">
                              {formatCurrency(monthlySalesData.reduce((sum, month) => sum + month.activeRevenue, 0))}
                            </p>
                            <p className="text-[8px] sm:text-[9px] text-blue-400">For {selectedYear}</p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="text-[8px] sm:text-[9px] text-blue-500">Revenue</p>
                            <p className="text-[10px] sm:text-xs font-bold text-blue-700 truncate">
                              {formatCurrency(monthlySalesData.reduce((sum, month) => sum + month.activeRevenue, 0))}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Avg Monthly */}
                      <div className="bg-blue-50 p-2 sm:p-3 rounded-lg border border-blue-200">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-[9px] sm:text-[10px] font-medium text-blue-600 uppercase">Average Monthly</p>
                            <p className="text-xs sm:text-sm font-bold text-blue-800 truncate">
                              {formatCurrency(
                                monthlySalesData.reduce((sum, month) => sum + month.activeRevenue, 0) /
                                Math.max(monthlySalesData.filter(m => m.activeRevenue > 0).length, 1)
                              )}
                            </p>
                            <p className="text-[8px] sm:text-[9px] text-blue-400">Per month avg</p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="text-[8px] sm:text-[9px] text-blue-500">Monthly</p>
                            <p className="text-[10px] sm:text-xs font-bold text-blue-700 truncate">
                              {formatCurrency(
                                monthlySalesData.reduce((sum, month) => sum + month.activeRevenue, 0) /
                                Math.max(monthlySalesData.filter(m => m.activeRevenue > 0).length, 1)
                              )}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Transactions */}
                      <div className="bg-blue-50 p-2 sm:p-3 rounded-lg border border-blue-200">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-[9px] sm:text-[10px] font-medium text-blue-600 uppercase">Transactions</p>
                            <p className="text-xs sm:text-sm font-bold text-blue-800">
                              {formatNumber(monthlySalesData.reduce((sum, month) => sum + month.count, 0))}
                            </p>
                            <p className="text-[8px] sm:text-[9px] text-blue-400">Total orders</p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="text-[8px] sm:text-[9px] text-blue-500">Orders</p>
                            <p className="text-[10px] sm:text-xs font-bold text-blue-700">
                              {formatNumber(monthlySalesData.reduce((sum, month) => sum + month.count, 0))}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Best Month */}
                      <div className="bg-blue-50 p-2 sm:p-3 rounded-lg border border-blue-200">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-[9px] sm:text-[10px] font-medium text-blue-600 uppercase">Best Month</p>
                            <p className="text-xs sm:text-sm font-bold text-blue-800">
                              {(() => {
                                const bestMonth = monthlySalesData.reduce((prev, current) =>
                                  (prev.activeRevenue > current.activeRevenue) ? prev : current
                                );
                                return bestMonth.month;
                              })()}
                            </p>
                            <p className="text-[8px] sm:text-[9px] text-blue-400 truncate">
                              {formatCurrency(monthlySalesData.reduce((prev, current) =>
                                (prev.activeRevenue > current.activeRevenue) ? prev : current
                              ).activeRevenue)}
                            </p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="text-[8px] sm:text-[9px] text-blue-500">Peak</p>
                            <p className="text-[10px] sm:text-xs font-bold text-blue-700">
                              {(() => {
                                const bestMonth = monthlySalesData.reduce((prev, current) =>
                                  (prev.activeRevenue > current.activeRevenue) ? prev : current
                                );
                                return bestMonth.month;
                              })()}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Product Sales and Status Sections */}
            <div className="flex flex-col lg:grid lg:grid-cols-3 gap-4 sm:gap-6">
              {/* Product Sales by Month */}
              <div className="lg:col-span-2 bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
                <div className="p-3 sm:p-4 md:p-6">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4 sm:mb-6">
                    <div>
                      <h3 className="text-sm sm:text-base md:text-lg font-semibold text-gray-900 flex items-center gap-2">
                        <Package className="text-purple-600" size={16} />
                        Product Sales ({selectedYear})
                      </h3>
                      <p className="text-xs text-gray-500 mt-1 max-w-[250px] sm:max-w-none truncate">
                        {selectedCompany !== 'all' && selectedBranch !== 'all'
                          ? `${selectedCompany} - ${selectedBranch}`
                          : selectedCompany !== 'all' && selectedBranch === 'all'
                            ? `${selectedCompany} - All Branches`
                            : selectedBranch !== 'all'
                              ? `All Companies - ${selectedBranch}`
                              : 'All Companies - All Branches'
                        }
                      </p>
                    </div>
                  </div>

                  {(() => {
                    const getProductMonthlySales = () => {
                      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                      const productMonthlyData = {};
                      const productQuantityData = {};
                      const productSalesCount = {};

                      const filteredSales = sales.filter(sale => {
                        const saleYear = sale.year || new Date(sale.createdAt || sale.date).getFullYear();
                        const yearMatch = saleYear === selectedYear;
                        const statusMatch = (sale.status === 'CONFIRMED' || sale.status === 'INVOICED');
                        const companyMatch = selectedCompany === 'all' || sale.company?.companyName === selectedCompany;
                        const branchMatch = selectedBranch === 'all' || sale.branch?.branchName === selectedBranch;

                        return yearMatch && statusMatch && companyMatch && branchMatch;
                      });

                      filteredSales.forEach(sale => {
                        const monthIndex = sale.month ? sale.month - 1 : new Date(sale.createdAt || sale.date).getMonth();

                        sale.items?.forEach(item => {
                          const variationId = item.variation?.id || 'base';
                          const uniqueKey = `${item.product?.id}_${variationId}`;

                          if (!productMonthlyData[uniqueKey]) {
                            productMonthlyData[uniqueKey] = months.map(() => 0);
                            productQuantityData[uniqueKey] = 0;
                            productSalesCount[uniqueKey] = 0;
                          }
                          productMonthlyData[uniqueKey][monthIndex] += item.amount || 0;
                          productQuantityData[uniqueKey] += item.quantity || 0;
                        });
                      });

                      filteredSales.forEach(sale => {
                        const productsInSale = new Set();
                        sale.items?.forEach(item => {
                          const variationId = item.variation?.id || 'base';
                          const uniqueKey = `${item.product?.id}_${variationId}`;
                          productsInSale.add(uniqueKey);
                        });
                        productsInSale.forEach(uniqueKey => {
                          if (productSalesCount[uniqueKey] !== undefined) {
                            productSalesCount[uniqueKey] += 1;
                          }
                        });
                      });

                      return {
                        months,
                        products: productMonthlyData,
                        quantities: productQuantityData,
                        salesCounts: productSalesCount
                      };
                    };

                    const productData = getProductMonthlySales();

                    const allProductStats = Object.entries(productData.products)
                      .map(([uniqueKey, monthlyData]) => {
                        const [productId, variationIdStr] = uniqueKey.split('_');
                        const variationId = variationIdStr !== 'base' ? variationIdStr : null;

                        const product = products.find(p => p.id == productId);
                        const productName = product?.productName || 'Unknown Product';

                        let variationName = null;
                        let displayName = productName;

                        if (variationId && product) {
                          const variation = product.variations?.find(v => v.id == variationId);
                          variationName = variation?.combinationDisplay || variation?.variationValue || 'Default Variation';
                          displayName = `${productName} (${variationName})`;
                        }

                        const totalSales = monthlyData.reduce((sum, val) => sum + val, 0);
                        const quantity = productData.quantities[uniqueKey] || 0;
                        const salesCount = productData.salesCounts[uniqueKey] || 0;

                        const category = product?.category || 'Uncategorized';

                        return {
                          id: uniqueKey,
                          uniqueKey,
                          productId,
                          variationId,
                          name: displayName,
                          baseProductName: productName,
                          variationName,
                          totalSales,
                          quantity,
                          salesCount,
                          category,
                          monthlyData
                        };
                      })
                      .sort((a, b) => b.totalSales - a.totalSales);

                    const productStats = selectedCategoryForMonthly === 'all'
                      ? allProductStats
                      : allProductStats.filter(product => product.category === selectedCategoryForMonthly);

                    if (productStats.length === 0) {
                      return (
                        <div className="h-48 sm:h-64 flex flex-col items-center justify-center text-gray-400">
                          <Package size={32} className="mb-3 opacity-50" />
                          <p className="text-xs sm:text-sm text-center px-4">
                            {selectedCategoryForMonthly === 'all'
                              ? 'No product sales data for selected filters'
                              : `No products found in "${selectedCategoryForMonthly}" category`}
                          </p>
                          {selectedCategoryForMonthly !== 'all' && (
                            <button
                              onClick={() => setSelectedCategoryForMonthly('all')}
                              className="mt-3 px-3 py-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-xs"
                            >
                              View All Categories
                            </button>
                          )}
                        </div>
                      );
                    }

                    const topProductsForChart = productStats.slice(0, 5);

                    const colors = [
                      { border: '#8B5CF6', bg: 'rgba(139, 92, 246, 0.1)' },
                      { border: '#EC4899', bg: 'rgba(236, 72, 153, 0.1)' },
                      { border: '#F59E0B', bg: 'rgba(245, 158, 11, 0.1)' },
                      { border: '#10B981', bg: 'rgba(16, 185, 129, 0.1)' },
                      { border: '#3B82F6', bg: 'rgba(59, 130, 246, 0.1)' },
                    ];

                    const productChartData = {
                      labels: productData.months,
                      datasets: topProductsForChart.map((product, idx) => {
                        return {
                          label: product.name.length > 20 ? product.name.substring(0, 20) + '...' : product.name,
                          data: product.monthlyData,
                          borderColor: colors[idx % colors.length].border,
                          backgroundColor: colors[idx % colors.length].bg,
                          borderWidth: 2,
                          tension: 0.4,
                          fill: true,
                        };
                      })
                    };

                    return (
                      <>
                        <div className="w-full h-[250px] sm:h-[300px] md:h-[350px]">
                          <ProductSalesChart productChartData={productChartData} />
                        </div>

                        <div className="mt-6 pt-6 border-t border-gray-200">
                          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-3">
                            <h4 className="text-xs sm:text-sm font-semibold text-gray-700 flex items-center gap-2">
                              <Target size={14} className="text-purple-600" />
                              Top Products
                              {selectedCategoryForMonthly !== 'all' && (
                                <span className="text-xs font-normal text-purple-600">- {selectedCategoryForMonthly}</span>
                              )}
                            </h4>

                            {productCategories.length > 0 && (
                              <div className="relative w-full sm:w-auto">
                                <select
                                  value={selectedCategoryForMonthly}
                                  onChange={(e) => setSelectedCategoryForMonthly(e.target.value)}
                                  className="w-full sm:w-auto px-3 py-1.5 text-xs border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 appearance-none pr-8"
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

                          <div className="space-y-2 sm:space-y-3 max-h-[400px] overflow-y-auto pr-1">
                            {productStats.slice(0, 3).map((product, idx) => {
                              const percentage = productStats[0].totalSales > 0
                                ? (product.totalSales / productStats[0].totalSales * 100)
                                : 0;

                              return (
                                <div
                                  key={product.id}
                                  className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-gray-50 rounded-lg border border-gray-200 hover:border-purple-300 hover:bg-purple-50 transition-all"
                                >
                                  <div className="flex-shrink-0">
                                    <span className={`flex items-center justify-center w-7 h-7 rounded-full font-bold text-xs ${idx === 0 ? 'bg-yellow-100 text-yellow-700 border-2 border-yellow-400' :
                                      idx === 1 ? 'bg-gray-200 text-gray-600 border-2 border-gray-400' :
                                        idx === 2 ? 'bg-orange-100 text-orange-700 border-2 border-orange-400' :
                                          'bg-gray-100 text-gray-500'
                                      }`}>
                                      #{idx + 1}
                                    </span>
                                  </div>

                                  <div className="flex-1 min-w-0">
                                    <p className="font-semibold text-gray-900 text-sm truncate">{product.name}</p>
                                    <p className="text-xs text-gray-500">{product.salesCount} transactions</p>
                                    {product.category && product.category !== 'Uncategorized' && (
                                      <span className="inline-flex items-center px-1.5 py-0.5 mt-1 rounded text-xs bg-purple-100 text-purple-600">
                                        {product.category}
                                      </span>
                                    )}
                                  </div>

                                  <div className="flex flex-wrap items-center gap-3 sm:gap-4">
                                    <div className="text-left sm:text-right">
                                      <p className="text-xs text-gray-500">Sales</p>
                                      <p className="font-bold text-green-600 text-sm">{formatCurrency(product.totalSales)}</p>
                                    </div>

                                    <div className="text-left sm:text-right">
                                      <p className="text-xs text-gray-500">Qty</p>
                                      <p className="font-bold text-purple-600 text-sm">{formatNumber(product.quantity)}</p>
                                    </div>

                                    <div className="flex-1 sm:w-24">
                                      <div className="flex items-center justify-between gap-2 mb-1">
                                        <span className="text-xs font-medium text-gray-600">{percentage.toFixed(0)}%</span>
                                      </div>
                                      <div className="w-full bg-gray-200 rounded-full h-1.5">
                                        <div
                                          className="bg-gradient-to-r from-purple-500 to-purple-600 h-1.5 rounded-full transition-all duration-500"
                                          style={{ width: `${percentage}%` }}
                                        ></div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}

                            {productStats.length > 3 && (
                              <>
                                <div className="my-2 border-t border-gray-200 pt-2">
                                  <p className="text-xs text-gray-500 text-center">
                                    +{productStats.length - 3} more products
                                  </p>
                                </div>
                                <div className="hidden sm:block">
                                  {productStats.slice(3).map((product, idx) => {
                                    const actualIdx = idx + 3;
                                    const percentage = productStats[0].totalSales > 0
                                      ? (product.totalSales / productStats[0].totalSales * 100)
                                      : 0;

                                    return (
                                      <div
                                        key={product.id}
                                        className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-gray-50 rounded-lg border border-gray-200 hover:border-purple-300 hover:bg-purple-50 transition-all"
                                      >
                                        <div className="flex-shrink-0">
                                          <span className="flex items-center justify-center w-7 h-7 rounded-full font-bold text-xs bg-gray-100 text-gray-500">
                                            #{actualIdx + 1}
                                          </span>
                                        </div>

                                        <div className="flex-1 min-w-0">
                                          <p className="font-semibold text-gray-900 text-sm truncate">{product.name}</p>
                                          <p className="text-xs text-gray-500">{product.salesCount} transactions</p>
                                          {product.category && product.category !== 'Uncategorized' && (
                                            <span className="inline-flex items-center px-1.5 py-0.5 mt-1 rounded text-xs bg-purple-100 text-purple-600">
                                              {product.category}
                                            </span>
                                          )}
                                        </div>

                                        <div className="flex flex-wrap items-center gap-3 sm:gap-4">
                                          <div className="text-left sm:text-right">
                                            <p className="text-xs text-gray-500">Sales</p>
                                            <p className="font-bold text-green-600 text-sm">{formatCurrency(product.totalSales)}</p>
                                          </div>

                                          <div className="text-left sm:text-right">
                                            <p className="text-xs text-gray-500">Qty</p>
                                            <p className="font-bold text-purple-600 text-sm">{formatNumber(product.quantity)}</p>
                                          </div>

                                          <div className="flex-1 sm:w-24">
                                            <div className="flex items-center justify-between gap-2 mb-1">
                                              <span className="text-xs font-medium text-gray-600">{percentage.toFixed(0)}%</span>
                                            </div>
                                            <div className="w-full bg-gray-200 rounded-full h-1.5">
                                              <div
                                                className="bg-gradient-to-r from-purple-500 to-purple-600 h-1.5 rounded-full transition-all duration-500"
                                                style={{ width: `${percentage}%` }}
                                              ></div>
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </>
                            )}
                          </div>

                          {productStats.length > 0 && (
                            <div className="mt-4 pt-4 border-t border-gray-200 bg-purple-50 rounded-lg p-3 sm:p-4">
                              {selectedCategoryForMonthly !== 'all' && (
                                <div className="mb-2 text-center">
                                  <span className="text-xs font-semibold text-purple-700">
                                    Showing: {selectedCategoryForMonthly}
                                  </span>
                                </div>
                              )}
                              <div className="grid grid-cols-3 gap-2 sm:gap-4 text-center">
                                <div>
                                  <p className="text-xs text-gray-600">Products</p>
                                  <p className="text-sm sm:text-base md:text-lg font-bold text-purple-700">{productStats.length}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-gray-600">Sales</p>
                                  <p className="text-sm sm:text-base md:text-lg font-bold text-green-700">
                                    {formatCurrency(productStats.reduce((sum, p) => sum + p.totalSales, 0))}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-xs text-gray-600">Units</p>
                                  <p className="text-sm sm:text-base md:text-lg font-bold text-blue-700">
                                    {formatNumber(productStats.reduce((sum, p) => sum + p.quantity, 0))}
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>

              {/* Status Distribution and Recent Sales */}
              <div className="space-y-4 sm:space-y-6">
                <StatusDistribution stats={stats} sales={sales} navigate={navigate} isLoading={dashboardLoading} />
                <RecentSales recentSales={recentSales} sales={sales} isLoading={dashboardLoading} />
              </div>
            </div>
          </div>
        </div>

        {/* Alert Management Modal */}
        <AlertManagement
          showNotifications={showNotifications}
          setShowNotifications={setShowNotifications}
          alerts={alerts}
          loadAlerts={loadAlerts}
        />
      </div>
    </>
  );
};

export default Dashboard;