import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import PesoIcon from '../../components/common/PesoIcon';
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
      const productAnalysis = getProductSalesAnalysis();
      setProductSalesData(productAnalysis);
      if (productAnalysis.length > 0 && !selectedProductId) {
        setSelectedProductId(productAnalysis[0].id);
      }
    }
  }, [sales, selectedYear, selectedCompany, selectedBranch, performanceYear, performanceView, performanceMonth, selectedProductId]);

  const loadStats = async () => {
    try {
      setActionLoading(true);
      setLoadingMessage('Loading stats...');
      const [salesRes, deliveriesRes, productsRes, companiesRes, branchesRes] = await Promise.all([
        api.get('/sales'),
        api.get('/deliveries'),
        api.get('/products'),
        api.get('/companies'),
        api.get('/branches'),
      ]);

      const salesData = salesRes.success ? salesRes.data || [] : [];
      const deliveriesData = deliveriesRes.success ? deliveriesRes.data || [] : [];
      const productsData = productsRes.success ? productsRes.data || [] : [];
      const companiesData = companiesRes.success ? companiesRes.data || [] : [];
      const branchesData = branchesRes.success ? branchesRes.data || [] : [];

      setSales(salesData);
      setCompanies(companiesData);
      const availableYears = [...new Set(
        salesData.map(s => s.year || new Date(s.createdAt || s.date).getFullYear())
      )];
      if (availableYears.length > 0 && !availableYears.includes(performanceYear)) {
        setPerformanceYear(Math.max(...availableYears));
      }
      setBranches(branchesData);
      setProducts(productsData);
      setDeliveries(deliveriesData);

      const sortedSales = [...salesData]
        .sort((a, b) => new Date(b.createdAt || b.date || 0) - new Date(a.createdAt || a.date || 0))
        .slice(0, 10);
      setRecentSales(sortedSales);

      const activeSales = salesData.filter(s =>
        s.status === 'CONFIRMED' || s.status === 'INVOICED'
      );
      const pendingDeliveries = deliveriesData.filter(d => d.status === 'PENDING').length;
      const deliveredOrders = deliveriesData.filter(d => d.status === 'DELIVERED').length;

      const activeRevenue = activeSales.reduce((sum, s) => sum + (s.totalAmount || 0), 0);
      const averageOrderValue = activeSales.length > 0
        ? activeRevenue / activeSales.length
        : 0;

      const totalLeads = companiesData.length * 2;
      const conversionRate = salesData.length > 0
        ? (activeSales.length / totalLeads * 100)
        : 0;

      const currentMonth = new Date().getMonth();
      const thisMonthSales = salesData.filter(s => {
        const saleDate = new Date(s.createdAt || s.date);
        return saleDate.getMonth() === currentMonth &&
          (s.status === 'CONFIRMED' || s.status === 'INVOICED');
      });
      const prevMonthSales = salesData.filter(s => {
        const saleDate = new Date(s.createdAt || s.date);
        return saleDate.getMonth() === (currentMonth - 1 + 12) % 12 &&
          (s.status === 'CONFIRMED' || s.status === 'INVOICED');
      });
      const thisMonthRevenue = thisMonthSales.reduce((sum, s) => sum + (s.totalAmount || 0), 0);
      const prevMonthRevenue = prevMonthSales.reduce((sum, s) => sum + (s.totalAmount || 0), 0);
      const revenueGrowth = prevMonthRevenue > 0
        ? ((thisMonthRevenue - prevMonthRevenue) / prevMonthRevenue * 100)
        : thisMonthRevenue > 0 ? 100 : 0;

      const last30Days = salesData.filter(s => {
        const saleDate = new Date(s.createdAt || s.date);
        const daysDiff = (new Date() - saleDate) / (1000 * 60 * 60 * 24);
        return daysDiff <= 30 && (s.status === 'CONFIRMED' || s.status === 'INVOICED');
      });
      const salesVelocity = last30Days.length / 30;

      const productAnalysis = getProductSalesAnalysis();
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

      setStats({
        totalSales: salesData.length,
        activeSales: activeSales.length,
        activeRevenue,
        pendingDeliveries,
        lowStock: productsData.filter(p => p.quantity < 10).length,
        totalCompanies: companiesData.length,
        averageOrderValue: parseFloat(averageOrderValue.toFixed(2)),
        deliveredOrders,
        conversionRate: parseFloat(conversionRate.toFixed(1)),
        revenueGrowth: parseFloat(revenueGrowth.toFixed(1)),
        topProduct,
        salesVelocity: parseFloat(salesVelocity.toFixed(2)),
      });
    } catch (err) {
      console.error('Failed to load dashboard data', err);
      // Handle error appropriately
    } finally {
      setActionLoading(false);
      setLoadingMessage('');
    }
  };

  const loadAlerts = async () => {
    try {
      setActionLoading(true);
      setLoadingMessage('Loading alerts...');
      const alertsRes = await api.get('/alerts');

      if (alertsRes.success && alertsRes.data) {
        const allAlerts = alertsRes.data || [];
        setAlerts(allAlerts);
        setActionLoading(false);
        setLoadingMessage('');
        return;
      }
    } catch (err) {
      console.error('Failed to load from /alerts, trying separate endpoints...', err);
    }

    try {
      const [activeRes, resolvedRes] = await Promise.all([
        api.get('/alerts').catch(() => ({ success: false, data: [] })),
        api.get('/alerts/resolved').catch(() => ({ success: false, data: [] }))
      ]);

      const activeAlerts = (activeRes.success ? activeRes.data || [] : []);
      const resolvedAlerts = (resolvedRes.success ? resolvedRes.data || [] : []);
      const allAlerts = [...activeAlerts, ...resolvedAlerts];

      setAlerts(allAlerts);
    } catch (separateErr) {
      console.error('Failed to load alerts from all endpoints', separateErr);
      setAlerts([]);
    } finally {
      setActionLoading(false);
      setLoadingMessage('');
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
      const statusMatch = (sale.status === 'CONFIRMED' || sale.status === 'INVOICED');
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
        const statusMatch = sale.status === 'CONFIRMED' || sale.status === 'INVOICED';

        if (performanceView === 'overall') {
          return statusMatch;
        }

        const saleYear = sale.year || new Date(sale.createdAt || sale.date).getFullYear();
        const saleMonth = sale.month || (new Date(sale.createdAt || sale.date).getMonth() + 1);

        const yearMatch = saleYear === performanceYear;
        const monthMatch = performanceView === 'month' ? saleMonth === performanceMonth : true;

        return yearMatch && monthMatch && statusMatch;
      });

      // Calculate product performance with variations
      const productPerformance = {};
      filteredSales.forEach(sale => {
        if (sale.status === 'CONFIRMED' || sale.status === 'INVOICED') {
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

      // Calculate branch performance
      const branchPerformance = {};
      filteredSales.forEach(sale => {
        if (sale.status === 'CONFIRMED' || sale.status === 'INVOICED') {
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

      // Calculate top companies
      const companyPerformance = {};
      filteredSales.forEach(sale => {
        if (sale.status === 'CONFIRMED' || sale.status === 'INVOICED') {
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

  const getProductSalesAnalysis = () => {
    const productAnalysis = {};

    const filteredSales = sales.filter(sale => {
      const statusMatch = sale.status === 'CONFIRMED' || sale.status === 'INVOICED';

      if (performanceView === 'overall') {
        return statusMatch;
      }

      const saleYear = sale.year || new Date(sale.createdAt || sale.date).getFullYear();
      const saleMonth = sale.month || (new Date(sale.createdAt || sale.date).getMonth() + 1);

      const yearMatch = saleYear === performanceYear;
      const monthMatch = performanceView === 'month' ? saleMonth === performanceMonth : true;

      return statusMatch && yearMatch && monthMatch;
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

        // Monthly analysis
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

        // Branch analysis
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

        // Company analysis
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
      <LoadingOverlay show={actionLoading} message={loadingMessage || 'Loading...'} />
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 md:p-6">
        <div className="max-w-[1920px] mx-auto space-y-6">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-600 mt-1">Overview of your business performance</p>
          </div>

          <DashboardHeader
            showInsights={showInsights}
            setShowInsights={setShowInsights}
            businessInsights={businessInsights}
            loadStats={loadStats}
            showNotifications={showNotifications}
            setShowNotifications={setShowNotifications}
            alerts={alerts}
          />

          <DashboardCards stats={stats} totalAlerts={totalAlerts} />

          <BusinessInsights
            insights={businessInsights}
            showInsights={showInsights}
            setShowInsights={setShowInsights}
          />

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
          <div className="lg:col-span-3 bg-white rounded-2xl shadow-md p-6 border border-gray-200">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-6 gap-4">
              <div className="flex-1 min-w-0">
                <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2 mb-1">
                  <TrendingUp className="text-blue-600" size={24} />
                  Active Sales Trend ({selectedYear})
                </h3>
                <p className="text-sm text-gray-500">Confirmed & Invoiced sales combined</p>
                {(selectedCompany !== 'all' || selectedBranch !== 'all') && (
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    {selectedCompany !== 'all' && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                        <Users size={12} />
                        {selectedCompany}
                      </span>
                    )}
                    {selectedBranch !== 'all' && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                        <Building size={12} />
                        {selectedBranch}
                      </span>
                    )}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-4 flex-shrink-0">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-green-500 rounded-full"></div>
                  <span className="text-sm font-medium text-gray-700">Active Sales</span>
                </div>

                {selectedCompany !== 'all' || selectedBranch !== 'all' ? (
                  <button
                    onClick={() => {
                      setSelectedCompany('all');
                      setSelectedBranch('all');
                    }}
                    className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors whitespace-nowrap flex items-center gap-2"
                  >
                    <X size={14} />
                    Clear Filters
                  </button>
                ) : null}
              </div>
            </div>

            {/* Chart Filters */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex flex-wrap items-center gap-3 flex-1">
                <div className="flex items-center gap-2">
                  <Calendar size={16} className="text-gray-400" />
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                    className="px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-w-[140px]"
                  >
                    {[...new Set(sales.map(s => s.year || new Date(s.createdAt || s.date).getFullYear()))].map(year => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <UserIcon size={16} className="text-gray-400" />
                  <div className="min-w-[200px]">
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

                <div className="flex items-center gap-2">
                  <Building size={16} className="text-gray-400" />
                  <div className="min-w-[200px]">
                    <SearchableSelect
                      value={selectedBranch}
                      onChange={setSelectedBranch}
                      options={[
                        {
                          value: 'all',
                          label: selectedCompany === 'all' ? 'All Branches' : 'All Branches'
                        },
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

            <SalesTrendChart chartData={chartData} sales={sales} selectedYear={selectedYear} />

            {/* Enhanced Summary Stats */}
            {sales.length > 0 && (
              <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-6 border-t border-gray-200">
                <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-4 rounded-lg border border-blue-200">
                  <div className="flex items-center gap-2 mb-2">
                    <PesoIcon size={20} className="text-blue-600" />
                    <p className="text-xs font-medium text-blue-700 uppercase">Total Sales</p>
                  </div>
                  <p className="text-2xl font-bold text-blue-800">
                    {formatCurrency(monthlySalesData.reduce((sum, month) => sum + month.activeRevenue, 0))}
                  </p>
                  <p className="text-xs text-blue-600 mt-1">For {selectedYear}</p>
                </div>

                <div className="bg-gradient-to-r from-green-50 to-green-100 p-4 rounded-lg border border-green-200">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUpIcon size={20} className="text-green-600" />
                    <p className="text-xs font-medium text-green-700 uppercase">Avg Monthly</p>
                  </div>
                  <p className="text-2xl font-bold text-green-800">
                    {formatCurrency(
                      monthlySalesData.reduce((sum, month) => sum + month.activeRevenue, 0) /
                      Math.max(monthlySalesData.filter(m => m.activeRevenue > 0).length, 1)
                    )}
                  </p>
                  <p className="text-xs text-green-600 mt-1">Per month average</p>
                </div>

                <div className="bg-gradient-to-r from-purple-50 to-purple-100 p-4 rounded-lg border border-purple-200">
                  <div className="flex items-center gap-2 mb-2">
                    <ShoppingCart size={20} className="text-purple-600" />
                    <p className="text-xs font-medium text-purple-700 uppercase">Transactions</p>
                  </div>
                  <p className="text-2xl font-bold text-purple-800">
                    {formatNumber(monthlySalesData.reduce((sum, month) => sum + month.count, 0))}
                  </p>
                  <p className="text-xs text-purple-600 mt-1">Total orders</p>
                </div>

                <div className="bg-gradient-to-r from-amber-50 to-amber-100 p-4 rounded-lg border border-amber-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar size={20} className="text-amber-600" />
                    <p className="text-xs font-medium text-amber-700 uppercase">Best Month</p>
                  </div>
                  <p className="text-2xl font-bold text-amber-800">
                    {(() => {
                      const bestMonth = monthlySalesData.reduce((prev, current) =>
                        (prev.activeRevenue > current.activeRevenue) ? prev : current
                      );
                      return bestMonth.month;
                    })()}
                  </p>
                  <p className="text-xs text-amber-600 mt-1">
                    {formatCurrency(monthlySalesData.reduce((prev, current) =>
                      (prev.activeRevenue > current.activeRevenue) ? prev : current
                    ).activeRevenue)}
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            <div className="lg:col-span-2 bg-white rounded-2xl shadow-md p-6 border border-gray-200">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <Package className="text-purple-600" size={20} />
                    Product Sales by Month ({selectedYear})
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
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

                  // Count unique transactions per product
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

                // Build ALL product stats FIRST (before filtering or slicing)
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
                    <div className="h-64 flex flex-col items-center justify-center text-gray-400">
                      <Package size={48} className="mb-4 opacity-50" />
                      <p className="text-lg">
                        {selectedCategoryForMonthly === 'all'
                          ? 'No product sales data for selected filters'
                          : `No products found in "${selectedCategoryForMonthly}" category`}
                      </p>
                      {selectedCategoryForMonthly !== 'all' && (
                        <button
                          onClick={() => setSelectedCategoryForMonthly('all')}
                          className="mt-3 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm"
                        >
                          View All Categories
                        </button>
                      )}
                    </div>
                  );
                }

                // Take top 5 from FILTERED results for the chart
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
                    <ProductSalesChart productChartData={productChartData} />

                    <div className="mt-6 pt-6 border-t border-gray-200">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                          <Target size={16} className="text-purple-600" />
                          Top Products (Ranked by Sales)
                          {selectedCategoryForMonthly !== 'all' && (
                            <span className="text-xs font-normal text-purple-600">- {selectedCategoryForMonthly}</span>
                          )}
                        </h4>

                        {productCategories.length > 0 && (
                          <div className="relative">
                            <select
                              value={selectedCategoryForMonthly}
                              onChange={(e) => {
                                setSelectedCategoryForMonthly(e.target.value);
                              }}
                              className="px-3 py-1.5 text-xs border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 appearance-none pr-8"
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
                      <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                        {productStats.slice(0, 3).map((product, idx) => {
                          const percentage = productStats[0].totalSales > 0
                            ? (product.totalSales / productStats[0].totalSales * 100)
                            : 0;

                          return (
                            <div
                              key={product.id}
                              className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg border border-gray-200 hover:border-purple-300 hover:bg-purple-50 transition-all"
                            >
                              <div className="flex-shrink-0">
                                <span className={`flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm ${idx === 0 ? 'bg-yellow-100 text-yellow-700 border-2 border-yellow-400' :
                                  idx === 1 ? 'bg-gray-200 text-gray-600 border-2 border-gray-400' :
                                    idx === 2 ? 'bg-orange-100 text-orange-700 border-2 border-orange-400' :
                                      'bg-gray-100 text-gray-500'
                                  }`}>
                                  #{idx + 1}
                                </span>
                              </div>

                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-gray-900 truncate">{product.name}</p>
                                <p className="text-xs text-gray-500">{product.salesCount} transactions</p>
                                {product.category && product.category !== 'Uncategorized' && (
                                  <span className="inline-flex items-center px-1.5 py-0.5 mt-1 rounded text-xs bg-purple-100 text-purple-600">
                                    {product.category}
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-6">
                                <div className="text-right">
                                  <p className="text-xs text-gray-500">Sales</p>
                                  <p className="font-bold text-green-600">{formatCurrency(product.totalSales)}</p>
                                </div>

                                <div className="text-right">
                                  <p className="text-xs text-gray-500">Quantity</p>
                                  <p className="font-bold text-purple-600">{formatNumber(product.quantity)} units</p>
                                </div>

                                <div className="w-24">
                                  <div className="flex items-center justify-end gap-2 mb-1">
                                    <span className="text-xs font-medium text-gray-600">{percentage.toFixed(0)}%</span>
                                  </div>
                                  <div className="w-full bg-gray-200 rounded-full h-2">
                                    <div
                                      className="bg-gradient-to-r from-purple-500 to-purple-600 h-2 rounded-full transition-all duration-500"
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
                            <div className="my-3 border-t border-gray-200 pt-3">
                              <p className="text-xs text-gray-500 text-center mb-2">
                                +{productStats.length - 3} more products (scroll to view)
                              </p>
                            </div>
                            {productStats.slice(3).map((product, idx) => {
                              const actualIdx = idx + 3;
                              const percentage = productStats[0].totalSales > 0
                                ? (product.totalSales / productStats[0].totalSales * 100)
                                : 0;

                              return (
                                <div
                                  key={product.id}
                                  className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg border border-gray-200 hover:border-purple-300 hover:bg-purple-50 transition-all"
                                >
                                  <div className="flex-shrink-0">
                                    <span className="flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm bg-gray-100 text-gray-500">
                                      #{actualIdx + 1}
                                    </span>
                                  </div>

                                  <div className="flex-1 min-w-0">
                                    <p className="font-semibold text-gray-900 truncate">{product.name}</p>
                                    <p className="text-xs text-gray-500">{product.salesCount} transactions</p>
                                    {product.category && product.category !== 'Uncategorized' && (
                                      <span className="inline-flex items-center px-1.5 py-0.5 mt-1 rounded text-xs bg-purple-100 text-purple-600">
                                        {product.category}
                                      </span>
                                    )}
                                  </div>

                                  <div className="flex items-center gap-6">
                                    <div className="text-right">
                                      <p className="text-xs text-gray-500">Sales</p>
                                      <p className="font-bold text-green-600">{formatCurrency(product.totalSales)}</p>
                                    </div>

                                    <div className="text-right">
                                      <p className="text-xs text-gray-500">Quantity</p>
                                      <p className="font-bold text-purple-600">{formatNumber(product.quantity)} units</p>
                                    </div>

                                    <div className="w-24">
                                      <div className="flex items-center justify-end gap-2 mb-1">
                                        <span className="text-xs font-medium text-gray-600">{percentage.toFixed(0)}%</span>
                                      </div>
                                      <div className="w-full bg-gray-200 rounded-full h-2">
                                        <div
                                          className="bg-gradient-to-r from-purple-500 to-purple-600 h-2 rounded-full transition-all duration-500"
                                          style={{ width: `${percentage}%` }}
                                        ></div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </>
                        )}
                      </div>

                      {productStats.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-gray-200 bg-purple-50 rounded-lg p-4">
                          {selectedCategoryForMonthly !== 'all' && (
                            <div className="mb-2 text-center">
                              <span className="text-xs font-semibold text-purple-700">
                                Showing: {selectedCategoryForMonthly}
                              </span>
                            </div>
                          )}
                          <div className="grid grid-cols-3 gap-4 text-center">
                            <div>
                              <p className="text-xs text-gray-600">Total Products</p>
                              <p className="text-lg font-bold text-purple-700">{productStats.length}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-600">Total Sales</p>
                              <p className="text-lg font-bold text-green-700">
                                {formatCurrency(productStats.reduce((sum, p) => sum + p.totalSales, 0))}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-600">Total Units Sold</p>
                              <p className="text-lg font-bold text-blue-700">
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

            <div className="space-y-6">
              <StatusDistribution stats={stats} sales={sales} navigate={navigate} />
              <RecentSales recentSales={recentSales} sales={sales} />
            </div>
          </div>
        </div>

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