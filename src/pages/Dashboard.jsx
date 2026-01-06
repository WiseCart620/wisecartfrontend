import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import {
  Package, Truck, ShoppingCart, Users, AlertCircle, TrendingUp, Calendar,
  DollarSign, CreditCard, CheckCircle, Clock, Bell, TrendingDown,
  RefreshCw, BarChart, Filter, Download, Eye, Zap, Battery, Currency as PesoSign,
  ArrowUpRight, ArrowDownRight, Database, PieChart, Target, CheckSquare, FileCheck,
  TrendingUp as TrendingUpIcon, TrendingDown as TrendingDownIcon,
  AlertTriangle, Info, CheckCheck, Building, User as UserIcon, Layers, BarChart2, Search, X, Trash2,
  Activity, ChevronDown, ChevronRight
} from 'lucide-react';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend, Filler } from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend, Filler);
import { LoadingOverlay } from './LoadingOverlay';

const formatCurrency = (amount) => {
  if (amount === null || amount === undefined) return '₱0.00';
  return `₱${Number(amount).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const formatNumber = (num) => {
  if (num === null || num === undefined) return '0';
  return Number(num).toLocaleString('en-PH');
};
const SearchableSelect = ({ value, onChange, options, placeholder, disabled }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredOptions = options.filter(option =>
    option.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedOption = options.find(opt => opt.value === value);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white text-left focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 flex items-center justify-between ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-gray-400'
          }`}
      >
        <span className="truncate">{selectedOption?.label || placeholder}</span>
        <Search size={16} className="text-gray-400 ml-2 flex-shrink-0" />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute z-20 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-hidden">
            <div className="p-2 border-b border-gray-200 sticky top-0 bg-white">
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search..."
                  className="w-full pl-9 pr-8 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>
            <div className="overflow-y-auto max-h-48">
              {filteredOptions.length > 0 ? (
                filteredOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => {
                      onChange(option.value);
                      setIsOpen(false);
                      setSearchTerm('');
                    }}
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-100 ${value === option.value ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700'
                      }`}
                  >
                    {option.label}
                  </button>
                ))
              ) : (
                <div className="px-3 py-2 text-sm text-gray-500 text-center">
                  No results found
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};


const AlertBadge = ({ count, type = 'warning' }) => {
  if (!count || count === 0) return null;

  const colors = {
    warning: { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-200', icon: 'text-yellow-600' },
    danger: { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-200', icon: 'text-red-600' },
    info: { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-200', icon: 'text-blue-600' },
    success: { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-200', icon: 'text-green-600' },
  };

  const colorConfig = colors[type];

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${colorConfig.bg} ${colorConfig.text} ${colorConfig.border}`}>
      <Bell size={12} className={`mr-1 ${colorConfig.icon}`} />
      {count} alert{count !== 1 ? 's' : ''}
    </span>
  );
};

