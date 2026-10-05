import React, { useState, useEffect } from 'react';
import {
  BarChart3, PieChart, FileText, Download, TrendingUp,
  History, ArrowDownRight, ArrowUpRight, Filter, RefreshCw
} from 'lucide-react';
import { Bar } from 'react-chartjs-2';
import '../utils/chartConfig';
import { Product, StockMovement, Category } from '../types';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';
import { useTheme } from '../context/ThemeContext';

export const ReportsView: React.FC = () => {
  const { theme } = useTheme();
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [prods, cats, movs] = await Promise.all([
          api.getProducts(),
          api.getCategories(),
          api.getStockMovements()
        ]);
        setProducts(prods);
        setCategories(cats);
        setMovements(movs);
      } catch (err: any) {
        toast('error', 'Failed to load report data', err.message);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  const isDark = theme === 'dark';
  const textColor = isDark ? '#94a3b8' : '#64748b';
  const gridColor = isDark ? '#1e293b' : '#f1f5f9';

  // Category valuation chart
  const categoryChartData = {
    labels: categories.map((c) => c.name.length > 20 ? c.name.slice(0, 18) + '...' : c.name),
    datasets: [
      {
        label: 'Inventory Valuation ($)',
        data: categories.map((c) => {
          const prodsInCat = products.filter((p) => p.category === c.id);
          return prodsInCat.reduce((sum, p) => sum + Number(p.total_cost_value || 0), 0);
        }),
        backgroundColor: '#6366f1',
        borderRadius: 8,
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (context: any) => `Valuation: $${context.raw.toLocaleString()}`
        }
      }
    },
    scales: {
      x: { grid: { display: false }, ticks: { color: textColor } },
      y: {
        grid: { color: gridColor },
        ticks: {
          color: textColor,
          callback: (value: any) => `$${value.toLocaleString()}`
        }
      }
    }
  };

  const totalCostVal = products.reduce((s, p) => s + Number(p.total_cost_value || 0), 0);
  const totalRetailVal = products.reduce((s, p) => s + Number(p.total_retail_value || 0), 0);
  const unrealizedProfit = totalRetailVal - totalCostVal;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 font-heading">
            Inventory Analytics & Valuation Reports
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Financial asset breakdown, category distribution, and complete stock movements ledger.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <a
            href={api.getExportPDFUrl()}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-500/25 transition-all"
          >
            <FileText className="w-4 h-4" />
            Download PDF Valuation
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

      {/* Financial Valuation Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-panel p-5 rounded-2xl shadow-sm">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Asset Cost (At FIFO Cost)</span>
          <h3 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 font-heading mt-2">
            ${totalCostVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </h3>
          <p className="text-xs text-slate-400 mt-1">Book asset valuation across {products.length} catalog items</p>
        </div>

        <div className="glass-panel p-5 rounded-2xl shadow-sm">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Projected Retail Value</span>
          <h3 className="text-2xl font-extrabold text-indigo-600 dark:text-indigo-400 font-heading mt-2">
            ${totalRetailVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </h3>
          <p className="text-xs text-slate-400 mt-1">Gross potential revenue at current list pricing</p>
        </div>

        <div className="glass-panel p-5 rounded-2xl shadow-sm">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Unrealized Gross Profit Margin</span>
          <h3 className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 font-heading mt-2">
            ${unrealizedProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </h3>
          <p className="text-xs text-emerald-500 font-semibold mt-1">
            {totalRetailVal > 0 ? ((unrealizedProfit / totalRetailVal) * 100).toFixed(1) : 0}% Projected Margin
          </p>
        </div>
      </div>

      {/* Category Distribution Bar Chart */}
      <div className="glass-panel p-6 rounded-2xl shadow-sm">
        <h3 className="font-bold text-lg text-slate-900 dark:text-slate-100 font-heading mb-1">
          Valuation by Product Category
        </h3>
        <p className="text-xs text-slate-500 mb-4">Capital allocation across manufacturing departments.</p>
        <div className="h-64 w-full">
          <Bar data={categoryChartData} options={chartOptions} />
        </div>
      </div>

      {/* Movement Ledger Table */}
      <div className="glass-panel rounded-2xl shadow-sm overflow-hidden border border-slate-200 dark:border-slate-800">
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-900 dark:text-slate-100 font-heading">
              Transaction Ledger & Physical Movements
            </h3>
            <p className="text-xs text-slate-500">Every inbound receipt, sales dispatch, and manual audit correction.</p>
          </div>
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
            {movements.length} Total Records
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/50 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                <th className="py-2.5 px-4">Timestamp</th>
                <th className="py-2.5 px-4">Movement Type</th>
                <th className="py-2.5 px-4">Product / SKU</th>
                <th className="py-2.5 px-4 text-center">Delta</th>
                <th className="py-2.5 px-4 text-center">Stock Balance</th>
                <th className="py-2.5 px-4">Reference</th>
                <th className="py-2.5 px-4">Authorized By</th>
                <th className="py-2.5 px-4">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              {movements.slice(0, 15).map((m) => {
                const isIn = m.movement_type === 'IN';
                const isOut = m.movement_type === 'OUT';

                return (
                  <tr key={m.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-2.5 px-4 font-mono text-[11px] text-slate-500">
                      {new Date(m.timestamp).toLocaleString()}
                    </td>
                    <td className="py-2.5 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          isIn
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : isOut
                            ? 'bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-300'
                            : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                        }`}
                      >
                        {isIn && <ArrowDownRight className="w-3 h-3" />}
                        {isOut && <ArrowUpRight className="w-3 h-3" />}
                        {m.movement_type}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 font-semibold text-slate-900 dark:text-slate-100">
                      {m.product_name} <span className="font-mono font-normal text-slate-400">({m.product_sku})</span>
                    </td>
                    <td className="py-2.5 px-4 text-center font-bold font-mono">
                      {isIn ? `+${m.quantity}` : isOut ? `-${m.quantity}` : `±${m.quantity}`} {m.product_unit}
                    </td>
                    <td className="py-2.5 px-4 text-center font-mono">
                      <span className="text-slate-400">{m.previous_stock}</span> →{' '}
                      <strong className="text-slate-900 dark:text-slate-100">{m.new_stock}</strong>
                    </td>
                    <td className="py-2.5 px-4 font-mono font-semibold text-indigo-600 dark:text-indigo-400">
                      {m.reference_number || 'N/A'}
                    </td>
                    <td className="py-2.5 px-4 text-slate-600 dark:text-slate-400">
                      {m.created_by_name || 'System Auto'}
                    </td>
                    <td className="py-2.5 px-4 text-slate-500 truncate max-w-xs">{m.notes || '-'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
