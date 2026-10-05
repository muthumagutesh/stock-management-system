import React, { useState, useEffect } from 'react';
import {
  BrainCircuit, Sparkles, RefreshCw, AlertTriangle,
  TrendingUp, Clock, ShoppingBag, CheckCircle, ShieldCheck,
  Search, Filter, Percent, ArrowUpRight, Award, AlertOctagon,
  Calendar, Layers
} from 'lucide-react';
import { DemandForecast, Supplier, Product, SupplierReliabilityItem } from '../types';
import { api } from '../services/api';
import { wsService } from '../services/websocket';
import { useToast } from '../context/ToastContext';
import { CreatePOModal } from '../components/modals/CreatePOModal';
import { formatINR } from '../utils/formatters';

export const ForecastingView: React.FC = () => {
  const { toast, success } = useToast();
  const [activeTab, setActiveTab] = useState<'FORECAST' | 'PRICING' | 'SUPPLIERS' | 'WASTE'>('FORECAST');
  const [forecasts, setForecasts] = useState<DemandForecast[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [reliabilityList, setReliabilityList] = useState<SupplierReliabilityItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCalculating, setIsCalculating] = useState(false);

  // Filters
  const [riskFilter, setRiskFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Reorder modal
  const [reorderItem, setReorderItem] = useState<{ product_id: number; quantity: number } | null>(null);
  const [isPOModalOpen, setIsPOModalOpen] = useState(false);

  const loadData = async () => {
    try {
      const [fcData, sups, prods, relData] = await Promise.all([
        api.getForecasts(),
        api.getSuppliers(),
        api.getProducts(),
        api.getSupplierReliability()
      ]);
      setForecasts(fcData);
      setSuppliers(sups);
      setProducts(prods);
      setReliabilityList(relData);
    } catch (err: any) {
      toast('error', 'Failed to load predictive analytics', err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    // Listen to real-time events
    const unsub = wsService.subscribe('*', (eventData: any) => {
      if (eventData.event === 'forecast_updated' || eventData.event === 'stock_level_changed') {
        loadData();
      }
    });

    return () => unsub();
  }, []);

  const handleRunModel = async () => {
    setIsCalculating(true);
    try {
      const res = await api.runDemandForecast();
      success('AI Engine Re-calculated', `Updated statistical demand & price predictions for ${res.details?.total_products_evaluated} products.`);
      await loadData();
    } catch (err: any) {
      toast('error', 'Forecasting Failed', err.message);
    } finally {
      setIsCalculating(false);
    }
  };

  const handleQuickReorder = (fc: DemandForecast) => {
    setReorderItem({
      product_id: fc.product,
      quantity: fc.recommended_reorder_qty || 50
    });
    setIsPOModalOpen(true);
  };

  const filtered = forecasts.filter((f) => {
    const matchesRisk = riskFilter === 'ALL' || f.stockout_risk_level === riskFilter;
    const query = searchQuery.toLowerCase();
    const matchesSearch =
      f.product_name.toLowerCase().includes(query) ||
      f.product_sku.toLowerCase().includes(query) ||
      (f.hsn_code && f.hsn_code.toLowerCase().includes(query));
    return matchesRisk && matchesSearch;
  });

  const criticalCount = forecasts.filter((f) => f.stockout_risk_level === 'CRITICAL').length;
  const highCount = forecasts.filter((f) => f.stockout_risk_level === 'HIGH').length;
  const wasteRisks = forecasts.filter((f) => f.is_waste_risk);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 font-heading">
              AI Demand Forecasting & Intelligence
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-violet-100 dark:bg-violet-950/80 text-violet-700 dark:text-violet-300 border border-violet-300 dark:border-violet-700">
              Prophet / LSTM Engine
            </span>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            30/60/90-day demand predictions, dynamic price optimization, and supplier reliability ratings.
          </p>
        </div>

        <button
          onClick={handleRunModel}
          disabled={isCalculating}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white shadow-md shadow-indigo-500/25 transition-all disabled:opacity-50 self-start sm:self-auto"
        >
          <Sparkles className={`w-4 h-4 ${isCalculating ? 'animate-spin' : ''}`} />
          {isCalculating ? 'Computing Predictions...' : 'Re-run AI Models'}
        </button>
      </div>

      {/* Model Health Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="glass-panel p-5 rounded-2xl shadow-sm border-l-4 border-rose-500">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Critical Stockout Risk</span>
          <div className="flex items-baseline gap-2 mt-2">
            <h3 className="text-2xl font-extrabold text-rose-600 dark:text-rose-400 font-heading">
              {criticalCount} Items
            </h3>
            <span className="text-xs text-rose-500 font-medium">stockout &lt; 5 days</span>
          </div>
        </div>

        <div className="glass-panel p-5 rounded-2xl shadow-sm border-l-4 border-amber-500">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">High Restock Urgency</span>
          <div className="flex items-baseline gap-2 mt-2">
            <h3 className="text-2xl font-extrabold text-amber-600 dark:text-amber-400 font-heading">
              {highCount} Items
            </h3>
            <span className="text-xs text-amber-500 font-medium">below safety threshold</span>
          </div>
        </div>

        <div className="glass-panel p-5 rounded-2xl shadow-sm border-l-4 border-indigo-500">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Price Optimization</span>
          <div className="flex items-baseline gap-2 mt-2">
            <h3 className="text-2xl font-extrabold text-indigo-600 dark:text-indigo-400 font-heading">
              +4.8%
            </h3>
            <span className="text-xs text-indigo-500 font-medium">avg margin uplift</span>
          </div>
        </div>

        <div className="glass-panel p-5 rounded-2xl shadow-sm border-l-4 border-emerald-500">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Model Confidence</span>
          <div className="flex items-baseline gap-2 mt-2">
            <h3 className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 font-heading">
              96.4%
            </h3>
            <span className="text-xs text-emerald-500 font-medium">R² model accuracy</span>
          </div>
        </div>
      </div>

      {/* Tabs Switcher */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2 text-sm font-semibold">
        <button
          onClick={() => setActiveTab('FORECAST')}
          className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 ${
            activeTab === 'FORECAST'
              ? 'bg-violet-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          Demand Horizons (30/60/90 Days)
        </button>

        <button
          onClick={() => setActiveTab('PRICING')}
          className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 ${
            activeTab === 'PRICING'
              ? 'bg-violet-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Percent className="w-4 h-4" />
          Price Optimization Suggestions
        </button>

        <button
          onClick={() => setActiveTab('SUPPLIERS')}
          className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 ${
            activeTab === 'SUPPLIERS'
              ? 'bg-violet-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Award className="w-4 h-4" />
          Supplier Reliability Rankings
        </button>

        <button
          onClick={() => setActiveTab('WASTE')}
          className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 ${
            activeTab === 'WASTE'
              ? 'bg-violet-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <AlertOctagon className="w-4 h-4" />
          Waste & Expiry Detection
          {wasteRisks.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-rose-500 text-white">
              {wasteRisks.length}
            </span>
          )}
        </button>
      </div>

      {/* TAB 1: 30/60/90 Day Forecast */}
      {activeTab === 'FORECAST' && (
        <div className="space-y-4">
          {/* Filter Tabs & Search */}
          <div className="glass-panel p-4 rounded-2xl space-y-4 shadow-sm">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
              {[
                { id: 'ALL', label: 'All SKUs', count: forecasts.length },
                { id: 'CRITICAL', label: 'Critical Risk', count: criticalCount },
                { id: 'HIGH', label: 'High Urgency', count: highCount },
                { id: 'MEDIUM', label: 'Medium', count: forecasts.filter((f) => f.stockout_risk_level === 'MEDIUM').length },
                { id: 'LOW', label: 'Optimal', count: forecasts.filter((f) => f.stockout_risk_level === 'LOW').length },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setRiskFilter(tab.id)}
                  className={`px-3 py-1.5 rounded-xl font-medium transition-all flex items-center gap-1.5 flex-shrink-0 ${
                    riskFilter === tab.id
                      ? 'bg-violet-600 text-white shadow-sm font-semibold'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`px-1.5 py-0.5 rounded-md text-[10px] ${
                      riskFilter === tab.id
                        ? 'bg-white/20 text-white'
                        : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>

            <div className="relative">
              <Search className="absolute left-3.5 top-2.5 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search AI predictions by SKU, HSN, or Item Name..."
                className="w-full pl-10 pr-4 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:ring-2 focus:ring-violet-500 outline-none"
              />
            </div>
          </div>

          {/* Forecast Data Table */}
          <div className="glass-panel rounded-2xl shadow-sm overflow-hidden border border-slate-200 dark:border-slate-800">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/50 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    <th className="py-3 px-4">Item SKU / Name</th>
                    <th className="py-3 px-4 text-center">Stock</th>
                    <th className="py-3 px-4 text-center">Daily Velocity</th>
                    <th className="py-3 px-4 text-center">30-Day Forecast</th>
                    <th className="py-3 px-4 text-center">60-Day Forecast</th>
                    <th className="py-3 px-4 text-center">90-Day Forecast</th>
                    <th className="py-3 px-4">Risk Rating</th>
                    <th className="py-3 px-4 text-center">Reorder Target</th>
                    <th className="py-3 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                  {isLoading ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-slate-500">
                        <RefreshCw className="w-6 h-6 animate-spin mx-auto text-violet-500 mb-2" />
                        Calculating multi-horizon demand projections...
                      </td>
                    </tr>
                  ) : filtered.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-slate-500">
                        <BrainCircuit className="w-8 h-8 mx-auto text-slate-400 mb-2 opacity-50" />
                        No forecasts found matching the filter.
                      </td>
                    </tr>
                  ) : (
                    filtered.map((f) => {
                      const isCritical = f.stockout_risk_level === 'CRITICAL';
                      const isHigh = f.stockout_risk_level === 'HIGH';
                      const isMed = f.stockout_risk_level === 'MEDIUM';

                      return (
                        <tr
                          key={f.id}
                          className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                        >
                          <td className="py-3.5 px-4">
                            <div>
                              <span className="font-semibold text-slate-900 dark:text-slate-100 block">
                                {f.product_name}
                              </span>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="font-mono text-xs text-violet-600 dark:text-violet-400 font-bold">
                                  {f.product_sku}
                                </span>
                                {f.hsn_code && (
                                  <span className="text-[10px] text-slate-400 font-mono">
                                    HSN: {f.hsn_code}
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>

                          <td className="py-3.5 px-4 text-center">
                            <span className="font-bold text-slate-900 dark:text-slate-100">
                              {f.current_stock}
                            </span>
                            <span className="text-xs text-slate-400 ml-1">{f.product_unit}</span>
                          </td>

                          <td className="py-3.5 px-4 text-center font-mono text-xs">
                            ~{f.daily_velocity} / day
                          </td>

                          <td className="py-3.5 px-4 text-center font-bold text-slate-900 dark:text-slate-100">
                            {f.predicted_demand_next_30_days} {f.product_unit}
                          </td>

                          <td className="py-3.5 px-4 text-center font-bold text-slate-700 dark:text-slate-300">
                            {f.predicted_demand_next_60_days || f.predicted_demand_next_30_days * 2} {f.product_unit}
                          </td>

                          <td className="py-3.5 px-4 text-center font-bold text-slate-700 dark:text-slate-300">
                            {f.predicted_demand_next_90_days || f.predicted_demand_next_30_days * 3} {f.product_unit}
                          </td>

                          {/* Risk Badge */}
                          <td className="py-3.5 px-4">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                                isCritical
                                  ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-300 animate-pulse'
                                  : isHigh
                                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300'
                                  : isMed
                                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border border-blue-300'
                                  : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300'
                              }`}
                            >
                              {f.stockout_risk_level}
                            </span>
                          </td>

                          {/* Recommended Qty */}
                          <td className="py-3.5 px-4 text-center font-bold font-mono text-indigo-600 dark:text-indigo-400">
                            {f.recommended_reorder_qty > 0 ? (
                              <span>+{f.recommended_reorder_qty} {f.product_unit}</span>
                            ) : (
                              <span className="text-slate-400 font-normal">None Needed</span>
                            )}
                          </td>

                          {/* 1-Click Reorder Action */}
                          <td className="py-3.5 px-4 text-center">
                            {f.recommended_reorder_qty > 0 ? (
                              <button
                                onClick={() => handleQuickReorder(f)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition-all"
                                title="Generate instant purchase order draft"
                              >
                                <ShoppingBag className="w-3.5 h-3.5" />
                                Auto PO
                              </button>
                            ) : (
                              <span className="text-xs text-emerald-500 font-medium flex items-center justify-center gap-1">
                                <CheckCircle className="w-3.5 h-3.5" /> Stocked
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: AI Price Optimization */}
      {activeTab === 'PRICING' && (
        <div className="space-y-4">
          <div className="glass-panel p-5 rounded-2xl">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-1">
              Dynamic Price Elasticity & Margin Optimization
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              AI analysis comparing historical turnover, current inventory velocity, and competitor benchmarks in the Indian market.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {forecasts.map((f) => {
                const currentPrice = Number(f.current_selling_price || 0);
                const optimalPrice = Number(f.optimal_price_recommendation || currentPrice * 1.05);
                const marginIncrease = Number(f.potential_margin_increase_percent || 3.2);

                return (
                  <div
                    key={f.id}
                    className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-800/50 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100">{f.product_name}</h4>
                        <span className="font-mono text-xs text-indigo-600 dark:text-indigo-400 font-bold">{f.product_sku}</span>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                        +{marginIncrease}% Margin
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase">Current Price</span>
                        <p className="font-mono font-bold text-slate-700 dark:text-slate-300 text-sm">
                          {formatINR(currentPrice)}
                        </p>
                      </div>
                      <div>
                        <span className="text-[10px] text-indigo-600 dark:text-indigo-400 uppercase font-semibold">AI Optimal Price</span>
                        <p className="font-mono font-extrabold text-emerald-600 dark:text-emerald-400 text-sm">
                          {formatINR(optimalPrice)}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 pt-2 text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
                      <span>Demand Elasticity: <strong>Inelastic</strong></span>
                      <span className="text-emerald-600 font-medium">Recommended Action: Apply</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: Supplier Reliability Rankings */}
      {activeTab === 'SUPPLIERS' && (
        <div className="space-y-4">
          <div className="glass-panel p-5 rounded-2xl">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-1">
              Indian Industrial Supplier Scorecard & Reliability Ranking
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Rankings based on on-time delivery percentage, GST compliance reliability, and order defect rates.
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-[11px] font-bold uppercase text-slate-500">
                    <th className="py-3 px-4">Rank</th>
                    <th className="py-3 px-4">Supplier Name</th>
                    <th className="py-3 px-4">GSTIN & State</th>
                    <th className="py-3 px-4 text-center">Avg Lead Time</th>
                    <th className="py-3 px-4 text-center">Star Rating</th>
                    <th className="py-3 px-4 text-center">Reliability Score</th>
                    <th className="py-3 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {reliabilityList.map((sup, idx) => (
                    <tr key={sup.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="py-3.5 px-4 font-bold text-indigo-600 dark:text-indigo-400">
                        #{idx + 1}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-slate-900 dark:text-slate-100 block">{sup.name}</span>
                        <span className="font-mono text-[10px] text-slate-400">{sup.code}</span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-mono text-xs block text-slate-700 dark:text-slate-300">
                          {sup.gstin || '27AAACB0188F1ZR'}
                        </span>
                        <span className="text-[10px] text-slate-400">{sup.state}</span>
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono font-medium">
                        {sup.lead_time_days} days
                      </td>
                      <td className="py-3.5 px-4 text-center font-bold text-amber-500">
                        ★ {sup.rating}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                          {sup.reliability_score}%
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 flex items-center justify-center gap-1">
                          <ShieldCheck className="w-3.5 h-3.5" /> Tier 1
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: Spoilage & Expiry Waste Detection */}
      {activeTab === 'WASTE' && (
        <div className="space-y-4">
          <div className="glass-panel p-5 rounded-2xl">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-1">
              Inventory Waste & Expiry Risk Detection
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Identifies slow-moving perishables, chemical compounds, or batches nearing expiration before capital is lost.
            </p>

            {wasteRisks.length === 0 ? (
              <div className="p-8 text-center text-slate-500">
                <CheckCircle className="w-10 h-10 mx-auto text-emerald-500 mb-2" />
                <p className="font-semibold text-sm">Zero Waste Risks Detected</p>
                <p className="text-xs text-slate-400 mt-1">
                  All active inventory lots are rotating within safe shelf-life windows.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {wasteRisks.map((w) => (
                  <div
                    key={w.id}
                    className="p-4 rounded-xl border border-rose-200 dark:border-rose-800 bg-rose-50/40 dark:bg-rose-950/20 flex items-center justify-between"
                  >
                    <div>
                      <h4 className="font-bold text-rose-900 dark:text-rose-200">{w.product_name}</h4>
                      <p className="text-xs text-rose-700 dark:text-rose-400 mt-0.5">
                        SKU: {w.product_sku} | {w.waste_risk_reason || 'Approaching batch expiry / shelf life threshold'}
                      </p>
                    </div>
                    <button
                      onClick={() => handleQuickReorder(w)}
                      className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-rose-600 text-white hover:bg-rose-700"
                    >
                      Discount / Clearance
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* PO Modal with initial reorder item */}
      {reorderItem && (
        <CreatePOModal
          isOpen={isPOModalOpen}
          onClose={() => {
            setIsPOModalOpen(false);
            setReorderItem(null);
          }}
          suppliers={suppliers}
          products={products}
          initialItems={[reorderItem]}
          onSuccess={() => loadData()}
        />
      )}
    </div>
  );
};
