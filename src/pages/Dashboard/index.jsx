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
import { ChartCardSkeleton, ProductAnalysisSkeleton } from '../../components/common/Skeleton';
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

  const [alertsTotalElements, setAlertsTotalElements] = useState(0);
  const navigate = useNavigate();
  const [sales, setSales] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [branches, setBranches] = useState([]);
  const [products, setProducts] = useState([]);
  const [salesLoading, setSalesLoading] = useState(true);
  const [productsLoading, setProductsLoading] = useState(true);
  const initialSalesLoading = salesLoading && sales.length === 0;
  const initialProductsLoading =
    initialSalesLoading || (productsLoading && products.length === 0);
  const [deliveries, setDeliveries] = useState([]);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear() - 1);
  const [selectedCompany, setSelectedCompany] = useState('all');
  const [selectedBranch, setSelectedBranch] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [trendView, setTrendView] = useState('year');
  const [monthlyTotals, setMonthlyTotals] = useState([]);
  const [drillYear, setDrillYear] = useState(null);
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
  const [selectedCompanyForBranches, setSelectedCompanyForBranches] = useState(null);
  const [selectedCompanyForTopBranches, setSelectedCompanyForTopBranches] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedCategoryForMonthly, setSelectedCategoryForMonthly] = useState('all');
  const [productRankBy, setProductRankBy] = useState('revenue');
  const [productCategories, setProductCategories] = useState([]);
  const [performanceYear, setPerformanceYear] = useState(new Date().getFullYear() - 1);
  const [performanceView, setPerformanceView] = useState('year');
  const [performanceMonth, setPerformanceMonth] = useState(new Date().getMonth() + 1);
  const [alertsCurrentPage, setAlertsCurrentPage] = useState(0);
  const [alertsTotalPages, setAlertsTotalPages] = useState(1);


  useEffect(() => {
    loadStats();
    loadAlerts(0, false);
  }, []);

  useEffect(() => {
    if (sales.length > 0 && products.length > 0) {
      loadPerformance(products);
      generateInsights();
      const productAnalysis = getProductSalesAnalysis(sales, products);
      setProductSalesData(productAnalysis);
    }
  }, [sales, products, selectedYear, selectedCompany, selectedBranch, performanceYear, performanceView, performanceMonth, selectedProductId, selectedCategory]);

  useEffect(() => {
    setSelectedProductId(null);
    setSelectedCompanyForBranches(null);
  }, [performanceView, performanceYear, performanceMonth]);

  const loadStats = () => {
    setSalesLoading(true);
    setProductsLoading(true);

    // Sales: cards, trend chart, recent sales, status
    api.get('/sales/dashboard-summary?months=18')
      .then(res => {
        const salesData = extractArray(res);
        setSales(salesData);
        setRecentSales(
          [...salesData]
            .sort((a, b) => new Date(b.createdAt || b.date || 0) - new Date(a.createdAt || a.date || 0))
            .slice(0, 10)
        );

        const activeSales = salesData.filter(s =>
          ['CONFIRMED', 'INVOICED', 'PENDING'].includes(s.status));
        const activeRevenue = activeSales.reduce((sum, s) => sum + (s.totalAmount || 0), 0);
        const isActive = s => s.status === 'CONFIRMED' || s.status === 'INVOICED';

        const currentMonth = new Date().getMonth();
        const monthRevenue = (m) => salesData
          .filter(s => new Date(s.createdAt || s.date).getMonth() === m && isActive(s))
          .reduce((sum, s) => sum + (s.totalAmount || 0), 0);
        const thisMonthRevenue = monthRevenue(currentMonth);
        const prevMonthRevenue = monthRevenue((currentMonth - 1 + 12) % 12);
        const revenueGrowth = prevMonthRevenue > 0
          ? ((thisMonthRevenue - prevMonthRevenue) / prevMonthRevenue) * 100
          : thisMonthRevenue > 0 ? 100 : 0;

        const salesVelocity = salesData.filter(s =>
          (new Date() - new Date(s.createdAt || s.date)) / 86400000 <= 30 && isActive(s)
        ).length / 30;

        const years = [...new Set(salesData.map(s => s.year || new Date(s.createdAt || s.date).getFullYear()))];
        if (years.length > 0) {
          const latest = Math.max(...years);
          setPerformanceYear(latest);
          setSelectedYear(latest);
        }

        setStats(prev => ({
          ...prev,
          totalSales: salesData.length,
          activeSales: activeSales.length,
          activeRevenue,
          averageOrderValue: parseFloat((activeSales.length ? activeRevenue / activeSales.length : 0).toFixed(2)),
          revenueGrowth: parseFloat(revenueGrowth.toFixed(1)),
          salesVelocity: parseFloat(salesVelocity.toFixed(2)),
        }));
      })
      .catch(err => console.error('Failed to load sales', err))
      .finally(() => setSalesLoading(false));

    // Independent lookups, each shows as soon as it arrives
    api.get('/products')
      .then(r => setProducts(extractArray(r)))
      .catch(err => console.error('Failed to load products', err))
      .finally(() => setProductsLoading(false));

    api.get('/companies')
      .then(r => setCompanies(extractArray(r)))
      .catch(err => console.error('Failed to load companies', err));

    api.get('/branches/list')
      .then(r => setBranches(extractArray(r)))
      .catch(err => console.error('Failed to load branches', err));

    // Deliveries (background)
    api.get('/deliveries?page=0&size=50&sort=createdAt,desc')
      .then(res => {
        const d = extractArray(res);
        setDeliveries(d);
        setStats(prev => ({
          ...prev,
          pendingDeliveries: d.filter(x => x.status === 'PENDING').length,
          deliveredOrders: d.filter(x => x.status === 'DELIVERED').length,
        }));
      })
      .catch(() => { });
  };


  const [alertsLoading, setAlertsLoading] = useState(false);
  const loadAlerts = async (page = 0, resolved, filters = {}) => {
    try {
      setAlertsLoading(true);
      const params = new URLSearchParams();
      params.set('page', page);
      params.set('size', '20');
      params.set('sort', 'createdAt,desc');
      if (resolved !== undefined) params.set('resolved', resolved);
      if (filters.severity) params.set('severity', filters.severity);
      if (filters.alertType) params.set('alertType', filters.alertType);
      if (filters.branchIds?.length) params.set('branchIds', filters.branchIds.join(','));
      if (filters.companyIds?.length) params.set('companyIds', filters.companyIds.join(','));
      if (filters.productKeys?.length) params.set('productKeys', filters.productKeys.join(','));
      if (filters.search) params.set('search', filters.search);

      const alertsRes = await api.get(`/alerts?${params.toString()}`);
      if (alertsRes.success && alertsRes.data) {
        const newAlerts = alertsRes.data?.content || alertsRes.data || [];
        const totalPages = alertsRes.data?.totalPages || 1;
        const totalElements = alertsRes.data?.totalElements || 0;

        setAlerts(newAlerts);
        setAlertsTotalPages(totalPages);
        setAlertsCurrentPage(page);
        setAlertsTotalElements(totalElements);
      }
    } catch (err) {
      console.error('Failed to load alerts', err);
      setAlerts([]);
    } finally {
      setAlertsLoading(false);
    }
  };

  const getMonthlySalesData = () => {
    if (trendView === 'overall') {
      const names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const rows = [...monthlyTotals]
        .sort((a, b) => a.year - b.year || a.month - b.month)
        .map(r => ({
          month: `${names[r.month - 1]} ${r.year}`,
          activeRevenue: r.revenue || 0,
          count: r.count || 0,
        }));
      if (drillYear) {
        return names.map((n, i) => {
          const r = monthlyTotals.find(t => t.year === drillYear && t.month === i + 1);
          return { month: n, year: drillYear, activeRevenue: r?.revenue || 0, count: r?.count || 0 };
        });
      }
      return rows.length > 0 ? rows : [{ month: '-', activeRevenue: 0, count: 0 }];
    }

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

  const getTrendChartRows = () => {
    const rows = getMonthlySalesData();
    if (trendView !== 'overall' || drillYear) return rows;

    const byYear = new Map();
    monthlyTotals.forEach(r => {
      const cur = byYear.get(r.year) || { month: String(r.year), year: r.year, activeRevenue: 0, count: 0 };
      cur.activeRevenue += r.revenue || 0;
      cur.count += r.count || 0;
      byYear.set(r.year, cur);
    });
    const out = [...byYear.values()].sort((a, b) => a.year - b.year);
    return out.length > 0 ? out : [{ month: '-', activeRevenue: 0, count: 0 }];
  };

  const chartData = useMemo(() => {
    const data = getTrendChartRows();
    return {
      labels: data.map(d => d.month),
      datasets: [
        {
          label: 'Active Revenue',
          data: data.map(d => d.activeRevenue),
          borderColor: '#FF6D00',
          backgroundColor: 'rgba(255, 109, 0, 0.10)',
          borderWidth: 3,
          tension: 0.4,
          fill: true,
          pointBackgroundColor: '#FF6D00',
          pointBorderColor: '#ffffff',
          pointBorderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 6,
        }
      ]
    };
  }, [sales, selectedYear, selectedCompany, selectedBranch, trendView, monthlyTotals, drillYear]);

  const monthlySalesData = getMonthlySalesData();
  const trendChartRows = getTrendChartRows();

  useEffect(() => {
    if (trendView !== 'overall') return;

    const companyId = selectedCompany === 'all'
      ? null
      : companies.find(c => c.companyName === selectedCompany)?.id;
    const branchId = selectedBranch === 'all'
      ? null
      : branches.find(b => b.branchName === selectedBranch)?.id;

    const params = new URLSearchParams();
    if (companyId) params.set('companyId', companyId);
    if (branchId) params.set('branchId', branchId);

    api.get(`/sales/monthly-totals?${params.toString()}`)
      .then(res => setMonthlyTotals(extractArray(res)))
      .catch(err => console.error('Failed to load monthly totals', err));
  }, [trendView, selectedCompany, selectedBranch, companies, branches]);
  const totalAlerts = alerts.filter(a => !a.isResolved).length;
  const loadPerformance = (productsOverride) => {
    const productsList = productsOverride || products;
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
              const fullProduct = productsList.find(p => String(p.id) === String(item.product?.id));
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
        .sort((a, b) => b.quantity - a.quantity);

      const itemInScope = (item) => {
        if (selectedProductId) {
          return `${item.product?.id}_${item.variation?.id || 'base'}` === selectedProductId;
        }
        if (selectedCategory === 'all') return true;
        const fp = productsList.find(p => String(p.id) === String(item.product?.id));
        return (fp?.category || item.product?.category || 'Uncategorized') === selectedCategory;
      };

      const branchPerformance = {};
      const companyPerformance = {};

      filteredSales.forEach(sale => {
        const scopedItems = (sale.items || []).filter(itemInScope);
        if (scopedItems.length === 0) return;

        const revenue = scopedItems.reduce((s, i) => s + (i.amount || 0), 0);
        const quantity = scopedItems.reduce((s, i) => s + (i.quantity || 0), 0);

        const bKey = sale.branch?.id;
        if (!branchPerformance[bKey]) {
          branchPerformance[bKey] = {
            id: bKey,
            name: sale.branch?.branchName || 'Unknown Branch',
            code: sale.branch?.branchCode || 'N/A',
            revenue: 0, salesCount: 0, quantity: 0, averageOrderValue: 0,
          };
        }
        branchPerformance[bKey].revenue += revenue;
        branchPerformance[bKey].quantity += quantity;
        branchPerformance[bKey].salesCount += 1;

        const cKey = sale.company?.id;
        if (!companyPerformance[cKey]) {
          companyPerformance[cKey] = {
            id: cKey,
            name: sale.company?.companyName || 'Unknown Company',
            revenue: 0, salesCount: 0, averageOrderValue: 0,
          };
        }
        companyPerformance[cKey].revenue += revenue;
        companyPerformance[cKey].salesCount += 1;
      });

      Object.values(branchPerformance).forEach(b => {
        b.averageOrderValue = b.salesCount > 0 ? b.revenue / b.salesCount : 0;
      });
      Object.values(companyPerformance).forEach(c => {
        c.averageOrderValue = c.salesCount > 0 ? c.revenue / c.salesCount : 0;
      });

      const topBranches = Object.values(branchPerformance)
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10);

      const topCompanies = Object.values(companyPerformance)
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10);

      setPerformanceData({ topProducts, topBranches, topCompanies });
    } catch (err) {
      console.error('Failed to load performance data', err);
    }
  };

  const getProductSalesAnalysis = (salesOverride, productsOverride) => {
    const productAnalysis = {};
    const salesSource = salesOverride || sales;

    const filteredSales = salesSource.filter(sale => {
      const statusMatch = sale.status === 'CONFIRMED' || sale.status === 'INVOICED' || sale.status === 'PENDING';

      if (performanceView === 'overall') {
        return statusMatch;
      }

      const saleYear = sale.year || new Date(sale.createdAt || sale.date).getFullYear();
      const saleMonth = sale.month || (new Date(sale.createdAt || sale.date).getMonth() + 1);

      const yearMatch = saleYear === performanceYear;
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
          const fullProduct = (productsOverride || products).find(p => String(p.id) === String(productId));
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
    const active = sales.filter(s => ['CONFIRMED', 'INVOICED', 'PENDING'].includes(s.status)).length;
    const totalLeads = companies.length * 2;
    setStats(prev => ({
      ...prev,
      totalCompanies: companies.length,
      lowStock: products.filter(p => p.quantity < 10).length,
      conversionRate: totalLeads > 0 && sales.length > 0
        ? parseFloat(((active / totalLeads) * 100).toFixed(1)) : 0,
    }));
  }, [sales, companies, products]);

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
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 overflow-x-hidden">
        <div className="w-full max-w-[1600px] mx-auto px-3 sm:px-4 md:px-6 py-3 sm:py-4 md:py-6">
          <div className="space-y-4 sm:space-y-6">
            {/* Header Section */}
            <div className="mb-3 sm:mb-6 flex items-center justify-between">
              <div>
                <h1 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-gray-900">Dashboard</h1>
                <p className="text-xs sm:text-sm text-gray-600 mt-0.5 sm:mt-1">Overview of your business performance</p>
              </div>
            </div>

            <DashboardHeader
              showInsights={showInsights}
              setShowInsights={setShowInsights}
              businessInsights={businessInsights}
              loadStats={loadStats}
              showNotifications={showNotifications}
              setShowNotifications={setShowNotifications}
              alerts={alerts}
              isLoading={salesLoading}
            />

            {/* Stats Cards */}
            <DashboardCards stats={stats} totalAlerts={totalAlerts} isLoading={initialSalesLoading} />

            {/* Business Insights */}
            <BusinessInsights
              insights={businessInsights}
              showInsights={showInsights}
              setShowInsights={setShowInsights}
            />

            {/* Product Analysis Section */} {initialProductsLoading ? (<ProductAnalysisSkeleton />) : (
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

            )} {/* Sales Trend Section */} {initialSalesLoading ? (<ChartCardSkeleton height="h-[280px] sm:h-[350px] md:h-[400px]" />) : (
              <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-x-auto">
                <div className="min-w-[300px] p-3 sm:p-4 md:p-6">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-4 sm:mb-6 gap-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm sm:text-base md:text-lg lg:text-xl font-bold text-gray-900 flex items-center gap-2">
                        <TrendingUp className="text-gray-900" size={16} />
                        Active Sales Trend ({trendView === 'overall' ? (drillYear ? `Overall › ${drillYear}` : 'Overall · by year') : selectedYear})
                      </h3>
                      <p className="text-xs text-gray-500 mt-0.5">Confirmed & Invoiced sales combined</p>
                      {(selectedCompany !== 'all' || selectedBranch !== 'all') && (
                        <div className="flex flex-wrap items-center gap-1.5 mt-2">
                          {selectedCompany !== 'all' && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-gray-100 text-gray-900 text-[10px] rounded-full">
                              <Users size={10} />
                              <span className="max-w-[100px] truncate">{selectedCompany}</span>
                            </span>
                          )}
                          {selectedBranch !== 'all' && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-gray-100 text-gray-900 text-[10px] rounded-full">
                              <Building size={10} />
                              <span className="max-w-[100px] truncate">{selectedBranch}</span>
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 bg-orange-500 rounded-full"></div>
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
                  <div className="flex items-center gap-1 bg-gray-100 rounded p-1 w-fit mb-3">
                    <button
                      onClick={() => { setTrendView('year'); setDrillYear(null); }}
                      className={`px-3 py-1 text-xs rounded ${trendView === 'year' ? 'bg-white text-gray-900 font-semibold shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
                    >
                      By Year
                    </button>
                    <button
                      onClick={() => { setTrendView('overall'); setDrillYear(null); }}
                      className={`px-3 py-1 text-xs rounded ${trendView === 'overall' ? 'bg-white text-gray-900 font-semibold shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
                    >
                      Overall
                    </button>
                  </div>

                  {trendView === 'overall' && (
                    <div className="flex flex-wrap items-center gap-1.5 mb-3">
                      <button
                        onClick={() => setDrillYear(null)}
                        className={`px-2.5 py-1 text-[11px] rounded-full border transition-colors ${!drillYear ? 'bg-orange-600 text-white border-orange-600' : 'bg-white text-gray-600 border-gray-300 hover:border-orange-400'}`}
                      >
                        All years
                      </button>
                      {[...new Set(monthlyTotals.map(r => r.year))].sort((a, b) => a - b).map(y => (
                        <button
                          key={y}
                          onClick={() => setDrillYear(drillYear === y ? null : y)}
                          className={`px-2.5 py-1 text-[11px] rounded-full border transition-colors ${drillYear === y ? 'bg-orange-600 text-white border-orange-600' : 'bg-white text-gray-600 border-gray-300 hover:border-orange-400'}`}
                        >
                          {y}
                        </button>
                      ))}
                      <span className="text-[10px] text-gray-400 ml-1">
                        {drillYear ? `Showing the months of ${drillYear}` : 'Click a year on the chart to see its months'}
                      </span>
                    </div>
                  )}

                  {/* Chart Filters - Responsive */}
                  <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2 sm:gap-3 mb-4 p-2 sm:p-3 bg-white rounded border border-gray-200">
                    <div className="flex items-center gap-1.5">
                      <Calendar size={12} className="text-gray-400 flex-shrink-0" />
                      <select
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(parseInt(e.target.value))} disabled={trendView === 'overall'}
                        className="px-1.5 py-1 text-xs border border-gray-300 rounded bg-white focus:outline-none focus:ring-2 focus:ring-orange-500"
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
                    <SalesTrendChart
                      chartData={chartData}
                      sales={sales}
                      selectedYear={selectedYear}
                      drillable={trendView === 'overall' && !drillYear}
                      showAllTicks={trendView === 'overall' && !!drillYear}
                      onPointClick={(i) => {
                        const row = trendChartRows[i];
                        if (row?.year) setDrillYear(row.year);
                      }}
                    />
                  </div>

                  {/* Summary Stats - 2 columns on tablet/desktop, 1 column on mobile */}
                  {sales.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {/* Total Sales */}
                        <div className="bg-gray-50 p-2 sm:p-3 rounded border border-gray-200">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="text-[9px] sm:text-[10px] font-medium text-gray-900 uppercase">Total Sales</p>
                              <p className="text-xs sm:text-sm font-bold text-gray-900 truncate">
                                {formatCurrency(monthlySalesData.reduce((sum, month) => sum + month.activeRevenue, 0))}
                              </p>
                              <p className="text-[8px] sm:text-[9px] text-gray-500">{trendView === 'overall' ? (drillYear ? `For ${drillYear}` : 'All time') : `For ${selectedYear}`}</p>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <p className="text-[8px] sm:text-[9px] text-gray-500">Revenue</p>
                              <p className="text-[10px] sm:text-xs font-bold text-gray-900 truncate">
                                {formatCurrency(monthlySalesData.reduce((sum, month) => sum + month.activeRevenue, 0))}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Avg Monthly */}
                        <div className="bg-gray-50 p-2 sm:p-3 rounded border border-gray-200">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="text-[9px] sm:text-[10px] font-medium text-gray-900 uppercase">Average Monthly</p>
                              <p className="text-xs sm:text-sm font-bold text-gray-900 truncate">
                                {formatCurrency(
                                  monthlySalesData.reduce((sum, month) => sum + month.activeRevenue, 0) /
                                  Math.max(monthlySalesData.filter(m => m.activeRevenue > 0).length, 1)
                                )}
                              </p>
                              <p className="text-[8px] sm:text-[9px] text-gray-500">Per month avg</p>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <p className="text-[8px] sm:text-[9px] text-gray-500">Monthly</p>
                              <p className="text-[10px] sm:text-xs font-bold text-gray-900 truncate">
                                {formatCurrency(
                                  monthlySalesData.reduce((sum, month) => sum + month.activeRevenue, 0) /
                                  Math.max(monthlySalesData.filter(m => m.activeRevenue > 0).length, 1)
                                )}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Transactions */}
                        <div className="bg-gray-50 p-2 sm:p-3 rounded border border-gray-200">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="text-[9px] sm:text-[10px] font-medium text-gray-900 uppercase">Transactions</p>
                              <p className="text-xs sm:text-sm font-bold text-gray-900">
                                {formatNumber(monthlySalesData.reduce((sum, month) => sum + month.count, 0))}
                              </p>
                              <p className="text-[8px] sm:text-[9px] text-gray-500">Total orders</p>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <p className="text-[8px] sm:text-[9px] text-gray-500">Orders</p>
                              <p className="text-[10px] sm:text-xs font-bold text-gray-900">
                                {formatNumber(monthlySalesData.reduce((sum, month) => sum + month.count, 0))}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Best Month */}
                        <div className="bg-gray-50 p-2 sm:p-3 rounded border border-gray-200">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="text-[9px] sm:text-[10px] font-medium text-gray-900 uppercase">Best Month</p>
                              <p className="text-xs sm:text-sm font-bold text-gray-900">
                                {(() => {
                                  const bestMonth = monthlySalesData.reduce((prev, current) =>
                                    (prev.activeRevenue > current.activeRevenue) ? prev : current
                                  );
                                  return bestMonth.month;
                                })()}
                              </p>
                              <p className="text-[8px] sm:text-[9px] text-gray-500 truncate">
                                {formatCurrency(monthlySalesData.reduce((prev, current) =>
                                  (prev.activeRevenue > current.activeRevenue) ? prev : current
                                ).activeRevenue)}
                              </p>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <p className="text-[8px] sm:text-[9px] text-gray-500">Peak</p>
                              <p className="text-[10px] sm:text-xs font-bold text-gray-900">
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

            )} {/* Product Sales and Status Sections */}
            <div className="flex flex-col lg:grid lg:grid-cols-3 gap-4 sm:gap-6">
              {/* Product Sales by Month */} {initialProductsLoading ? (<div className="lg:col-span-2"><ChartCardSkeleton height="h-[250px] sm:h-[350px]" /></div>) : (
                <div className="lg:col-span-2 bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
                  <div className="p-3 sm:p-4 md:p-6">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4 sm:mb-6">
                      <div>
                        <h3 className="text-sm sm:text-base md:text-lg font-semibold text-gray-900 flex items-center gap-2">
                          <Package className="text-gray-900" size={16} />
                          Product Sales ({trendView === 'overall' ? (drillYear ? `Overall › ${drillYear}` : 'Overall · by year') : selectedYear})
                          {trendView === 'overall' && drillYear && (
                            <button
                              onClick={() => setDrillYear(null)}
                              className="ml-1 px-2 py-0.5 text-[10px] bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                            >
                              ← All years
                            </button>
                          )}
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
                        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                        const isOverall = trendView === 'overall';
                        const yearly = isOverall && !drillYear;
                        const productMonthlyData = {};
                        const productQuantityData = {};
                        const productSalesCount = {};

                        const periodOf = (sale) => {
                          const d = new Date(sale.createdAt || sale.date);
                          return {
                            year: sale.year || d.getFullYear(),
                            month: sale.month || (d.getMonth() + 1),
                          };
                        };

                        const filteredSales = sales.filter(sale => {
                          const { year } = periodOf(sale);
                          const yearMatch = isOverall ? (!drillYear || year === drillYear) : year === selectedYear;
                          const statusMatch = (sale.status === 'CONFIRMED' || sale.status === 'INVOICED' || sale.status === 'PENDING');
                          const companyMatch = selectedCompany === 'all' || sale.company?.companyName === selectedCompany;
                          const branchMatch = selectedBranch === 'all' || sale.branch?.branchName === selectedBranch;

                          return yearMatch && statusMatch && companyMatch && branchMatch;
                        });

                        // x-axis: one point per year (Overall), otherwise the 12 months
                        let periods;
                        if (yearly) {
                          periods = [...new Set(filteredSales.map(s => periodOf(s).year))]
                            .sort((a, b) => a - b)
                            .map(y => ({ key: y, label: String(y), year: y }));
                        } else {
                          periods = monthNames.map((m, i) => ({ key: i + 1, label: m }));
                        }
                        const indexByKey = new Map(periods.map((p, i) => [p.key, i]));

                        filteredSales.forEach(sale => {
                          const { year, month } = periodOf(sale);
                          const periodIndex = indexByKey.get(yearly ? year : month);
                          if (periodIndex === undefined) return;

                          sale.items?.forEach(item => {
                            const variationId = item.variation?.id || 'base';
                            const uniqueKey = `${item.product?.id}_${variationId}`;

                            if (!productMonthlyData[uniqueKey]) {
                              productMonthlyData[uniqueKey] = periods.map(() => 0);
                              productQuantityData[uniqueKey] = 0;
                              productSalesCount[uniqueKey] = 0;
                            }
                            productMonthlyData[uniqueKey][periodIndex] += item.amount || 0;
                            productQuantityData[uniqueKey] += item.quantity || 0;
                          });
                        });

                        filteredSales.forEach(sale => {
                          const productsInSale = new Set();
                          sale.items?.forEach(item => {
                            const variationId = item.variation?.id || 'base';
                            productsInSale.add(`${item.product?.id}_${variationId}`);
                          });
                          productsInSale.forEach(uniqueKey => {
                            if (productSalesCount[uniqueKey] !== undefined) {
                              productSalesCount[uniqueKey] += 1;
                            }
                          });
                        });

                        return {
                          months: periods.map(p => p.label),
                          periodYears: periods.map(p => p.year),
                          yearly,
                          products: productMonthlyData,
                          quantities: productQuantityData,
                          salesCounts: productSalesCount
                        };
                      };

                      const productData = getProductMonthlySales();
                      const rankValue = (p) => (productRankBy === 'quantity' ? p.quantity : p.totalSales);

                      const allProductStats = Object.entries(productData.products)
                        .map(([uniqueKey, monthlyData]) => {
                          const [productId, variationIdStr] = uniqueKey.split('_');
                          const variationId = variationIdStr !== 'base' ? variationIdStr : null;

                          const product = products.find(p => String(p.id) === String(productId));
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
                        .sort((a, b) => rankValue(b) - rankValue(a));

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
                                className="mt-3 px-3 py-1.5 bg-orange-600 text-white rounded hover:bg-orange-700 text-xs"
                              >
                                View All Categories
                              </button>
                            )}
                          </div>
                        );
                      }

                      const topProductsForChart = productStats.slice(0, 5);

                      const colors = [
                        { border: '#FF4800', bg: 'rgba(255, 72, 0, 0.1)' },
                        { border: '#FF6D00', bg: 'rgba(255, 109, 0, 0.1)' },
                        { border: '#FF8500', bg: 'rgba(255, 133, 0, 0.1)' },
                        { border: '#FF9E00', bg: 'rgba(255, 158, 0, 0.1)' },
                        { border: '#FFB600', bg: 'rgba(255, 182, 0, 0.1)' },
                      ];

                      const productChartData = {
                        labels: productData.months,
                        datasets: topProductsForChart.map((product, idx) => {
                          return {
                            label: product.name,
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
                            <ProductSalesChart
                              productChartData={productChartData}
                              drillable={productData.yearly}
                              showAllTicks={!productData.yearly}
                              onPointClick={(i) => {
                                const y = productData.periodYears[i];
                                if (y) setDrillYear(y);
                              }}
                            />
                          </div>

                          <div className="mt-6 pt-6 border-t border-gray-200">
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-3">
                              <h4 className="text-xs sm:text-sm font-semibold text-gray-700 flex items-center gap-2">
                                <Target size={14} className="text-gray-900" />
                                Top Products
                                {selectedCategoryForMonthly !== 'all' && (
                                  <span className="text-xs font-normal text-gray-900">- {selectedCategoryForMonthly}</span>
                                )}
                              </h4>

                              <div className="flex items-center gap-1 bg-gray-100 rounded p-1">
                                <button
                                  onClick={() => setProductRankBy('quantity')}
                                  className={`px-3 py-1 text-xs rounded ${productRankBy === 'quantity' ? 'bg-white text-gray-900 font-semibold shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
                                >
                                  By Quantity
                                </button>
                                <button
                                  onClick={() => setProductRankBy('revenue')}
                                  className={`px-3 py-1 text-xs rounded ${productRankBy === 'revenue' ? 'bg-white text-gray-900 font-semibold shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
                                >
                                  By Sales
                                </button>
                              </div>

                              {productCategories.length > 0 && (
                                <div className="relative w-full sm:w-auto">
                                  <select
                                    value={selectedCategoryForMonthly}
                                    onChange={(e) => setSelectedCategoryForMonthly(e.target.value)}
                                    className="w-full sm:w-auto px-3 py-1.5 text-xs border border-gray-300 rounded bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 appearance-none pr-8"                                >
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
                                const percentage = rankValue(productStats[0]) > 0
                                  ? (rankValue(product) / rankValue(productStats[0]) * 100)
                                  : 0;

                                return (
                                  <div
                                    key={product.id}
                                    className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-white rounded border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all"                                >
                                    <div className="flex-shrink-0">
                                      <span className={`flex items-center justify-center w-7 h-7 rounded-full font-bold text-xs ${idx === 0 ? 'bg-gray-100 text-gray-900 border-2 border-orange-400' :
                                        idx === 1 ? 'bg-gray-50 text-gray-900 border-2 border-orange-300' :
                                          idx === 2 ? 'bg-gray-100 text-gray-600 border-2 border-gray-300' :
                                            'bg-gray-100 text-gray-500'
                                        }`}>
                                        #{idx + 1}
                                      </span>
                                    </div>

                                    <div className="flex-1 min-w-0">
                                      <p className="font-semibold text-gray-900 text-sm break-words" title={product.name}>{product.name}</p>
                                      <p className="text-xs text-gray-500">{product.salesCount} transactions</p>
                                      {product.category && product.category !== 'Uncategorized' && (
                                        <span className="inline-flex items-center px-1.5 py-0.5 mt-1 rounded text-xs bg-gray-100 text-gray-900">
                                          {product.category}
                                        </span>
                                      )}
                                    </div>

                                    <div className="flex flex-wrap items-center gap-3 sm:gap-4">
                                      <div className="text-left sm:text-right">
                                        <p className="text-xs text-gray-500">Sales</p>
                                        <p className="font-bold text-gray-900 text-sm">{formatCurrency(product.totalSales)}</p>
                                      </div>

                                      <div className="text-left sm:text-right">
                                        <p className="text-xs text-gray-500">Qty</p>
                                        <p className="font-bold text-gray-900 text-sm">{formatNumber(product.quantity)}</p>
                                      </div>

                                      <div className="flex-1 sm:w-24">
                                        <div className="flex items-center justify-between gap-2 mb-1">
                                          <span className="text-xs font-medium text-gray-600">{percentage.toFixed(0)}%</span>
                                        </div>
                                        <div className="w-full bg-gray-200 rounded-full h-1.5">
                                          <div
                                            className="bg-gradient-to-r from-orange-500 to-orange-600 h-1.5 rounded-full transition-all duration-500"
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
                                          className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-white rounded border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all"
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
                                              <span className="inline-flex items-center px-1.5 py-0.5 mt-1 rounded text-xs bg-gray-100 text-gray-900">
                                                {product.category}
                                              </span>
                                            )}
                                          </div>

                                          <div className="flex flex-wrap items-center gap-3 sm:gap-4">
                                            <div className="text-left sm:text-right">
                                              <p className="text-xs text-gray-500">Sales</p>
                                              <p className="font-bold text-gray-900 text-sm">{formatCurrency(product.totalSales)}</p>
                                            </div>

                                            <div className="text-left sm:text-right">
                                              <p className="text-xs text-gray-500">Qty</p>
                                              <p className="font-bold text-gray-900 text-sm">{formatNumber(product.quantity)}</p>
                                            </div>

                                            <div className="flex-1 sm:w-24">
                                              <div className="flex items-center justify-between gap-2 mb-1">
                                                <span className="text-xs font-medium text-gray-600">{percentage.toFixed(0)}%</span>
                                              </div>
                                              <div className="w-full bg-gray-200 rounded-full h-1.5">
                                                <div
                                                  className="bg-gradient-to-r from-orange-400 to-orange-600 h-1.5 rounded-full transition-all duration-500"
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
                              <div className="mt-4 pt-4 border-t border-gray-200 bg-gray-50 rounded p-3 sm:p-4">
                                {selectedCategoryForMonthly !== 'all' && (
                                  <div className="mb-2 text-center">
                                    <span className="text-xs font-semibold text-gray-900">
                                      Showing: {selectedCategoryForMonthly}
                                    </span>
                                  </div>
                                )}
                                <div className="grid grid-cols-3 gap-2 sm:gap-4 text-center">
                                  <div>
                                    <p className="text-xs text-gray-600">Products</p>
                                    <p className="text-sm sm:text-base md:text-lg font-bold text-gray-900">{productStats.length}</p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-gray-600">Sales</p>
                                    <p className="text-sm sm:text-base md:text-lg font-bold text-gray-900">
                                      {formatCurrency(productStats.reduce((sum, p) => sum + p.totalSales, 0))}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-gray-600">Units</p>
                                    <p className="text-sm sm:text-base md:text-lg font-bold text-gray-900">
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

              )} {/* Status Distribution and Recent Sales */}
              <div className="space-y-4 sm:space-y-6">
                <StatusDistribution stats={stats} sales={sales} navigate={navigate} isLoading={initialSalesLoading} />
                <RecentSales recentSales={recentSales} sales={sales} isLoading={initialSalesLoading} />
              </div>
            </div>
          </div>
        </div>
        <AlertManagement
          showNotifications={showNotifications}
          setShowNotifications={setShowNotifications}
          alerts={alerts}
          loadAlerts={loadAlerts}
          alertsCurrentPage={alertsCurrentPage}
          alertsTotalPages={alertsTotalPages}
          alertsTotalElements={alertsTotalElements}
          alertsLoading={alertsLoading}
          products={products}
          branches={branches}
        />
      </div>
    </>
  );
};

export default Dashboard;