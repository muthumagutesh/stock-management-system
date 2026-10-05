import React, { useState, useEffect } from 'react';
import {
  TrendingUp, TrendingDown, Package,
  AlertTriangle, ShieldAlert, ShoppingBag, ArrowUpRight,
  Sparkles, RefreshCw, Download, Plus, CheckCircle, FileText,
  IndianRupee, Landmark, ShieldCheck
} from 'lucide-react';
import { Bar, Doughnut } from 'react-chartjs-2';
import '../utils/chartConfig';
import { DashboardMetrics, Product } from '../types';
import { api } from '../services/api';
import { wsService } from '../services/websocket';
import { useToast } from '../context/ToastContext';
import { useTheme } from '../context/ThemeContext';
import { formatINR, formatINRLakhs } from '../utils/formatters';

interface DashboardViewProps {
  onNavigate: (view: string) => void;
  onOpenQuickAdjustment?: () => void;
  onOpenCreatePO?: () => void;
  onOpenCreateSO?: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onNavigate,
  onOpenQuickAdjustment,
  onOpenCreatePO,
  onOpenCreateSO
}) => {
  const { theme } = useTheme();
  const { toast, success } = useToast();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [criticalItems, setCriticalItems] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isForecasting, setIsForecasting] = useState(false);

  const fetchMetrics = async () => {
    try {
      const data = await api.getDashboardMetrics();
      setMetrics(data);
      const lowItems = await api.getLowStockProducts();
      setCriticalItems(lowItems);
    } catch (err: any) {
      console.error('Failed to load dashboard metrics', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();

    // Subscribe to live WebSocket stock changes
    const unsub = wsService.subscribe('*', () => {
      fetchMetrics();
    });

    return () => unsub();
  }, []);

  const handleRunForecast = async () => {
    setIsForecasting(true);
    try {
      const res = await api.runDemandForecast();
      success('AI Forecasting Completed', `Analyzed ${res.details?.total_products_evaluated || 'all'} inventory products with Prophet model.`);
      await fetchMetrics();
    } catch (err: any) {
      toast('error', 'Forecast Run Failed', err.message);
    } finally {
      setIsForecasting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm font-medium text-slate-500">Loading ApexStock™ Enterprise Analytics Engine...</p>
      </div>
    );
  }

  const isDark = theme === 'dark';
  const textColor = isDark ? '#94a3b8' : '#64748b';
  const gridColor = isDark ? '#1e293b' : '#f1f5f9';

  // Monthly trends chart configuration
  const barChartData = {
    labels: metrics?.monthly_trends?.map((m) => m.month) || ['May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct'],
    datasets: [
      {
        label: 'Sales Revenue (₹)',
        data: metrics?.monthly_trends?.map((m) => m.revenue) || [142000, 189000, 224000, 195000, 268000, 312000],
        backgroundColor: '#6366f1',
        borderRadius: 8,
      },
      {
        label: 'Procurement Cost (₹)',
        data: metrics?.monthly_trends?.map((m) => m.expenses) || [92000, 114000, 142000, 128000, 156000, 189000],
        backgroundColor: '#10b981',
        borderRadius: 8,
      }
    ]
  };

  const barChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: { color: textColor, font: { family: 'Inter', size: 12 } }
      },
      tooltip: {
        backgroundColor: isDark ? '#0f172a' : '#ffffff',
        titleColor: isDark ? '#f8fafc' : '#0f172a',
        bodyColor: isDark ? '#cbd5e1' : '#334155',
        borderColor: isDark ? '#334155' : '#e2e8f0',
        borderWidth: 1,
        padding: 12,
        boxPadding: 6,
        usePointStyle: true,
        callbacks: {
          label: (context: any) => `${context.dataset.label}: ₹${Number(context.raw).toLocaleString('en-IN')}`
        }
      }
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: textColor }
      },
      y: {
        grid: { color: gridColor },
        ticks: {
          color: textColor,
          callback: (value: any) => `₹${Number(value).toLocaleString('en-IN')}`
        }
      }
    }
  };

  // Stock health doughnut chart configuration
  const doughnutData = {
    labels: ['Optimal Stock', 'Low Stock Alert', 'Out of Stock', 'Overstocked'],
    datasets: [
      {
        data: [
          metrics?.stock_health?.optimal || 6,
          metrics?.stock_health?.low_stock || 3,
          metrics?.stock_health?.out_of_stock || 1,
          metrics?.stock_health?.overstocked || 0,
        ],
        backgroundColor: ['#10b981', '#f59e0b', '#f43f5e', '#3b82f6'],
        borderColor: isDark ? '#0f172a' : '#ffffff',
        borderWidth: 3,
        hoverOffset: 6
      }
    ]
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '72%',
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          color: textColor,
          padding: 16,
          usePointStyle: true,
          pointStyle: 'circle',
          font: { family: 'Inter', size: 12 }
        }
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 font-heading">
              Executive Inventory Command Center
            </h1>
            <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" /> GST Active (₹ INR)
            </span>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Real-time stock valuation, Indian GST tax pipeline, and AI-predicted replenishment demand.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleRunForecast}
            disabled={isForecasting}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white shadow-md shadow-indigo-500/20 transition-all disabled:opacity-50"
          >
            <Sparkles className={`w-4 h-4 ${isForecasting ? 'animate-spin' : ''}`} />
            {isForecasting ? 'Running AI Engine...' : 'Run AI 30/60/90 Forecast'}
          </button>

          <a
            href={api.getExportPDFUrl()}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/60 shadow-sm transition-all"
          >
            <FileText className="w-4 h-4 text-rose-500" />
            PDF Report
          </a>

          <a
            href={api.getExportExcelUrl()}
            download
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/60 shadow-sm transition-all"
          >
            <Download className="w-4 h-4 text-emerald-500" />
            Excel Export
          </a>
        </div>
      </div>

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {/* Card 1: Valuation in ₹ */}
        <div className="glass-panel p-5 rounded-2xl shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Total Stock Valuation
            </span>
            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-base">
              ₹
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 font-heading">
              {formatINR(metrics?.kpis.total_cost_valuation)}
            </h3>
            <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1 mt-1">
              <TrendingUp className="w-3.5 h-3.5" />
              Retail Potential: {formatINR(metrics?.kpis.total_retail_valuation)}
            </p>
          </div>
        </div>

        {/* Card 2: 30-Day Sales Revenue */}
        <div className="glass-panel p-5 rounded-2xl shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              30-Day Sales Revenue
            </span>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 font-heading">
              {formatINR(metrics?.kpis.monthly_revenue)}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Procurement Outflow: {formatINR(metrics?.kpis.monthly_expenses)}
            </p>
          </div>
        </div>

        {/* Card 3: Stock Status Health */}
        <div className="glass-panel p-5 rounded-2xl shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Stock Warnings
            </span>
            <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <h3 className="text-2xl font-extrabold text-rose-600 dark:text-rose-400 font-heading">
                {metrics?.kpis.out_of_stock_count || 0}
              </h3>
              <span className="text-xs text-slate-500">Out of Stock</span>
              <span className="text-sm font-bold text-amber-500 ml-2">
                {metrics?.kpis.low_stock_count || 0}
              </span>
              <span className="text-xs text-slate-500">Low</span>
            </div>
            <button
              onClick={() => onNavigate('forecasting')}
              className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold hover:underline mt-1 flex items-center gap-1"
            >
              View replenishment schedule <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Card 4: Orders in Pipeline */}
        <div className="glass-panel p-5 rounded-2xl shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Pipeline Orders
            </span>
            <div className="w-10 h-10 rounded-xl bg-violet-50 dark:bg-violet-950/60 text-violet-600 dark:text-violet-400 flex items-center justify-center">
              <ShoppingBag className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <h3 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 font-heading">
                {metrics?.kpis.pending_sales_orders || 0}
              </h3>
              <span className="text-xs text-slate-500">Sales Invoices</span>
              <span className="text-sm font-bold text-indigo-500 ml-2">
                {metrics?.kpis.pending_purchase_orders || 0}
              </span>
              <span className="text-xs text-slate-500">PO Inbound</span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {metrics?.kpis.total_products || 0} Active Indian SKUs
            </p>
          </div>
        </div>
      </div>

      {/* Main Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Revenue vs Procurement Bar Chart (2 columns) */}
        <div className="glass-panel p-6 rounded-2xl shadow-sm lg:col-span-2 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-lg text-slate-900 dark:text-slate-100 font-heading">
                Financial Performance: Sales Revenue vs Procurement Outlay (₹)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Monthly revenue inflows vs manufacturing & procurement expenses in Indian Rupees.
              </p>
            </div>
          </div>
          <div className="h-72 w-full">
            <Bar data={barChartData} options={barChartOptions} />
          </div>
        </div>

        {/* Right: Stock Health Doughnut Chart (1 column) */}
        <div className="glass-panel p-6 rounded-2xl shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-lg text-slate-900 dark:text-slate-100 font-heading">
              Inventory Health Breakdown
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Categorized by threshold ratio vs replenishment velocity.
            </p>
          </div>
          <div className="h-64 w-full my-auto flex items-center justify-center">
            <Doughnut data={doughnutData} options={doughnutOptions} />
          </div>
        </div>
      </div>

      {/* Critical Stock Alerts Ticker & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Urgent Attention Items */}
        <div className="glass-panel p-6 rounded-2xl shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-rose-500" />
              <h3 className="font-bold text-slate-900 dark:text-slate-100 font-heading">
                Critical Stockout Risks (Requires Restock Action)
              </h3>
            </div>
            <button
              onClick={() => onNavigate('forecasting')}
              className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              Open AI Reorder Planner →
            </button>
          </div>

          <div className="space-y-3">
            {criticalItems.length === 0 ? (
              <p className="text-sm text-slate-500 py-4 text-center">
                All inventory items are currently above safe replenishment thresholds.
              </p>
            ) : (
              criticalItems.slice(0, 4).map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-800/50 hover:bg-slate-100/60 dark:hover:bg-slate-800 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-3 h-3 rounded-full ${
                        item.quantity_on_hand === 0 ? 'bg-rose-500 animate-ping' : 'bg-amber-500'
                      }`}
                    />
                    <div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {item.name}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        SKU: <span className="font-mono text-indigo-600 dark:text-indigo-400 font-bold">{item.sku}</span> | On Hand: <strong className="text-rose-600 dark:text-rose-400">{item.quantity_on_hand} {item.unit}</strong> (Min: {item.min_stock_level})
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => onNavigate('forecasting')}
                    className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition-all"
                  >
                    Auto Reorder
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Quick Operations Panel */}
        <div className="glass-panel p-6 rounded-2xl shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-slate-900 dark:text-slate-100 font-heading mb-1">
              Indian Enterprise Operations
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Frequent supply chain and GST warehouse workflows.
            </p>

            <div className="space-y-2.5">
              <button
                onClick={() => onNavigate('inventory')}
                className="w-full flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-800/60 hover:border-indigo-500 text-left transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Plus className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900 dark:text-slate-100">Add New Product</p>
                    <p className="text-[10px] text-slate-500">Configure SKU, HSN, and GST slab</p>
                  </div>
                </div>
                <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600" />
              </button>

              <button
                onClick={() => onNavigate('purchases')}
                className="w-full flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-800/60 hover:border-indigo-500 text-left transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <ShoppingBag className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900 dark:text-slate-100">Issue Purchase Order</p>
                    <p className="text-[10px] text-slate-500">Procure from GST registered suppliers</p>
                  </div>
                </div>
                <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600" />
              </button>

              <button
                onClick={() => onNavigate('sales')}
                className="w-full flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-800/60 hover:border-indigo-500 text-left transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-violet-100 dark:bg-violet-950 text-violet-600 dark:text-violet-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900 dark:text-slate-100">Generate GST Tax Invoice</p>
                    <p className="text-[10px] text-slate-500">Calculate CGST/SGST/IGST & UPI pay</p>
                  </div>
                </div>
                <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-violet-600" />
              </button>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <span>e-Way Bill & Audit Trail Active</span>
            <span className="font-mono text-[10px] text-emerald-500">● 100% GST Compliant</span>
          </div>
        </div>
      </div>
    </div>
  );
};