const StatusBadge = ({ status }) => {
  const getStatusConfig = (status) => {
    const configs = {
      ACTIVE: {
        bg: 'bg-green-100',
        text: 'text-green-800',
        border: 'border-green-200',
        icon: CheckCheck,
        label: 'Active'
      },
      PENDING: {
        bg: 'bg-yellow-100',
        text: 'text-yellow-800',
        border: 'border-yellow-200',
        icon: Clock,
        label: 'Pending'
      },
      CANCELLED: {
        bg: 'bg-red-100',
        text: 'text-red-800',
        border: 'border-red-200',
        icon: AlertCircle,
        label: 'Cancelled'
      }
    };

    return configs[status] || {
      bg: 'bg-gray-100',
      text: 'text-gray-800',
      border: 'border-gray-200',
      icon: Clock,
      label: status
    };
  };

  const config = getStatusConfig(status);
  const Icon = config.icon;

  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${config.bg} ${config.text} ${config.border}`}>
      <Icon size={12} />
      {config.label}
    </span>
  );
};

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalSales: 0,
    activeSales: 0,
    activeRevenue: 0,
    pendingDeliveries: 0,
    lowStock: 0,
    totalClients: 0,
    averageOrderValue: 0,
    deliveredOrders: 0,
    conversionRate: 0,
    revenueGrowth: 0,
    topProduct: null,
    salesVelocity: 0,
  });

  const navigate = useNavigate();
  const [sales, setSales] = useState([]);
  const [clients, setClients] = useState([]);
  const [branches, setBranches] = useState([]);
  const [products, setProducts] = useState([]);
  const [deliveries, setDeliveries] = useState([]);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedClient, setSelectedClient] = useState('all');
  const [selectedBranch, setSelectedBranch] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [recentSales, setRecentSales] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [alerts, setAlerts] = useState([]);
  const [performanceData, setPerformanceData] = useState({
    topProducts: [],
    topBranches: [],
  });
  const [showInsights, setShowInsights] = useState(false);
  const [businessInsights, setBusinessInsights] = useState([]);
  const [productSalesData, setProductSalesData] = useState([]);
  const [selectedProductId, setSelectedProductId] = useState(null);
  const [availableBranches, setAvailableBranches] = useState([]);
  const [activeTab, setActiveTab] = useState('active');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSeverity, setFilterSeverity] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [actionLoading, setActionLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [selectedClientForBranches, setSelectedClientForBranches] = useState(null);
  const [selectedClientForTopBranches, setSelectedClientForTopBranches] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [productCategories, setProductCategories] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState('all');
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
      // Load product sales data
      const productAnalysis = getProductSalesAnalysis();
      setProductSalesData(productAnalysis);
      if (productAnalysis.length > 0 && !selectedProductId) {
        setSelectedProductId(productAnalysis[0].id);
      }
    }
  }, [sales, selectedYear, selectedClient, selectedBranch, performanceYear, performanceView, performanceMonth, selectedProductId]);


  useEffect(() => {
    const interval = setInterval(() => {
      loadAlerts();
    }, 300000);
    return () => clearInterval(interval);
  }, []);


  useEffect(() => {
    if (selectedClient === 'all') {
      setAvailableBranches(branches);
      setSelectedBranch('all');
    } else {
      // Get branches that have sales for the selected client
      const clientBranches = [...new Set(
        sales
          .filter(s => s.client?.clientName === selectedClient)
          .map(s => s.branch?.branchName)
          .filter(Boolean)
      )];

      const filteredBranches = branches.filter(b =>
        clientBranches.includes(b.branchName)
      );

      setAvailableBranches(filteredBranches);
      setSelectedBranch('all');
    }
  }, [selectedClient, branches, sales]);


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




  const getFilteredAlerts = useMemo(() => {
    let filtered = [...alerts];
    if (activeTab === 'active') {
      filtered = filtered.filter(alert => !alert.isResolved);
    } else if (activeTab === 'resolved') {
      filtered = filtered.filter(alert => alert.isResolved);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(alert =>
        (alert.title && alert.title.toLowerCase().includes(query)) ||
        (alert.message && alert.message.toLowerCase().includes(query)) ||
        (alert.branch?.branchName && alert.branch.branchName.toLowerCase().includes(query)) ||
        (alert.product?.productName && alert.product.productName.toLowerCase().includes(query)) ||
        (alert.severity && alert.severity.toLowerCase().includes(query)) ||
        (alert.alertType && alert.alertType.toLowerCase().includes(query))
      );
    }

    // Apply severity filter
    if (filterSeverity !== 'all') {
      filtered = filtered.filter(alert => alert.severity === filterSeverity);
    }

    // Apply type filter
    if (filterType !== 'all') {
      filtered = filtered.filter(alert => alert.alertType === filterType);
    }

    return filtered;
  }, [alerts, activeTab, searchQuery, filterSeverity, filterType]);


  const getClientBranchBreakdown = (clientName) => {
    const product = productSalesData.find(p => p.id === selectedProductId);
    if (!product) return [];

    // Get all sales for this product and client, filtered by performance view
    const clientSales = sales.filter(sale => {
      const statusMatch = sale.status === 'CONFIRMED' || sale.status === 'INVOICED';
      const clientMatch = sale.client?.clientName === clientName;

      // Check if this sale contains the selected product
      const hasProduct = sale.items?.some(item => item.product?.id === selectedProductId);
      if (!hasProduct) return false;

      // If "Overall" view, no date filtering
      if (performanceView === 'overall') {
        return statusMatch && clientMatch;
      }

      // Filter by year and optionally month
      const saleYear = sale.year || new Date(sale.createdAt || sale.date).getFullYear();
      const saleMonth = sale.month || (new Date(sale.createdAt || sale.date).getMonth() + 1);

      const yearMatch = saleYear === performanceYear;
      const monthMatch = performanceView === 'month' ? saleMonth === performanceMonth : true;

      return statusMatch && clientMatch && yearMatch && monthMatch;
    });

    // Aggregate by branch
    const branchData = {};
    const salesByBranch = {}; // Track unique sales per branch

    clientSales.forEach(sale => {
      const branchName = sale.branch?.branchName || 'Unknown Branch';

      sale.items?.forEach(item => {
        if (item.product?.id === selectedProductId) {
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

    // Update salesCount with unique transaction count
    Object.keys(branchData).forEach(branchName => {
      branchData[branchName].salesCount = salesByBranch[branchName].size;
    });

    // Sort by sales (highest to lowest)
    return Object.values(branchData).sort((a, b) => b.sales - a.sales);
  };


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

      // Calculate product performance
      const productPerformance = {};
      filteredSales.forEach(sale => {
        if (sale.status === 'CONFIRMED' || sale.status === 'INVOICED') {
          sale.items?.forEach(item => {
            const key = item.product?.id;
            if (!productPerformance[key]) {
              const fullProduct = products.find(p => p.id === key);
              productPerformance[key] = {
                id: key,
                name: item.product?.productName || 'Unknown Product',
                category: fullProduct?.category || item.product?.category || 'Uncategorized',
                revenue: 0,
                quantity: 0,
                margin: item.product?.margin || 0,
              };
            }
            productPerformance[key].revenue += item.amount || 0;
            productPerformance[key].quantity += item.quantity || 0;
          });
        }
      });

      const topProducts = Object.values(productPerformance)
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 10);

      // Calculate branch performance - FILTER BY SELECTED PRODUCT
      const branchPerformance = {};
      filteredSales.forEach(sale => {
        if (sale.status === 'CONFIRMED' || sale.status === 'INVOICED') {
          // If a product is selected, only include sales that contain that product
          const hasSelectedProduct = !selectedProductId ||
            sale.items?.some(item => item.product?.id === selectedProductId);

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

          // If product is selected, only count revenue/quantity for that product
          if (selectedProductId) {
            sale.items?.forEach(item => {
              if (item.product?.id === selectedProductId) {
                branchPerformance[key].revenue += item.amount || 0;
                branchPerformance[key].quantity += item.quantity || 0;
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
            branchPerformance[key].revenue / branchPerformance[key].salesCount;
        }
      });

      const topBranches = Object.values(branchPerformance)
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10);

      // Calculate top clients - FILTER BY SELECTED PRODUCT
      const clientPerformance = {};
      filteredSales.forEach(sale => {
        if (sale.status === 'CONFIRMED' || sale.status === 'INVOICED') {
          // If a product is selected, only include sales that contain that product
          const hasSelectedProduct = !selectedProductId ||
            sale.items?.some(item => item.product?.id === selectedProductId);

          if (!hasSelectedProduct) return;

          const key = sale.client?.id;
          if (!clientPerformance[key]) {
            clientPerformance[key] = {
              id: key,
              name: sale.client?.clientName || 'Unknown Client',
              revenue: 0,
              salesCount: 0,
              averageOrderValue: 0,
            };
          }

          // If product is selected, only count revenue for that product
          if (selectedProductId) {
            sale.items?.forEach(item => {
              if (item.product?.id === selectedProductId) {
                clientPerformance[key].revenue += item.amount || 0;
              }
            });
            clientPerformance[key].salesCount += 1;
          } else {
            clientPerformance[key].revenue += sale.totalAmount || 0;
            clientPerformance[key].salesCount += 1;
          }

          clientPerformance[key].averageOrderValue =
            clientPerformance[key].revenue / clientPerformance[key].salesCount;
        }
      });

      const topClients = Object.values(clientPerformance)
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10);

      setPerformanceData({ topProducts, topBranches, topClients });
    } catch (err) {
      console.error('Failed to load performance data', err);
    }
  };

  const getProductSalesAnalysis = () => {
    const productAnalysis = {};

    // Filter sales based on performance view
    const filteredSales = sales.filter(sale => {
      const statusMatch = sale.status === 'CONFIRMED' || sale.status === 'INVOICED';

      // If "Overall" view, include all sales
      if (performanceView === 'overall') {
        return statusMatch;
      }

      // Filter by year and optionally month
      const saleYear = sale.year || new Date(sale.createdAt || sale.date).getFullYear();
      const saleMonth = sale.month || (new Date(sale.createdAt || sale.date).getMonth() + 1);

      const yearMatch = saleYear === performanceYear;
      const monthMatch = performanceView === 'month' ? saleMonth === performanceMonth : true;

      return statusMatch && yearMatch && monthMatch;
    });

    filteredSales.forEach(sale => {
      sale.items?.forEach(item => {
        const productId = item.product?.id;
        const productName = item.product?.productName || 'Unknown Product';
        const branchName = sale.branch?.branchName || 'Unknown Branch';
        const clientName = sale.client?.clientName || 'Unknown Client';

        // FIX: Use sale.month and sale.year if available, otherwise parse from date
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

        if (!productAnalysis[productId]) {
          productAnalysis[productId] = {
            id: productId,
            name: productName,
            totalRevenue: 0,
            totalQuantity: 0,
            byMonth: {},
            byBranch: {},
            byClient: {},
            salesCount: 0
          };
        }

        const product = productAnalysis[productId];
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

        // Client analysis
        if (!product.byClient[clientName]) {
          product.byClient[clientName] = {
            revenue: 0,
            quantity: 0,
            count: 0
          };
        }
        product.byClient[clientName].revenue += item.amount || 0;
        product.byClient[clientName].quantity += item.quantity || 0;
        product.byClient[clientName].count += 1;
      });
    });

    return Object.values(productAnalysis)
      .sort((a, b) => b.totalRevenue - a.totalRevenue);

  };



const getSelectedProductStats = () => {
    if (!selectedProductId) return null;

    const product = productSalesData.find(p => p.id === selectedProductId);
    if (!product) return null;

    // Filter sales based on performance view (year/month)
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

    // Count unique transactions that contain this product (from filtered sales)
    const transactionsWithProduct = new Set();
    let totalRevenue = 0;
    let totalQuantity = 0;

    // Calculate revenue/quantity and count transactions from filtered period
    filteredSales.forEach(sale => {
      const hasProduct = sale.items?.some(item => item.product?.id === selectedProductId);
      
      if (hasProduct) {
        transactionsWithProduct.add(sale.id);
        
        sale.items?.forEach(item => {
          if (item.product?.id === selectedProductId) {
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



  const getProductChartData = (productId) => {
    if (!productId) return null;

    // Filter sales based on performance view
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

    // Calculate client data from filtered sales
    const clientData = {};

    filteredSales.forEach(sale => {
      const clientName = sale.client?.clientName || 'Unknown Client';

      sale.items?.forEach(item => {
        if (item.product?.id === productId) {
          if (!clientData[clientName]) {
            clientData[clientName] = {
              revenue: 0,
              quantity: 0
            };
          }
          clientData[clientName].revenue += item.amount || 0;
          clientData[clientName].quantity += item.quantity || 0;
        }
      });
    });

    // Sort clients by revenue
    const clients = Object.keys(clientData).sort((a, b) =>
      clientData[b].revenue - clientData[a].revenue
    );

    if (clients.length === 0) return null;

    const labels = clients;
    const salesData = clients.map(client => clientData[client].revenue);
    const quantityData = clients.map(client => clientData[client].quantity);

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

  const loadStats = async () => {
    try {
      setActionLoading(true)
      setLoadingMessage('loading stats');
      const [salesRes, deliveriesRes, productsRes, clientsRes, branchesRes] = await Promise.all([
        api.get('/sales'),
        api.get('/deliveries'),
        api.get('/products'),
        api.get('/clients'),
        api.get('/branches'),
      ]);

      const salesData = salesRes.success ? salesRes.data || [] : [];
      const deliveriesData = deliveriesRes.success ? deliveriesRes.data || [] : [];
      const productsData = productsRes.success ? productsRes.data || [] : [];
      const clientsData = clientsRes.success ? clientsRes.data || [] : [];
      const branchesData = branchesRes.success ? branchesRes.data || [] : [];

      setSales(salesData);
      setClients(clientsData);
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


      const totalLeads = clientsData.length * 2;
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
        totalClients: clientsData.length,
        averageOrderValue: parseFloat(averageOrderValue.toFixed(2)),
        deliveredOrders,
        conversionRate: parseFloat(conversionRate.toFixed(1)),
        revenueGrowth: parseFloat(revenueGrowth.toFixed(1)),
        topProduct,
        salesVelocity: parseFloat(salesVelocity.toFixed(2)),
      });
    } catch (err) {
      console.error('Failed to load dashboard data', err);
      toast('Failed to load dashboard data: ' + err.message);
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
      // Try to get year from sale.year first, then from date
      const saleYear = sale.year || new Date(sale.createdAt || sale.date).getFullYear();
      const yearMatch = saleYear === selectedYear;

      const statusMatch = (sale.status === 'CONFIRMED' || sale.status === 'INVOICED');

      // Client filter
      const clientMatch = selectedClient === 'all' || sale.client?.clientName === selectedClient;

      // Branch filter
      const branchMatch = selectedBranch === 'all' || sale.branch?.branchName === selectedBranch;

      return yearMatch && statusMatch && clientMatch && branchMatch;
    });

    filteredSales.forEach(sale => {
      // Use sale.month if available, otherwise extract from date
      const monthIndex = sale.month ? sale.month - 1 : new Date(sale.createdAt || sale.date).getMonth();

      if (monthIndex >= 0 && monthIndex < 12) {
        const amount = sale.totalAmount || 0;
        monthlyData[monthIndex].count += 1;
        monthlyData[monthIndex].activeRevenue += amount;
      }
    });

    return monthlyData;
  };


  const getProductMonthlySales = () => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const productMonthlyData = {};
    const productQuantityData = {};
    const productSalesCount = {};

    const filteredSales = sales.filter(sale => {
      const saleYear = sale.year || new Date(sale.createdAt || sale.date).getFullYear();
      const yearMatch = saleYear === selectedYear;
      const statusMatch = (sale.status === 'CONFIRMED' || sale.status === 'INVOICED');
      const clientMatch = selectedClient === 'all' || sale.client?.clientName === selectedClient;
      const branchMatch = selectedBranch === 'all' || sale.branch?.branchName === selectedBranch;

      return yearMatch && statusMatch && clientMatch && branchMatch;
    });

    filteredSales.forEach(sale => {
      const monthIndex = sale.month ? sale.month - 1 : new Date(sale.createdAt || sale.date).getMonth();

      sale.items?.forEach(item => {
        const productName = item.product?.productName || 'Unknown';
        if (!productMonthlyData[productName]) {
          productMonthlyData[productName] = months.map(() => 0);
          productQuantityData[productName] = 0;
          productSalesCount[productName] = 0;
        }
        productMonthlyData[productName][monthIndex] += item.amount || 0;
        productQuantityData[productName] += item.quantity || 0;
      });
    });

    // Count unique transactions per product
    filteredSales.forEach(sale => {
      const productsInSale = new Set();
      sale.items?.forEach(item => {
        const productName = item.product?.productName || 'Unknown';
        productsInSale.add(productName);
      });
      productsInSale.forEach(productName => {
        if (productSalesCount[productName] !== undefined) {
          productSalesCount[productName] += 1;
        }
      });
    });

    return { months, products: productMonthlyData, quantities: productQuantityData, salesCounts: productSalesCount };
  };



  const getSalesByStatus = () => {
    const normalizedSales = sales.map(sale => ({
      ...sale,
      displayStatus: (sale.status === 'CONFIRMED' || sale.status === 'INVOICED') ? 'ACTIVE' : sale.status
    }));

    const statusCounts = normalizedSales.reduce((acc, sale) => {
      acc[sale.displayStatus] = (acc[sale.displayStatus] || 0) + 1;
      return acc;
    }, {});

    const statusRevenue = normalizedSales.reduce((acc, sale) => {
      const amount = sale.totalAmount || 0;
      acc[sale.displayStatus] = (acc[sale.displayStatus] || 0) + amount;
      return acc;
    }, {});

    return {
      counts: statusCounts,
      revenues: statusRevenue
    };
  };

  const totalAlerts = alerts.length;

  const cards = [
    {
      title: 'Active Sales',
      value: formatNumber(stats.activeSales),
      icon: ShoppingCart,
      color: 'green',
      description: `Total: ${formatNumber(stats.totalSales)} sales`,
      trend: stats.salesVelocity,
      trendLabel: 'sales/day'
    },
    {
      title: 'Active Alerts',
      value: totalAlerts,
      icon: Bell,
      color: totalAlerts > 0 ? 'red' : 'green',
      description: totalAlerts > 0 ? 'Requires attention' : 'All good',
      badge: totalAlerts > 0 ? <AlertBadge count={totalAlerts} type="danger" /> : null
    },
    {
      title: 'Active Sales',
      value: formatCurrency(stats.activeRevenue),
      icon: PesoSign,
      color: 'blue',
      description: `Growth: ${stats.revenueGrowth > 0 ? '+' : ''}${stats.revenueGrowth}%`,
      trend: stats.revenueGrowth
    },
    {
      title: 'Avg. Order Value',
      value: formatCurrency(stats.averageOrderValue),
      icon: CreditCard,
      color: 'purple',
      description: 'Based on active sales'
    },

    {
      title: 'Sales Velocity',
      value: `${stats.salesVelocity.toFixed(1)}/day`,
      icon: TrendingUpIcon,
      color: 'green',
      description: 'Last 30 days average'
    },
  ];




  const salesByStatus = getSalesByStatus();
  const availableYears = [...new Set(sales
    .map(s => s.year || new Date(s.createdAt || s.date).getFullYear())
    .filter(year => !isNaN(year) && year > 1900)
  )].sort((a, b) => b - a);


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
  }, [sales, selectedYear, selectedClient, selectedBranch]);


  const monthlySalesData = getMonthlySalesData();


  const filteredTopProducts = useMemo(() => {
    let products = performanceData.topProducts || [];

    // Filter by category
    if (selectedCategory !== 'all') {
      products = products.filter(product =>
        product.category === selectedCategory
      );
    }

    // Filter by product search
    if (selectedProduct !== 'all') {
      products = products.filter(product =>
        product.id === selectedProduct
      );
    }

    return products;
  }, [performanceData.topProducts, selectedCategory, selectedProduct]);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'top',
        labels: {
          padding: 20,
          usePointStyle: true,
          pointStyle: 'circle'
        }
      },
      tooltip: {
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        titleColor: '#1f2937',
        bodyColor: '#4b5563',
        borderColor: '#e5e7eb',
        borderWidth: 1,
        padding: 12,
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
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
        grid: {
          color: 'rgba(229, 231, 235, 0.5)',
        },
        ticks: {
          color: '#6b7280',
          padding: 10,
          callback: function (value) {
            if (value >= 1000000) {
              return '₱' + (value / 1000000).toFixed(1) + 'M';
            }
            if (value >= 1000) {
              return '₱' + (value / 1000).toFixed(0) + 'K';
            }
            return '₱' + value.toFixed(0);
          }
        }
      },
      x: {
        grid: {
          color: 'rgba(229, 231, 235, 0.5)',
        },
        ticks: {
          color: '#6b7280',
          padding: 10,
        }
      }
    },
    interaction: {
      intersect: false,
      mode: 'index',
    },
    animation: {
      duration: 1000,
      easing: 'easeOutQuart'
    }
  };


  const statusChartData = {
    labels: Object.keys(salesByStatus.counts),
    datasets: [
      {
        label: 'Sales Count',
        data: Object.keys(salesByStatus.counts).map(status => salesByStatus.counts[status]),
        backgroundColor: [
          'rgba(16, 185, 129, 0.8)',
          'rgba(245, 158, 11, 0.8)',
          'rgba(239, 68, 68, 0.8)',
        ],
        borderColor: [
          '#10B981',
          '#F59E0B',
          '#EF4444',
        ],
        borderWidth: 2,
      }
    ]
  };






  return (
    <>
      <LoadingOverlay show={actionLoading} message={loadingMessage || 'Loading...'} />
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 md:p-6">
        <div className="max-w-[1920px] mx-auto space-y-6">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-600 mt-1">Overview of your business performance</p>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <button
              onClick={() => setShowInsights(!showInsights)}
              className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-lg hover:opacity-90 transition-all"
            >
              <Info size={18} />
              Business Insights
              {businessInsights.length > 0 && (
                <span className="bg-white text-purple-700 text-xs rounded-full px-2 py-1">
                  {businessInsights.length}
                </span>
              )}
            </button>
            <button
              onClick={() => loadStats()}
              className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <RefreshCw size={18} />
              Refresh Data
            </button>

            {/* Add this Alert Notifications Button */}
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Bell size={18} />
              Alerts
              {alerts.length > 0 && (
                <>
                  <span className="bg-red-500 text-white text-xs rounded-full px-2 py-1">
                    {alerts.length}
                  </span>
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse"></span>
                </>
              )}
            </button>
          </div>

          {/* Status Overview Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            {cards.map((card, i) => {
              const Icon = card.icon;
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
                <div key={i} className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 p-5 border border-gray-200">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm text-gray-500 font-medium">{card.title}</p>
                        {card.trend !== undefined && trendIcon && (
                          <div className="flex items-center gap-1">
                            {trendIcon}
                            <span className={`text-xs font-medium ${card.trend > 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {card.trendLabel ? `${Math.abs(card.trend)} ${card.trendLabel}` : `${Math.abs(card.trend)}%`}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-end gap-2">
                        <p className="text-2xl font-bold text-gray-900">{card.value}</p>
                        {card.badge}
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <p className="text-xs text-gray-400">{card.description}</p>
                        {card.subtitle && (
                          <p className="text-xs text-gray-500">{card.subtitle}</p>
                        )}
                      </div>
                    </div>
                    <div className={`ml-4 p-3 rounded-xl ${bgColor} bg-opacity-10`}>
                      <Icon size={24} className={`text-${card.color}-600`} />
                    </div>
                  </div>
                  <div className={`mt-4 h-1 rounded-full ${bgColor} bg-opacity-20`}>
                    <div className={`h-full rounded-full ${bgColor}`} style={{ width: '100%' }}></div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Business Insights Panel */}
          {showInsights && businessInsights.length > 0 && (
            <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-2xl shadow-md p-6 border border-purple-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-purple-900 flex items-center gap-2">
                  <Info className="text-purple-600" size={20} />
                  Business Insights
                </h3>
                <button
                  onClick={() => setShowInsights(false)}
                  className="text-purple-600 hover:text-purple-800"
                >
                  ✕
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {businessInsights.map((insight, idx) => {
                  const Icon = insight.icon;
                  const typeColors = {
                    positive: 'bg-green-100 border-green-300 text-green-800',
                    warning: 'bg-yellow-100 border-yellow-300 text-yellow-800',
                    info: 'bg-blue-100 border-blue-300 text-blue-800',
                  };

                  return (
                    <div key={idx} className={`p-4 rounded-lg border ${typeColors[insight.type]}`}>
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-lg ${insight.type === 'positive' ? 'bg-green-200' :
                          insight.type === 'warning' ? 'bg-yellow-200' : 'bg-blue-200'
                          }`}>
                          <Icon size={20} />
                        </div>
                        <div>
                          <h4 className="font-semibold">{insight.title}</h4>
                          <p className="text-sm mt-1">{insight.message}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4">
            {/* Combined Product Analysis Box */}
            <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200">
              <div className="grid grid-cols-12 gap-4">
                {/* Top Performing Products - Takes 4 columns */}

                <div className="col-span-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                      <Target className="text-green-600" size={18} />
                      Top Performing Products
                    </h3>

                    <div className="flex items-center gap-2">
                      {/* Year/Month View Toggle */}
                      {/* Overall/Year/Month View Toggle */}
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

                      {/* Year Selector - Only show when not in Overall view */}
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

                      {/* Month Selector - Only show when view is 'month' */}
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

                      {/* Category Filter Dropdown */}
                      {productCategories.length > 0 && (
                        <div className="relative">
                          <select
                            value={selectedCategory}
                            onChange={(e) => {
                              setSelectedCategory(e.target.value);
                              setSelectedProductId(null);
                              setSelectedProduct('all'); // Reset product search when changing category
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
                    {/* Category Summary */}
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
                            setSelectedClientForBranches(null);
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
                              {/* Show category badge */}
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

                          {/* Clean metrics display */}
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

                          {/* Additional info */}
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

                  {/* Category Statistics */}
                  {selectedCategory === 'all' && productCategories.length > 0 && filteredTopProducts.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <h4 className="text-xs font-semibold text-gray-700 mb-2">Top Categories</h4>
                      <div className="space-y-2">
                        {(() => {
                          // Calculate revenue by category
                          const categoryRevenue = {};
                          filteredTopProducts.forEach(product => {
                            const category = product.category || 'Uncategorized';
                            if (!categoryRevenue[category]) {
                              categoryRevenue[category] = { revenue: 0, count: 0 };
                            }
                            categoryRevenue[category].revenue += product.revenue;
                            categoryRevenue[category].count += 1;
                          });

                          // Get top 3 categories by revenue
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

                {/* Product Analysis Detail - Takes 8 columns */}
                <div className="col-span-8 border-l border-gray-200 pl-4">
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

                      {/* Product Summary - Compact */}
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

                      {/* Product Chart or Client Branch Breakdown */}
                      {!selectedClientForBranches ? (
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
                        /* Client Branch Breakdown - Compact */
                        <div className="space-y-2">
                          <div className="flex items-center justify-between bg-gradient-to-r from-purple-50 to-blue-50 p-2 rounded-lg border border-purple-200">
                            <div className="flex items-center gap-2">
                              <Building className="text-purple-600" size={16} />
                              <div>
                                <h4 className="text-sm font-bold text-gray-900">{selectedClientForBranches}</h4>
                                <p className="text-xs text-gray-600">Branch Breakdown</p>
                              </div>
                            </div>
                            <button
                              onClick={() => setSelectedClientForBranches(null)}
                              className="px-2 py-1 bg-white border border-gray-300 rounded text-xs hover:bg-gray-50 transition-colors flex items-center gap-1"
                            >
                              <X size={12} />
                              Back
                            </button>
                          </div>

                          <div className="space-y-2 max-h-[300px] overflow-y-auto">
                            {(() => {
                              const branches = getClientBranchBreakdown(selectedClientForBranches);
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

                                    {/* Sales Bar */}
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

                                    {/* Quantity Bar */}
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
                  {/* Top Clients & Branches Section */}
                  <div className="mt-6 pt-6 border-t border-gray-200">
                    <div className="grid grid-cols-2 gap-4">
                      {/* Top Clients */}
                      <div>
                        <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                          <Users size={16} className="text-blue-600" />
                          Top Clients ({performanceView === 'overall'
                            ? 'All Time'
                            : performanceView === 'year'
                              ? performanceYear
                              : `${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][performanceMonth - 1]} ${performanceYear}`
                          })
                        </h4>
                        <div className="space-y-2 max-h-[400px] overflow-y-auto">
                          {performanceData.topClients && performanceData.topClients.length > 0 ? (
                            performanceData.topClients.map((client, idx) => {
                              const maxRevenue = performanceData.topClients[0]?.revenue || 1;
                              const barWidth = (client.revenue / maxRevenue) * 100;

                              return (
                                <div
                                  key={client.id || idx}
                                  className={`p-3 rounded-lg border transition-all cursor-pointer ${selectedClientForTopBranches === client.name
                                    ? 'bg-blue-50 border-blue-500 shadow-md'
                                    : 'bg-gray-50 border-gray-200 hover:border-blue-300'
                                    }`}
                                  onClick={() => setSelectedClientForTopBranches(
                                    selectedClientForTopBranches === client.name ? null : client.name
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
                                      <p className="text-sm font-semibold text-gray-900 truncate">{client.name}</p>
                                    </div>
                                  </div>
                                  <div className="space-y-1">
                                    <div className="flex justify-between items-center text-xs">
                                      <span className="text-gray-600">Sales</span>
                                      <span className="font-bold text-green-600">{formatCurrency(client.revenue)}</span>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-2">
                                      <div
                                        className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full transition-all duration-500"
                                        style={{ width: `${barWidth}%` }}
                                      ></div>
                                    </div>
                                    <div className="flex justify-between items-center text-xs text-gray-500">
                                      <span>{client.salesCount} sales</span>
                                      <span>Avg/Sale: {formatCurrency(client.averageOrderValue)}</span>
                                    </div>
                                  </div>
                                </div>
                              );
                            })
                          ) : (
                            <div className="text-center py-6 text-gray-400">
                              <Users size={24} className="mx-auto mb-2 opacity-50" />
                              <p className="text-sm">No client data for this period</p>
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
                          {selectedClientForTopBranches && (
                            <span className="text-xs font-normal text-blue-600">
                              - {selectedClientForTopBranches}
                            </span>
                          )}
                        </h4>
                        <div className="space-y-2 max-h-[400px] overflow-y-auto">
                          {(() => {
                            let branchesToShow = performanceData.topBranches || [];

                            if (selectedClientForTopBranches) {
                              const clientSales = sales.filter(sale => {
                                const statusMatch = sale.status === 'CONFIRMED' || sale.status === 'INVOICED';
                                const clientMatch = sale.client?.clientName === selectedClientForTopBranches;

                                // If product is selected, only include sales that have this product
                                if (selectedProductId) {
                                  const hasProduct = sale.items?.some(item => item.product?.id === selectedProductId);
                                  if (!hasProduct) return false;
                                }

                                if (performanceView === 'overall') {
                                  return statusMatch && clientMatch;
                                }

                                const saleYear = sale.year || new Date(sale.createdAt || sale.date).getFullYear();
                                const saleMonth = sale.month || (new Date(sale.createdAt || sale.date).getMonth() + 1);

                                const yearMatch = saleYear === performanceYear;
                                const monthMatch = performanceView === 'month' ? saleMonth === performanceMonth : true;

                                return statusMatch && clientMatch && yearMatch && monthMatch;
                              });

                              const branchRevenue = {};
                              const salesByBranch = {}; // Track unique sales per branch

                              clientSales.forEach(sale => {
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

                                // If product is selected, only count revenue for that product
                                if (selectedProductId) {
                                  sale.items?.forEach(item => {
                                    if (item.product?.id === selectedProductId) {
                                      branchRevenue[branchId].revenue += item.amount || 0;
                                      branchRevenue[branchId].quantity += item.quantity || 0;
                                    }
                                  });
                                  salesByBranch[branchId].add(sale.id); // Track unique sale
                                } else {
                                  branchRevenue[branchId].revenue += sale.totalAmount || 0;
                                  sale.items?.forEach(item => {
                                    branchRevenue[branchId].quantity += item.quantity || 0;
                                  });
                                  salesByBranch[branchId].add(sale.id); // Track unique sale
                                }
                              });

                              // Update salesCount with unique transaction count
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
                                // Calculate max revenue from the current filtered branches
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
                                      {/* Sales Bar */}
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

                                      {/* Quantity Bar */}
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

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-3 bg-white rounded-2xl shadow-md p-6 border border-gray-200">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-6 gap-4">
                <div className="flex-1 min-w-0">
                  <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2 mb-1">
                    <TrendingUp className="text-blue-600" size={24} />
                    Active Sales Trend ({selectedYear})
                  </h3>
                  <p className="text-sm text-gray-500">Confirmed & Invoiced sales combined</p>
                  {(selectedClient !== 'all' || selectedBranch !== 'all') && (
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      {selectedClient !== 'all' && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                          <Users size={12} />
                          {selectedClient}
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

                  {selectedClient !== 'all' || selectedBranch !== 'all' ? (
                    <button
                      onClick={() => {
                        setSelectedClient('all');
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

              {/* Chart Filters - Compact horizontal layout */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex flex-wrap items-center gap-3 flex-1">
                  <div className="flex items-center gap-2">
                    <Calendar size={16} className="text-gray-400" />
                    <select
                      value={selectedYear}
                      onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                      className="px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-w-[140px]"
                    >
                      {availableYears.length > 0 ? (
                        availableYears.map(year => (
                          <option key={year} value={year}>{year}</option>
                        ))
                      ) : (
                        <option value={new Date().getFullYear()}>{new Date().getFullYear()}</option>
                      )}
                    </select>
                  </div>

                  <div className="flex items-center gap-2">
                    <UserIcon size={16} className="text-gray-400" />
                    <div className="min-w-[200px]">
                      <SearchableSelect
                        value={selectedClient}
                        onChange={setSelectedClient}
                        options={[
                          { value: 'all', label: 'All Clients' },
                          ...clients.map(client => ({
                            value: client.clientName,
                            label: client.clientName
                          }))
                        ]}
                        placeholder="Filter by Client"
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
                            label: selectedClient === 'all' ? 'All Branches' : 'All Branches'
                          },
                          ...availableBranches.map(branch => ({
                            value: branch.branchName,
                            label: branch.branchName
                          }))
                        ]}
                        placeholder="Filter by Branch"
                        disabled={selectedClient === 'all' && availableBranches.length === 0}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* EXTENDED Chart Container */}
              <div className="relative w-full" style={{ height: '400px' }}>
                {sales.length > 0 ? (
                  <div className="w-full h-full">
                    <Line
                      data={chartData}
                      options={{
                        ...chartOptions,
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          ...chartOptions.plugins,
                          legend: {
                            display: true,
                            position: 'top',
                            align: 'start',
                            labels: {
                              padding: 20,
                              usePointStyle: true,
                              pointStyle: 'circle',
                              font: {
                                size: 14,
                                weight: 'bold'
                              }
                            }
                          },
                          title: {
                            display: false
                          }
                        },
                        scales: {
                          y: {
                            beginAtZero: true,
                            grid: {
                              color: 'rgba(229, 231, 235, 0.8)',
                              drawBorder: false,
                            },
                            border: {
                              display: false
                            },
                            ticks: {
                              color: '#6b7280',
                              padding: 10,
                              font: {
                                size: 12
                              },
                              callback: function (value) {
                                if (value >= 1000000) {
                                  return '₱' + (value / 1000000).toFixed(1) + 'M';
                                }
                                if (value >= 1000) {
                                  return '₱' + (value / 1000).toFixed(0) + 'K';
                                }
                                return '₱' + value.toFixed(0);
                              }
                            },
                            title: {
                              display: true,
                              text: 'Revenue (₱)',
                              color: '#4b5563',
                              font: {
                                size: 14,
                                weight: 'bold'
                              },
                              padding: { top: 20, bottom: 20 }
                            }
                          },
                          x: {
                            grid: {
                              color: 'rgba(229, 231, 235, 0.5)',
                            },
                            border: {
                              display: false
                            },
                            ticks: {
                              color: '#6b7280',
                              padding: 10,
                              font: {
                                size: 12
                              }
                            }
                          }
                        },
                        interaction: {
                          intersect: false,
                          mode: 'index',
                        },
                        elements: {
                          line: {
                            tension: 0.4,
                            borderWidth: 3
                          },
                          point: {
                            radius: 5,
                            hoverRadius: 8,
                            borderWidth: 2,
                            borderColor: '#ffffff'
                          }
                        }
                      }}
                    />
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-gray-400">
                    <TrendingUp size={64} className="mb-4 opacity-50" />
                    <p className="text-xl font-semibold">No sales data available</p>
                    <p className="text-sm mt-2">Try selecting different filters or check back later</p>
                  </div>
                )}
              </div>

              {/* Enhanced Summary Stats */}
              {sales.length > 0 && (
                <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-6 border-t border-gray-200">
                  <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-4 rounded-lg border border-blue-200">
                    <div className="flex items-center gap-2 mb-2">
                      <PesoSign size={20} className="text-blue-600" />
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

            {/* Product Sales Chart */}
            <div className="lg:col-span-2 bg-white rounded-2xl shadow-md p-6 border border-gray-200">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <Package className="text-purple-600" size={20} />
                    Product Sales by Month ({selectedYear})
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    {selectedClient !== 'all' && selectedBranch !== 'all'
                      ? `${selectedClient} - ${selectedBranch}`
                      : selectedClient !== 'all' && selectedBranch === 'all'
                        ? `${selectedClient} - All Branches`
                        : selectedBranch !== 'all'
                          ? `All Clients - ${selectedBranch}`
                          : 'All Clients - All Branches'
                    }
                  </p>
                </div>
              </div>

              {(() => {
                const productData = getProductMonthlySales();
                const productList = Object.keys(productData.products).slice(0, 5); // Top 5 products

                if (productList.length === 0) {
                  return (
                    <div className="h-64 flex flex-col items-center justify-center text-gray-400">
                      <Package size={48} className="mb-4 opacity-50" />
                      <p className="text-lg">No product sales data for selected filters</p>
                    </div>
                  );
                }

                const colors = [
                  { border: '#8B5CF6', bg: 'rgba(139, 92, 246, 0.1)' },
                  { border: '#EC4899', bg: 'rgba(236, 72, 153, 0.1)' },
                  { border: '#F59E0B', bg: 'rgba(245, 158, 11, 0.1)' },
                  { border: '#10B981', bg: 'rgba(16, 185, 129, 0.1)' },
                  { border: '#3B82F6', bg: 'rgba(59, 130, 246, 0.1)' },
                ];

                const productChartData = {
                  labels: productData.months,
                  datasets: productList.map((productName, idx) => ({
                    label: productName,
                    data: productData.products[productName],
                    borderColor: colors[idx % colors.length].border,
                    backgroundColor: colors[idx % colors.length].bg,
                    borderWidth: 2,
                    tension: 0.4,
                    fill: true,
                  }))
                };


                const productStats = Object.entries(productData.products)
                  .map(([name, monthlyData]) => {
                    const totalSales = monthlyData.reduce((sum, val) => sum + val, 0);
                    const quantity = productData.quantities[name] || 0;
                    const salesCount = productData.salesCounts[name] || 0;

                    const productInfo = productSalesData.find(p => p.name === name);
                    const category = productInfo ? products.find(p => p.id === productInfo.id)?.category || 'Uncategorized' : 'Uncategorized';

                    return {
                      name,
                      totalSales,
                      quantity,
                      salesCount,
                      category
                    };
                  })
                  .filter(product => {
                    // Filter by selected category
                    if (selectedCategory === 'all') return true;
                    return product.category === selectedCategory;
                  })
                  .sort((a, b) => b.totalSales - a.totalSales);

                return (
                  <>
                    <div style={{ height: '350px' }}>
                      <Line data={productChartData} options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: {
                            display: true,
                            position: 'top',
                          },
                          tooltip: {
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
                            ticks: {
                              callback: function (value) {
                                if (value >= 1000000) return '₱' + (value / 1000000).toFixed(1) + 'M';
                                if (value >= 1000) return '₱' + (value / 1000).toFixed(0) + 'K';
                                return '₱' + value;
                              }
                            }
                          }
                        }
                      }} />
                    </div>

                    {/* Product List Below Chart */}
                    <div className="mt-6 pt-6 border-t border-gray-200">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                          <Target size={16} className="text-purple-600" />
                          Top Products (Ranked by Sales)
                        </h4>

                        {/* Category Filter for Top Products */}
                        {productCategories.length > 0 && (
                          <div className="relative">
                            <select
                              value={selectedCategory}
                              onChange={(e) => {
                                setSelectedCategory(e.target.value);
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
                              key={idx}
                              className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg border border-gray-200 hover:border-purple-300 hover:bg-purple-50 transition-all"
                            >
                              {/* Rank Badge */}
                              <div className="flex-shrink-0">
                                <span className={`flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm ${idx === 0 ? 'bg-yellow-100 text-yellow-700 border-2 border-yellow-400' :
                                  idx === 1 ? 'bg-gray-200 text-gray-600 border-2 border-gray-400' :
                                    idx === 2 ? 'bg-orange-100 text-orange-700 border-2 border-orange-400' :
                                      'bg-gray-100 text-gray-500'
                                  }`}>
                                  #{idx + 1}
                                </span>
                              </div>

                              {/* Product Info */}
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-gray-900 truncate">{product.name}</p>
                                <p className="text-xs text-gray-500">{product.salesCount} transactions</p>
                              </div>

                              {/* Stats */}
                              <div className="flex items-center gap-6">
                                {/* Sales */}
                                <div className="text-right">
                                  <p className="text-xs text-gray-500">Sales</p>
                                  <p className="font-bold text-green-600">{formatCurrency(product.totalSales)}</p>
                                </div>

                                {/* Quantity */}
                                <div className="text-right">
                                  <p className="text-xs text-gray-500">Quantity</p>
                                  <p className="font-bold text-purple-600">{formatNumber(product.quantity)} units</p>
                                </div>

                                {/* Percentage Bar */}
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

                        {/* Show scrollable list if more than 3 products */}
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
                                  key={actualIdx}
                                  className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg border border-gray-200 hover:border-purple-300 hover:bg-purple-50 transition-all"
                                >
                                  {/* Rank Badge */}
                                  <div className="flex-shrink-0">
                                    <span className="flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm bg-gray-100 text-gray-500">
                                      #{actualIdx + 1}
                                    </span>
                                  </div>

                                  {/* Product Info */}
                                  <div className="flex-1 min-w-0">
                                    <p className="font-semibold text-gray-900 truncate">{product.name}</p>
                                    <p className="text-xs text-gray-500">{product.salesCount} transactions</p>
                                  </div>

                                  {/* Stats */}
                                  <div className="flex items-center gap-6">
                                    {/* Sales */}
                                    <div className="text-right">
                                      <p className="text-xs text-gray-500">Sales</p>
                                      <p className="font-bold text-green-600">{formatCurrency(product.totalSales)}</p>
                                    </div>

                                    {/* Quantity */}
                                    <div className="text-right">
                                      <p className="text-xs text-gray-500">Quantity</p>
                                      <p className="font-bold text-purple-600">{formatNumber(product.quantity)} units</p>
                                    </div>

                                    {/* Percentage Bar */}
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


                      {/* Summary */}
                      {productStats.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-gray-200 bg-purple-50 rounded-lg p-4">
                          {selectedCategory !== 'all' && (
                            <div className="mb-2 text-center">
                              <span className="text-xs font-semibold text-purple-700">
                                Showing: {selectedCategory}
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

            {/* Status Distribution & Recent Sales */}
            <div className="space-y-6">
              {/* Status Distribution */}
              <div className="bg-white rounded-2xl shadow-md p-6 border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <PieChart className="text-blue-600" size={20} />
                  Sales Status Overview
                </h3>
                {Object.keys(salesByStatus.counts).length > 0 ? (
                  <>
                    {/* Status Cards with Visual Indicators */}
                    <div className="space-y-3 mb-6">
                      {Object.entries(salesByStatus.counts).map(([status, count]) => {
                        const revenue = salesByStatus.revenues[status] || 0;
                        const percentage = stats.totalSales > 0 ? ((count / stats.totalSales) * 100).toFixed(1) : 0;

                        const statusConfig = {
                          ACTIVE: {
                            color: 'green',
                            bg: 'bg-green-50',
                            border: 'border-green-200',
                            text: 'text-green-700',
                            icon: CheckCheck
                          },
                          PENDING: {
                            color: 'yellow',
                            bg: 'bg-yellow-50',
                            border: 'border-yellow-200',
                            text: 'text-yellow-700',
                            icon: Clock
                          },
                          CANCELLED: {
                            color: 'red',
                            bg: 'bg-red-50',
                            border: 'border-red-200',
                            text: 'text-red-700',
                            icon: AlertCircle
                          }
                        };

                        const config = statusConfig[status] || statusConfig.PENDING;
                        const Icon = config.icon;

                        return (
                          <div key={status} className={`${config.bg} border ${config.border} rounded-lg p-4 transition-all hover:shadow-md`}>
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-2">
                                <div className={`p-2 rounded-lg bg-white border ${config.border}`}>
                                  <Icon size={18} className={config.text} />
                                </div>
                                <div>
                                  <StatusBadge status={status} />
                                  <p className="text-xs text-gray-500 mt-1">{percentage}% of total</p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className={`text-2xl font-bold ${config.text}`}>{count}</p>
                                <p className="text-xs text-gray-500">sales</p>
                              </div>
                            </div>

                            <div className="space-y-2">
                              <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-600">Sales</span>
                                <span className="text-sm font-semibold text-gray-900">{formatCurrency(revenue)}</span>
                              </div>
                              <div className="w-full bg-white rounded-full h-2 border border-gray-200">
                                <div
                                  className={`h-full rounded-full bg-${config.color}-500`}
                                  style={{ width: `${percentage}%` }}
                                ></div>
                              </div>
                              {count > 0 && (
                                <div className="flex justify-between items-center text-xs text-gray-500">
                                  <span>Avg: {formatCurrency(revenue / count)}</span>
                                  <span>{((revenue / stats.activeRevenue) * 100).toFixed(1)}% of active Sales</span>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Summary Stats */}
                    <div className="grid grid-cols-3 gap-3 pt-4 border-t border-gray-200">
                      <div className="text-center">
                        <p className="text-xs text-gray-500">Total Sales</p>
                        <p className="text-lg font-bold text-gray-900">{formatNumber(stats.totalSales)}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-gray-500">Total Sales</p>
                        <p className="text-lg font-bold text-blue-700">
                          {formatCurrency(Object.values(salesByStatus.revenues).reduce((a, b) => a + b, 0))}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-gray-500">Conversion</p>
                        <p className="text-lg font-bold text-green-700">
                          {stats.totalSales > 0 ? ((stats.activeSales / stats.totalSales) * 100).toFixed(1) : 0}%
                        </p>
                      </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            navigate('/sales?status=PENDING');
                          }}
                          className="flex-1 px-3 py-2 text-xs bg-yellow-100 text-yellow-700 rounded-lg hover:bg-yellow-200 transition-colors font-medium"
                        >
                          View Pending ({salesByStatus.counts.PENDING || 0})
                        </button>
                        <button
                          onClick={() => {
                            navigate('/sales?status=ACTIVE');
                          }}
                          className="flex-1 px-3 py-2 text-xs bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors font-medium"
                        >
                          View Active ({salesByStatus.counts.ACTIVE || 0})
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="h-48 flex items-center justify-center text-gray-400">
                    <div className="text-center">
                      <Database size={32} className="opacity-50 mx-auto mb-3" />
                      <p>No sales data</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Recent Sales */}
              <div className="bg-white rounded-2xl shadow-md p-6 border border-gray-200">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <Clock className="text-gray-600" size={20} />
                    Recent Sales Activity
                  </h3>
                  <span className="text-sm text-gray-500">
                    {sales.length} total sales
                  </span>
                </div>
                <div className="space-y-3 max-h-80 overflow-y-auto">
                  {recentSales.length > 0 ? (
                    recentSales.map((sale, index) => {
                      // Safe date parsing with fallback
                      let dateStr = 'No date';
                      try {
                        if (sale.createdAt) {
                          const parsedDate = new Date(sale.createdAt);
                          if (!isNaN(parsedDate.getTime())) {
                            dateStr = parsedDate.toLocaleDateString('en-PH', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            });
                          }
                        } else if (sale.month && sale.year) {
                          // Fallback to month/year if createdAt is not available
                          const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                          dateStr = `${monthNames[sale.month - 1]} ${sale.year}`;
                        }
                      } catch (e) {
                        console.error('Error parsing date for sale:', sale.id, e);
                        // Final fallback to month/year
                        if (sale.month && sale.year) {
                          const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                          dateStr = `${monthNames[sale.month - 1]} ${sale.year}`;
                        }
                      }

                      return (
                        <div key={index} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors border border-gray-100">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="font-medium text-gray-900 truncate">
                                {sale.client?.clientName || 'Unknown Client'}
                              </p>
                              <StatusBadge
                                status={
                                  (sale.status === 'CONFIRMED' || sale.status === 'INVOICED')
                                    ? 'ACTIVE'
                                    : sale.status || 'PENDING'
                                }
                              />
                            </div>
                            <p className="text-xs text-gray-500">
                              {dateStr}
                              {sale.branch?.branchName && ` • ${sale.branch.branchName}`}
                            </p>
                          </div>
                          <div className="text-right ml-4">
                            <p className="font-semibold text-gray-900">{formatCurrency(sale.totalAmount || 0)}</p>
                            <p className="text-xs text-gray-500">
                              {sale.items?.length || 0} item{(sale.items?.length || 0) !== 1 ? 's' : ''}
                            </p>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-8 text-gray-400">
                      <ShoppingCart size={32} className="mx-auto mb-3 opacity-50" />
                      <p>No recent sales</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>


        {/* Alert Notifications Modal */}
        {showNotifications && (
          <>
            <div
              className="fixed inset-0 bg-black/70 z-40 transition-opacity"
              onClick={() => setShowNotifications(false)}
            />
            <div className="fixed left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 w-11/12 max-w-6xl h-5/6 bg-white rounded-2xl shadow-2xl z-50 border border-gray-200 overflow-hidden flex flex-col">
              <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-red-50 to-orange-50 flex-shrink-0">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <Bell className="text-red-600" size={24} />
                    <div>
                      <h3 className="text-2xl font-bold text-gray-900">Alert Management</h3>
                      <p className="text-sm text-gray-600 mt-1">
                        {alerts.length === 0
                          ? 'No alerts at the moment'
                          : `${alerts.filter(a => !a.isResolved).length} active, ${alerts.filter(a => a.isResolved).length} resolved alerts`}
                      </p>
                    </div>
                    {alerts.filter(a => !a.isResolved).length > 0 && (
                      <span className="bg-red-600 text-white text-sm font-semibold rounded-full px-3 py-1">
                        {alerts.filter(a => !a.isResolved).length} active
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={async () => {
                        try {
                          const response = await api.get('/alerts/export');

                          if (response.success && response.data) {
                            const blob = new Blob([response.data], { type: 'text/csv' });
                            const url = window.URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `resolved-alerts-${new Date().toISOString().split('T')[0]}.csv`;
                            document.body.appendChild(a);
                            a.click();
                            window.URL.revokeObjectURL(url);
                            document.body.removeChild(a);

                            const deleteResponse = await api.delete('/alerts/resolved');
                            if (deleteResponse.success) {
                              await loadAlerts();
                              const deletedCount = deleteResponse.data || 0;
                              alert(`Downloaded and cleared ${deletedCount} resolved alerts`);
                            }
                          }
                        } catch (err) {
                          console.error('Failed to process resolved alerts', err);
                          alert('Failed to process resolved alerts: ' + err.message);
                        }
                      }}
                      className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                      title="Download resolved alerts as CSV and clear them from the system"
                    >
                      <Download size={18} />
                      Download & Clear Resolved
                    </button>

                    {/* Resolve All button */}
                    {alerts.filter(a => !a.isResolved).length > 0 && (
                      <button
                        onClick={async () => {
                          if (window.confirm(`Resolve all ${alerts.filter(a => !a.isResolved).length} active alerts?`)) {
                            try {
                              const activeAlerts = alerts.filter(alert => !alert.isResolved);
                              for (const alert of activeAlerts) {
                                await api.put(`/alerts/${alert.id}/resolve`, {
                                  resolvedBy: 'admin',
                                  notes: 'Resolved all via dashboard'
                                });
                              }
                              await loadAlerts();
                              alert(`Resolved ${activeAlerts.length} alerts`);
                            } catch (err) {
                              console.error('Failed to resolve alerts', err);
                              alert('Failed to resolve alerts: ' + err.message);
                            }
                          }
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        <CheckCheck size={18} />
                        Resolve All
                      </button>
                    )}

                    <button
                      onClick={() => setShowNotifications(false)}
                      className="p-2 hover:bg-gray-200 rounded-full transition-colors"
                    >
                      <X size={24} />
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex border-b border-gray-200 bg-gray-50">
                <button
                  className={`px-6 py-3 font-medium text-sm ${activeTab === 'active' ? 'bg-white border-t border-l border-r border-gray-200 text-blue-600' : 'text-gray-600 hover:text-gray-900'}`}
                  onClick={() => setActiveTab('active')}
                >
                  Active Alerts ({alerts.filter(a => !a.isResolved).length})
                </button>
                <button
                  className={`px-6 py-3 font-medium text-sm ${activeTab === 'resolved' ? 'bg-white border-t border-l border-r border-gray-200 text-green-600' : 'text-gray-600 hover:text-gray-900'}`}
                  onClick={() => setActiveTab('resolved')}
                >
                  Resolved ({alerts.filter(a => a.isResolved).length})
                </button>
              </div>

              <div className="flex-1 overflow-y-auto">
                {(() => {
                  // Get alerts for current tab
                  const tabAlerts = activeTab === 'active'
                    ? alerts.filter(alert => !alert.isResolved)
                    : alerts.filter(alert => alert.isResolved);
                  if (tabAlerts.length === 0) {
                    return (
                      <div className="h-full flex flex-col items-center justify-center p-8">
                        {activeTab === 'active' ? (
                          <>
                            <CheckCircle className="text-green-500 mb-4" size={80} />
                            <p className="text-2xl font-semibold text-gray-700">No Active Alerts</p>
                            <p className="text-gray-500 text-lg mt-2">All alerts have been addressed</p>
                            {alerts.filter(a => a.isResolved).length > 0 && (
                              <button
                                onClick={() => setActiveTab('resolved')}
                                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                              >
                                View {alerts.filter(a => a.isResolved).length} Resolved Alerts
                              </button>
                            )}
                          </>
                        ) : (
                          <>
                            <Database className="text-blue-500 mb-4" size={80} />
                            <p className="text-2xl font-semibold text-gray-700">No Resolved Alerts</p>
                            <p className="text-gray-500 text-lg mt-2">No alerts have been resolved yet</p>
                            {alerts.filter(a => !a.isResolved).length > 0 && (
                              <button
                                onClick={() => setActiveTab('active')}
                                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                              >
                                View {alerts.filter(a => !a.isResolved).length} Active Alerts
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    );
                  }

                  return (
                    <>
                      <div className="p-4 bg-gray-50 border-b border-gray-200">
                        <div className="flex items-center justify-between">
                          <p className="text-sm text-gray-600">
                            Showing {tabAlerts.length} {activeTab === 'active' ? 'active' : 'resolved'} alerts
                          </p>
                        </div>
                      </div>

                      <div className="divide-y divide-gray-100">
                        {tabAlerts.map((alert, index) => {
                          // Determine alert styling
                          let alertConfig = {
                            icon: AlertCircle,
                            iconColor: 'text-yellow-600',
                            bgColor: 'bg-yellow-50',
                            borderColor: 'border-yellow-200',
                            severityColor: 'bg-yellow-100 text-yellow-800'
                          };

                          if (alert.severity === 'CRITICAL') {
                            alertConfig = {
                              icon: AlertTriangle,
                              iconColor: 'text-red-600',
                              bgColor: 'bg-red-50',
                              borderColor: 'border-red-200',
                              severityColor: 'bg-red-100 text-red-800'
                            };
                          } else if (alert.severity === 'HIGH') {
                            alertConfig = {
                              icon: AlertTriangle,
                              iconColor: 'text-orange-600',
                              bgColor: 'bg-orange-50',
                              borderColor: 'border-orange-200',
                              severityColor: 'bg-orange-100 text-orange-800'
                            };
                          } else if (alert.severity === 'MEDIUM') {
                            alertConfig = {
                              icon: Info,
                              iconColor: 'text-blue-600',
                              bgColor: 'bg-blue-50',
                              borderColor: 'border-blue-200',
                              severityColor: 'bg-blue-100 text-blue-800'
                            };
                          } else if (alert.severity === 'LOW') {
                            alertConfig = {
                              icon: Bell,
                              iconColor: 'text-gray-600',
                              bgColor: 'bg-gray-50',
                              borderColor: 'border-gray-200',
                              severityColor: 'bg-gray-100 text-gray-800'
                            };
                          }

                          if (alert.isResolved) {
                            alertConfig.icon = CheckCircle;
                            alertConfig.iconColor = 'text-green-600';
                            alertConfig.bgColor = 'bg-green-50';
                            alertConfig.borderColor = 'border-green-200';
                            alertConfig.severityColor = 'bg-green-100 text-green-800';
                          }

                          const Icon = alertConfig.icon;
                          const alertDate = (() => {
                            try {
                              if (alert.createdAt) {
                                const date = new Date(alert.createdAt);
                                return !isNaN(date.getTime()) ? date : new Date();
                              }
                            } catch (e) {
                              console.error('Error parsing alert date:', e);
                            }
                            return new Date();
                          })();

                          const resolvedDate = (() => {
                            try {
                              if (alert.resolvedAt) {
                                const date = new Date(alert.resolvedAt);
                                return !isNaN(date.getTime()) ? date : null;
                              }
                            } catch (e) {
                              console.error('Error parsing resolved date:', e);
                            }
                            return null;
                          })();
                          return (
                            <div
                              key={alert.id || index}
                              className={`p-6 hover:bg-gray-50 transition-colors ${alertConfig.bgColor} border-b ${alertConfig.borderColor}`}
                            >
                              <div className="flex gap-4">
                                <div className={`p-3 rounded-xl ${alertConfig.bgColor} ${alertConfig.iconColor} flex-shrink-0`}>
                                  <Icon size={24} />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-start justify-between mb-3">
                                    <div>
                                      <div className="flex items-center gap-3 mb-2 flex-wrap">
                                        <h4 className="font-bold text-gray-900 text-lg truncate">
                                          {alert.title || `Alert #${alert.id || index + 1}`}
                                        </h4>
                                        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${alertConfig.severityColor}`}>
                                          {alert.severity || 'MEDIUM'}
                                        </span>
                                        {alert.alertType && (
                                          <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                                            {alert.alertType.replace(/_/g, ' ')}
                                          </span>
                                        )}
                                        {alert.isResolved && (
                                          <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded font-medium">
                                            RESOLVED
                                          </span>
                                        )}
                                      </div>
                                      <p className="text-gray-700 text-base">
                                        {alert.message || 'No message provided'}
                                      </p>
                                    </div>
                                    <div className="text-right text-sm text-gray-500 whitespace-nowrap">
                                      <div className="font-medium">
                                        {alertDate.toLocaleDateString('en-PH', {
                                          month: 'short',
                                          day: 'numeric',
                                          year: 'numeric'
                                        })}
                                      </div>
                                      <div className="text-xs">
                                        {alertDate.toLocaleTimeString('en-PH', {
                                          hour: '2-digit',
                                          minute: '2-digit'
                                        })}
                                      </div>
                                      {resolvedDate && (
                                        <div className="mt-2 pt-2 border-t border-gray-200">
                                          <div className="text-xs text-gray-400">Resolved:</div>
                                          <div className="text-xs">
                                            {resolvedDate.toLocaleDateString('en-PH', {
                                              month: 'short',
                                              day: 'numeric'
                                            })}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </div>

                                  {/* Alert Details */}
                                  {(alert.branch || alert.product || alert.currentValue !== null) && (
                                    <div className="grid grid-cols-3 gap-4 mt-4">
                                      {alert.branch && (
                                        <div className="bg-white p-3 rounded-lg border border-gray-200">
                                          <p className="text-xs text-gray-500">Branch</p>
                                          <p className="font-semibold text-gray-900 truncate">
                                            {alert.branch.branchName}
                                          </p>
                                          <p className="text-xs text-gray-500 truncate">{alert.branch.branchCode}</p>
                                        </div>
                                      )}

                                      {alert.product && (
                                        <div className="bg-white p-3 rounded-lg border border-gray-200">
                                          <p className="text-xs text-gray-500">Product</p>
                                          <p className="font-semibold text-gray-900 truncate">
                                            {alert.product.productName}
                                          </p>
                                          <p className="text-xs text-gray-500 truncate">{alert.product.sku}</p>
                                        </div>
                                      )}

                                      {(alert.currentValue !== null || alert.thresholdValue !== null) && (
                                        <div className="bg-white p-3 rounded-lg border border-gray-200">
                                          <p className="text-xs text-gray-500">
                                            {alert.currentValue !== null ? 'Current / Threshold' : 'Threshold'}
                                          </p>
                                          <div className="flex items-baseline gap-2">
                                            {alert.currentValue !== null && (
                                              <span className="font-bold text-lg">
                                                {alert.currentValue}
                                              </span>
                                            )}
                                            {alert.thresholdValue !== null && (
                                              <>
                                                {alert.currentValue !== null && (
                                                  <span className="text-gray-400">/</span>
                                                )}
                                                <span className="font-semibold text-gray-700">
                                                  {alert.thresholdValue}
                                                </span>
                                              </>
                                            )}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  )}

                                  {/* Action Buttons for active alerts */}
                                  {!alert.isResolved && (
                                    <div className="flex items-center justify-between mt-6">
                                      <div className="flex items-center gap-2 text-sm text-gray-500">
                                        {alert.saleId && (
                                          <span className="px-2 py-1 bg-gray-100 rounded text-xs">
                                            Sale #{alert.saleId}
                                          </span>
                                        )}
                                        {alert.referenceId && (
                                          <span className="px-2 py-1 bg-gray-100 rounded text-xs">
                                            Ref: {alert.referenceId}
                                          </span>
                                        )}
                                      </div>

                                      <div className="flex items-center gap-3">
                                        <button
                                          onClick={async () => {
                                            if (window.confirm(`Mark alert "${alert.title}" as resolved?`)) {
                                              try {
                                                const response = await api.put(`/alerts/${alert.id}/resolve`, {
                                                  resolvedBy: 'admin',
                                                  notes: 'Resolved manually'
                                                });

                                                if (response.success) {
                                                  // Immediately update the local state
                                                  setAlerts(prevAlerts =>
                                                    prevAlerts.map(a =>
                                                      a.id === alert.id
                                                        ? { ...a, isResolved: true, resolvedAt: new Date().toISOString(), resolvedBy: 'admin' }
                                                        : a
                                                    )
                                                  );

                                                  // Then reload to get fresh data
                                                  await loadAlerts();

                                                  alert('Alert resolved successfully');
                                                }
                                              } catch (err) {
                                                console.error('Failed to resolve alert', err);
                                                alert('Failed to resolve alert: ' + err.message);
                                              }
                                            }
                                          }}
                                          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                                        >
                                          <CheckCircle size={16} />
                                          Mark as Resolved
                                        </button>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  );
                })()}
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-gray-200 bg-gray-50 flex-shrink-0">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-600">
                    {alerts.length === 0 ? (
                      'No alerts in the system'
                    ) : (
                      <>
                        {alerts.filter(a => !a.isResolved).length} active, {alerts.filter(a => a.isResolved).length} resolved alerts
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={loadAlerts}
                      className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm"
                    >
                      <RefreshCw size={16} />
                      Refresh
                    </button>
                    {alerts.filter(a => a.isResolved).length > 0 && (
                      <button
                        onClick={async () => {
                          if (window.confirm(`Delete all ${alerts.filter(a => a.isResolved).length} resolved alerts?`)) {
                            try {
                              const response = await api.delete('/alerts/resolved');
                              if (response.success) {
                                await loadAlerts();
                                toast(`Deleted resolved alerts`);
                              }
                            } catch (err) {
                              console.error('Failed to delete resolved alerts', err);
                              toast('Failed to delete resolved alerts: ' + err.message);
                            }
                          }
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
                      >
                        <Trash2 size={16} />
                        Delete All Resolved
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
};

export default Dashboard;